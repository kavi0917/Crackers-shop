/* ============================================================
   VENDHAN CRACKERS — CUSTOMER INVOICE PDF (Phase 4) Focused Test
   Run: node test-invoice.js

   DB SAFETY:
     - Uses mongodb://localhost:27017/vendhan_crackers_invoice_test
       (disposable scratch database).
     - Drops the scratch database when finished.
     - The production DB (vendhan_crackers) is NEVER touched.
     - The app is started in-process on an ephemeral port — the
       already running dev server on :5000 is never used.

   Covers: auth (none/invalid/expired/admin), ownership isolation
   (customer B cannot invoice customer A), invoice PDF generation,
   Content-Type/Content-Disposition, non-empty PDF, stored-total
   match, PDF text inspection, invalid order IDs, and existing
   order APIs (list/detail/track) still working.
   ============================================================ */

const path = require('path');
const zlib = require('zlib');
const mongoose = require('./backend/node_modules/mongoose');
const jwt = require('./backend/node_modules/jsonwebtoken');
require('./backend/node_modules/dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const SCRATCH_MONGODB_URI = 'mongodb://localhost:27017/vendhan_crackers_invoice_test';

const { Setting, Order, Admin } = require('./backend/models');
const app = require('./backend/app');
const invoiceService = require('./backend/services/invoiceService');

let passed = 0;
let failed = 0;

function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log('  ✅ ' + name);
  } else {
    failed++;
    console.log('  ❌ ' + name + (extra !== undefined ? ' — ' + JSON.stringify(extra).slice(0, 400) : ''));
  }
}

let server = null;
let BASE = '';

async function api(method, p, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + p, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const contentType = res.headers.get('content-type') || '';
  let data = null;
  let buffer = null;
  if (contentType.includes('application/json')) {
    try { data = await res.json(); } catch (e) { /* empty */ }
  } else {
    buffer = Buffer.from(await res.arrayBuffer());
  }
  return { status: res.status, data, buffer, headers: res.headers };
}

function streamBody(objBody) {
  const s = String(objBody);
  const i = s.indexOf('stream');
  if (i === -1) return null;
  const bodyStart = s.indexOf('\n', i) + 1;
  const endIdx = s.indexOf('endstream', bodyStart);
  const raw = Buffer.from(s.slice(bodyStart, endIdx), 'binary');
  try { return zlib.inflateSync(raw).toString('latin1'); } catch (e) {
    try { return zlib.inflateRawSync(raw).toString('latin1'); } catch (e2) { return null; }
  }
}

function parseCMap(text, into) {
  let re = /beginbfrange\s*([\s\S]*?)endbfrange/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    m[1].split('\n').forEach((line) => {
      line = line.trim();
      const lm = line.match(/^<([0-9A-Fa-f]{4})>\s*<([0-9A-Fa-f]{4})>\s*\[([^\]]+)\]$/);
      if (!lm) return;
      const from = parseInt(lm[1], 16);
      const vals = lm[3].match(/<([0-9A-Fa-f]+)>/g) || [];
      vals.forEach((v, i) => { into[from + i] = parseInt(v.slice(1, -1), 16); });
    });
  }
  const re2 = /beginbfchar\s*([\s\S]*?)endbfchar/g;
  while ((m = re2.exec(text)) !== null) {
    m[1].split('\n').forEach((line) => {
      line = line.trim();
      const lm = line.match(/^<([0-9A-Fa-f]{4})>\s*<([0-9A-Fa-f]+)>$/);
      if (lm) into[parseInt(lm[1], 16)] = parseInt(lm[2], 16);
    });
  }
}

function decodeHexWithMap(hex, map) {
  let out = '';
  for (let i = 0; i + 4 <= hex.length; i += 4) {
    const cid = parseInt(hex.slice(i, i + 4), 16);
    const cp = map[cid];
    out += cp !== undefined ? String.fromCodePoint(cp) : '?';
  }
  return out;
}

/* Best-effort PDF text extraction.
   pdfmake/pdfkit emit subset Identity-H fonts, so every glyph is a hex CID
   string inside TJ/Tj operators and each subset font has its OWN CID->Unicode
   ToUnicode CMap. This parser:
     1) reads all indirect objects,
     2) resolves /F1../Fn aliases -> Font objects -> ToUnicode objects,
     3) scans page content streams, tracking the active font (Tf operator),
        and decodes hex CIDs through that font's own map. */
function extractPdfText(pdfBuffer) {
  const binary = pdfBuffer.toString('binary');

  // 1. All indirect objects
  const objects = {};
  const objRe = /(\d+)\s+\d+\s+obj\s*([\s\S]*?)endobj/g;
  let m;
  while ((m = objRe.exec(binary)) !== null) objects[Number(m[1])] = m[2];

  // 2. Font alias -> font object id (from page Resources)
  const aliasToObj = {};
  const fontDictRe = /\/Font\s*<<([\s\S]*?)>>/g;
  let fm;
  while ((fm = fontDictRe.exec(binary)) !== null) {
    const aliasRe = /\/(F\d+)\s+(\d+)\s+\d+\s+R/g;
    let am;
    while ((am = aliasRe.exec(fm[1])) !== null) aliasToObj[am[1]] = Number(am[2]);
  }

  // 3. Font object -> ToUnicode object
  const aliasToUnicode = {};
  for (const [alias, objId] of Object.entries(aliasToObj)) {
    const dict = objects[objId] || '';
    const tu = dict.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
    if (tu) aliasToUnicode[alias] = Number(tu[1]);
  }

  // 4. alias -> CID->Unicode map
  const aliasMaps = {};
  for (const [alias, tuObj] of Object.entries(aliasToUnicode)) {
    const cmap = streamBody(objects[tuObj]) || '';
    const map = {};
    parseCMap(cmap, map);
    aliasMaps[alias] = map;
  }

  // 5. Extract text from content streams with active-font tracking
  const fragments = [];
  for (const objBody of Object.values(objects)) {
    const content = streamBody(objBody);
    if (!content || !content.includes('BT')) continue;
    let currentFont = null;
    const opRe = /(\/[A-Za-z0-9]+\s+[\d.]+\s+Tf)|(\[((?:<[0-9A-Fa-f]+>|[0-9.+\-eE\s])*)\]\s*TJ)|(<([0-9A-Fa-f]+)>\s*Tj)/g;
    let mm;
    while ((mm = opRe.exec(content)) !== null) {
      if (mm[1]) {
        currentFont = mm[1].trim().split(/\s+/)[0].slice(1);
      } else if (mm[2]) {
        const hexes = mm[3].match(/<([0-9A-Fa-f]+)>/g) || [];
        const map = aliasMaps[currentFont] || {};
        hexes.forEach((h) => fragments.push(decodeHexWithMap(h.slice(1, -1), map)));
      } else if (mm[4]) {
        fragments.push(decodeHexWithMap(mm[5], aliasMaps[currentFont] || {}));
      }
    }
  }
  return fragments.join(' ');
}

let orderSeq = 0;

/* Create an order document directly (the same shape checkoutService.createOrder
   persists) so the invoice endpoint can be exercised with realistic snapshots. */
async function createOrderFor(userId, { productName, price, qty, pricing, status = 'pending' }) {
  orderSeq++;
  return Order.create({
    orderId: 'INV-' + Date.now() + '-' + orderSeq,
    user: userId,
    customer: { name: 'Invoice Tester', phone: '9840011223', email: 'invoice-tester@example.com' },
    deliveryAddress: { address: '1 Test Street', city: 'Chennai', state: 'Tamil Nadu', pincode: '600017' },
    items: [{
      product: new mongoose.Types.ObjectId(),
      productName,
      price,
      originalPrice: Math.round(price * 1.1 * 100) / 100,
      discountAmount: 0,
      quantity: qty,
      subtotal: Math.round(price * qty * 100) / 100
    }],
    pricing: {
      comboDiscount: 0,
      couponDiscount: 0,
      secondOrderDiscountPercent: 0,
      secondOrderDiscountAmount: 0,
      membershipTier: 'none',
      membershipDiscountPercent: 0,
      membershipDiscountAmount: 0,
      customerType: 'retail',
      wholesaleTier: null,
      wholesaleDiscountPercent: 0,
      wholesaleDiscountAmount: 0,
      referralDiscountPercent: 0,
      referralDiscountAmount: 0,
      referralCode: null,
      referredByReseller: null,
      ...pricing
    },
    payment: { method: 'cod', status: 'pending' },
    status,
    statusHistory: [{ status, changedAt: new Date() }]
  });
}
async function main() {
  console.log('========== CUSTOMER INVOICE PDF (Phase 4) ==========\n');

  await mongoose.connect(SCRATCH_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase(); // start clean

  server = app.listen(0);
  const port = server.address().port;
  BASE = 'http://127.0.0.1:' + port + '/api';
  console.log(`In-process server on :${port} against scratch DB '${mongoose.connection.name}'\n`);

  // Seed the SINGLE settings doc the shop services expect (same pattern as
  // the existing focused tests). Company details come from here.
  await Setting.create({
    shopName: 'Vendhan Crackers',
    companyName: 'Vendhan Enterprises',
    phone: '9876500111',
    phone2: '+91 44 2653 7890',
    email: 'invoice-shop@example.com',
    email2: 'support@vendhancrackers.in',
    address: '42, Festival Street, Chennai — 600001',
    deliveryCharge: 49,
    freeDeliveryThreshold: 1000,
    minimumOrderAmount: 2000
  });

  /* ---- Register two customers (real JWT flow) ---- */
  const regA = await api('POST', '/auth/register', { body: { name: 'Invoice A', email: 'invoiceA@example.com', phone: '9400000001', password: 'strongpass123' } });
  const regB = await api('POST', '/auth/register', { body: { name: 'Invoice B', email: 'invoiceB@example.com', phone: '9400000002', password: 'strongpass123' } });
  check('Customer A registration succeeds (201)', regA.status === 201, regA.data);
  check('Customer B registration succeeds (201)', regB.status === 201, regB.data);
  const tokenA = regA.data && regA.data.data && regA.data.data.token;
  const tokenB = regB.data && regB.data.data && regB.data.data.token;
  const userAId = regA.data && regA.data.data && regA.data.data.user && regA.data.data.user._id;
  check('Registration returns customer tokens', typeof tokenA === 'string' && typeof tokenB === 'string');

  /* ---- Admin account for the 403 test ---- */
  await Admin.create({ name: 'Invoice Admin', email: 'invoiceadmin@example.com', password: 'adminpass123', role: 'super_admin' });
  const adminLogin = await api('POST', '/admin/auth/login', { body: { email: 'invoiceadmin@example.com', password: 'adminpass123' } });
  const adminToken = adminLogin.data && adminLogin.data.data && adminLogin.data.data.token;
  check('Admin login returns a token', typeof adminToken === 'string' && adminToken.length > 20);

  /* ---- Create orders with realistic STORED pricing snapshots ---- */
  // Order A (retail with order-level discount + delivery charge):
  //   subtotal 2500, discount 75, delivery 49, gst 0 -> total 2474
  const orderA = await createOrderFor(userAId, {
    productName: 'Deluxe Sparkler Box',
    price: 500,
    qty: 5,
    pricing: {
      subtotal: 2500,
      discount: 75,
      secondOrderDiscountPercent: 3,
      secondOrderDiscountAmount: 75,
      deliveryCharge: 49,
      gst: 0,
      total: 2474
    }
  });

  // Order B (wholesale-style, free delivery):
  //   subtotal 6000, discount 300, delivery 0 -> total 5700
  const orderB = await createOrderFor(userAId, {
    productName: 'Festival Combo Pack',
    price: 200,
    qty: 30,
    pricing: {
      subtotal: 6000,
      discount: 300,
      wholesaleDiscountPercent: 5,
      wholesaleDiscountAmount: 300,
      customerType: 'wholesale',
      deliveryCharge: 0,
      gst: 0,
      total: 5700
    }
  });

  // Order C (edge case: a stored POSITIVE GST snapshot is printed, never computed)
  const orderC = await createOrderFor(userAId, {
    productName: 'Golden Rocket Special',
    price: 100,
    qty: 10,
    status: 'delivered',
    pricing: {
      subtotal: 1000,
      discount: 0,
      deliveryCharge: 49,
      gst: 18,
      total: 1067
    }
  });

  const oid = (o) => String(o._id);
  console.log('\n--- 1. AUTHENTICATION GATES ---');
  check('No token on invoice → 401', (await api('GET', `/orders/${oid(orderA)}/invoice`)).status === 401);
  check('Invalid (garbage) token on invoice → 401', (await api('GET', `/orders/${oid(orderA)}/invoice`, { token: 'not.a.jwt' })).status === 401);

  const badSecretToken = jwt.sign({ id: userAId, role: 'customer' }, 'wrong_secret_key_value_that_is_long', { expiresIn: '5m' });
  check('Token signed with wrong secret on invoice → 401', (await api('GET', `/orders/${oid(orderA)}/invoice`, { token: badSecretToken })).status === 401);

  const expiredToken = jwt.sign({ id: userAId, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
  check('Expired customer token on invoice → 401', (await api('GET', `/orders/${oid(orderA)}/invoice`, { token: expiredToken })).status === 401);

  const adminTokenOnCustomer = jwt.sign({ id: new mongoose.Types.ObjectId(), role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  check('Admin role token on customer invoice → 403', (await api('GET', `/orders/${oid(orderA)}/invoice`, { token: adminTokenOnCustomer })).status === 403);
  check('Real admin token on customer invoice → 403', (await api('GET', `/orders/${oid(orderA)}/invoice`, { token: adminToken })).status === 403);
console.log('\n--- 2. OWNERSHIP ISOLATION ---');
  const crossRes = await api('GET', `/orders/${oid(orderA)}/invoice`, { token: tokenB });
  check('Customer B requesting Customer A invoice → 404', crossRes.status === 404, crossRes.data);

  const bogusId = new mongoose.Types.ObjectId().toString();
  const bogusRes = await api('GET', `/orders/${bogusId}/invoice`, { token: tokenA });
  check('Valid-format but non-existent order → 404', bogusRes.status === 404, bogusRes.data);

  const malformedRes = await api('GET', '/orders/not-a-valid-id/invoice', { token: tokenA });
  check('Malformed order id → 422 (project validation convention)', malformedRes.status === 422, malformedRes.data);

  console.log('\n--- 3. OWN ORDER INVOICE (success path) ---');
  const resA = await api('GET', `/orders/${oid(orderA)}/invoice`, { token: tokenA });
  check('Customer A can download own invoice → 200', resA.status === 200);
  check('Content-Type is application/pdf', (resA.headers.get('content-type') || '').includes('application/pdf'));
  const disposition = resA.headers.get('content-disposition') || '';
  check('Content-Disposition is attachment with vendhan filename', /attachment;\s*filename="vendhan-crackers-invoice-.+\.pdf"/.test(disposition), disposition);
  check('Content-Length header present', resA.headers.get('content-length') !== null);
  check('PDF is non-empty', resA.buffer && resA.buffer.length > 1000, resA.buffer && resA.buffer.length);
  const header = resA.buffer ? resA.buffer.toString('latin1', 0, 20) : '';
  check('PDF starts with %PDF magic', header.includes('%PDF-'));

  // DocDefinition-level assertion: rendered summary MUST equal stored totals.
  const settingsService = require('./backend/services/settingsService');
  const orderADoc = await Order.findById(orderA._id);
  const defA = invoiceService.buildInvoiceDocDefinition(orderADoc, await settingsService.getSettings());
  const summaryTable = defA.content.find((c) => c && c.table && c.table.body && c.table.body.some((r) => String(r[0].text || r[0]) === 'Subtotal'));
  const summaryMap = {};
  summaryTable.table.body.forEach((r) => { summaryMap[String(r[0].text || r[0])] = r[1].text || r[1]; });
  check('Subtotal matches stored pricing.subtotal', summaryMap.Subtotal === invoiceService.formatINR(2500));
  check('Discount row matches stored pricing.discount (shown as −)', summaryMap.Discount === '− ' + invoiceService.formatINR(75));
  check('Delivery row matches stored pricing.deliveryCharge', summaryMap['Delivery Charge'] === invoiceService.formatINR(49));
  check('Grand Total matches stored order total (₹2,474.00)', summaryMap['Grand Total'] === invoiceService.formatINR(orderADoc.pricing.total), { stored: invoiceService.formatINR(orderADoc.pricing.total), rendered: summaryMap['Grand Total'] });
// PDF text inspection (best-effort per-font CID decode + whitespace normalization).
  const pdfText = extractPdfText(resA.buffer);
  // pdfmake emits kerning sub-runs, so glyphs can be split by spaces in the raw
  // operator stream ("INV OICE", "2,474.00" stays intact). Strip all
  // whitespace for substring verification.
  const pdfNorm = pdfText.replace(/\s+/g, '');
  console.log('   [PDF extracted text] ' + JSON.stringify(pdfText.slice(0, 220)) + '…');
  check('PDF text contains order number', orderA.orderId && pdfNorm.includes(orderA.orderId.replace(/\s+/g, '')), { orderId: orderA.orderId });
  check('PDF text contains product name', pdfNorm.includes('DeluxeSparklerBox'));
  check('PDF text contains stored subtotal digits (2,500.00)', pdfNorm.includes('2,500.00'));
  check('PDF text contains stored grand total digits (2,474.00)', pdfNorm.includes('2,474.00'));
  check('PDF text contains "Inclusive of all taxes"', pdfNorm.includes('Inclusiveofalltaxes'));
  check('PDF text contains INVOICE header', pdfNorm.includes('INVOICE'));
  check('PDF text contains stored order status', pdfNorm.includes('PENDING'));

  // Wholesale (free delivery) order invoice.
  const resB = await api('GET', `/orders/${oid(orderB)}/invoice`, { token: tokenA });
  check('Wholesale-style order invoice → 200', resB.status === 200);
  const pdfNormB = extractPdfText(resB.buffer).replace(/\s+/g, '');
  check('Wholesale invoice shows free delivery (₹0.00) and total 5,700.00', pdfNormB.includes('5,700.00') && pdfNormB.includes('0.00'));

  // GST-positive stored snapshot: the STORED gst value is printed, never computed.
  const resC = await api('GET', `/orders/${oid(orderC)}/invoice`, { token: tokenA });
  check('Delivered order invoice → 200 (uses stored status)', resC.status === 200);
  const defC = invoiceService.buildInvoiceDocDefinition(await Order.findById(orderC._id), await settingsService.getSettings());
  const summaryTableC = defC.content.find((c) => c && c.table && c.table.body && c.table.body.some((r) => String(r[0].text || r[0]) === 'Subtotal'));
  const summaryMapC = {};
  summaryTableC.table.body.forEach((r) => { summaryMapC[String(r[0].text || r[0])] = r[1].text || r[1]; });
  check('Stored GST snapshot is printed as-is (₹18.00)', summaryMapC.GST === invoiceService.formatINR(18));
  check('GST-positive order total still matches stored total (₹1,067.00)', summaryMapC['Grand Total'] === invoiceService.formatINR(1067));
  const pdfTextC = extractPdfText(resC.buffer).replace(/\s+/g, '');
  check('Stored status DELIVERED appears on invoice', pdfTextC.includes('DELIVERED'));

  console.log('\n--- 4. EXISTING ORDER APIS (regression) ---');
  const listRes = await api('GET', '/orders', { token: tokenA });
  check('GET /orders (list) still works → 200', listRes.status === 200 && Array.isArray(listRes.data.data && listRes.data.data.orders));
  const detailRes = await api('GET', `/orders/${oid(orderA)}`, { token: tokenA });
  check('GET /orders/:id still works → 200', detailRes.status === 200 && detailRes.data.data.order.orderId === orderA.orderId);
  const trackRes = await api('GET', `/orders/${oid(orderA)}/track`, { token: tokenA });
  check('GET /orders/:id/track still works → 200', trackRes.status === 200 && trackRes.data.data.status === 'pending');
  const trackCross = await api('GET', `/orders/${oid(orderA)}/track`, { token: tokenB });
  check('Track cross-customer still → 404', trackCross.status === 404);

  console.log('\n========================================\n');
  console.log(`RESULT: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;

  await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exitCode = 1;
});