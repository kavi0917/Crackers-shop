/* ============================================================
   VENDHAN CRACKERS — PHASE 8: ADMIN AUDIT LOG Focused Test
   Run: node test-phase8-audit-log.js

   DB SAFETY:
     - Uses mongodb://localhost:27017/vendhan_crackers_audit_log_test
       (disposable scratch database).
     - Drops the scratch database when finished.
     - The production DB (vendhan_crackers) is NEVER touched.
     - The app runs in-process on an ephemeral port (the dev server
       on :5000 is never used or disturbed).

   Covers:
     AUTHORIZATION   no/invalid/expired token -> 401, customer -> 403,
                     admin -> allowed.
     AUDIT CREATION  product/category/coupon CRUD, order status change,
                     inventory adjustment, settings update, reseller
                     activate/deactivate, admin login, customer admin
                     status/type change, admin-user create.
     AUDIT CONTENT   actor/action/module/target/description/timestamp,
                     oldValues/newValues for updates.
     SECURITY        no actor spoofing, no password/hash/token storage,
                     no update/delete of audit records.
     QUERY API       pagination, search, module/action/date filters,
                     newest-first sort, limit enforcement.
     CONSISTENCY     success -> audit record; failed op -> no misleading
                     audit record; existing transaction behavior intact.
   ============================================================ */

const path = require('path');
const mongoose = require('./backend/node_modules/mongoose');
const jwt = require('./backend/node_modules/jsonwebtoken');
require('./backend/node_modules/dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const SCRATCH_MONGODB_URI = 'mongodb://localhost:27017/vendhan_crackers_audit_log_test';

const {
  AuditLog, Admin, User, Category, Product, Coupon, Order, Setting
} = require('./backend/models');
const app = require('./backend/app');

let passed = 0;
let failed = 0;

function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log('  [PASS] ' + name);
  } else {
    failed++;
    console.log('  [FAIL] ' + name + (extra !== undefined ? ' -- ' + safeSerialize(extra) : ''));
  }
}

function safeSerialize(v) {
  try { return JSON.stringify(v).slice(0, 500); } catch (e) { return String(v).slice(0, 500); }
}

let server = null;
let BASE = '';

async function api(method, p, opts) {
  const headers = { 'Content-Type': 'application/json' };
  if (opts && opts.token) headers.Authorization = 'Bearer ' + opts.token;
  const res = await fetch(BASE + p, {
    method,
    headers,
    body: (opts && opts.body) ? JSON.stringify(opts.body) : undefined
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty */ }
  return { status: res.status, data };
}

let seq = 0;

async function seedAdmin(role) {
  seq++;
  return Admin.create({
    name: 'Audit Admin ' + seq,
    email: 'auditadmin' + seq + '@example.com',
    password: 'adminpass123',
    role: role || 'super_admin',
    status: 'active'
  });
}

async function seedUser(overrides) {
  seq++;
  return User.create(Object.assign({
    name: 'Audit User ' + seq,
    email: 'audituser' + seq + '@example.com',
    phone: '92000000' + String(seq).padStart(2, '0'),
    password: 'customer123',
    customerType: 'retail',
    status: 'active'
  }, overrides || {}));
}

function custToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: 'customer' },
    process.env.JWT_SECRET
  );
}

async function seedProduct(price, category, name) {
  seq++;
  const cat = category || await Category.create({ name: 'Seed Cat ' + seq, status: 'active', discount: 0 });
  return Product.create({
    name: name || ('Audit Product ' + seq),
    description: 'Phase 8 audit test product',
    category: cat._id,
    originalPrice: price,
    price: price,
    discount: 0,
    stock: 100,
    status: 'active'
  });
}
async function seedOrder(user) {
  seq++;
  const cat = await Category.create({ name: 'Audit Order Cat ' + seq, status: 'active', discount: 0 });
  const product = await seedProduct(200, cat);
  const order = await Order.create({
    orderId: 'AUD-ORDER-' + seq,
    user: user._id,
    customer: { name: user.name, phone: user.phone, email: user.email },
    deliveryAddress: { address: '1 Audit St', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
    items: [{ product: product._id, productName: product.name, price: 200, quantity: 1, subtotal: 200 }],
    pricing: { subtotal: 200, discount: 0, deliveryCharge: 0, gst: 0, total: 200 },
    payment: { method: 'cod', status: 'pending' },
    status: 'pending',
    statusHistory: [{ status: 'pending', changedAt: new Date() }]
  });
  return { order, product };
}

async function main() {
  console.log('========== PHASE 8 - ADMIN AUDIT LOG ==========\n');

  await mongoose.connect(SCRATCH_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase(); // start clean

  server = app.listen(0);
  const port = server.address().port;
  BASE = 'http://127.0.0.1:' + port + '/api';
  console.log('In-process server on :' + port + " against scratch DB '" + mongoose.connection.name + "'\n");

  await Setting.create({
    shopName: 'Audit Test Crackers',
    phone: '9876543210',
    email: 'audit-shop@example.com',
    address: '1 Audit Street, Chennai',
    minimumOrderAmount: 2000,
    lowStockThreshold: 20,
    gst: 0,
    deliveryCharge: 49,
    freeDeliveryThreshold: 1000
  });

  const admin = await seedAdmin('super_admin');
  const adminLogin = await api('POST', '/admin/auth/login', { body: { email: admin.email, password: 'adminpass123' } });
  check('Admin login succeeds (200)', adminLogin.status === 200, adminLogin.data);
  const adminToken = adminLogin.data && adminLogin.data.data && adminLogin.data.data.token;
  check('Admin login returns a token', typeof adminToken === 'string' && adminToken.length > 20);

  const loginLog = await AuditLog.findOne({ module: 'AUTH', action: 'LOGIN' });
  check('Admin LOGIN audit record exists', !!loginLog);

  const customer = await seedUser();
  const customerToken = custToken(customer);
  const category0 = await Category.create({ name: 'Audit Cat 0', status: 'active', discount: 0 });

  /* ============ A. AUTHORIZATION ============ */
  console.log('\n=== A. AUTHORIZATION ===');

  const noToken = await api('GET', '/admin/audit-logs');
  check('A1 No token -> 401', noToken.status === 401, noToken.data);

  const invalidToken = await api('GET', '/admin/audit-logs', { token: 'not-a-valid-jwt-token' });
  check('A2 Invalid token -> 401', invalidToken.status === 401, invalidToken.data);

  const expiredToken = jwt.sign(
    { id: admin._id.toString(), email: admin.email, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '-10s' }
  );
  const expiredRes = await api('GET', '/admin/audit-logs', { token: expiredToken });
  check('A3 Expired token -> 401', expiredRes.status === 401, expiredRes.data);

  const customerRes = await api('GET', '/admin/audit-logs', { token: customerToken });
  check('A4 Customer token -> 403', customerRes.status === 403, customerRes.data);

  const adminRes = await api('GET', '/admin/audit-logs', { token: adminToken });
  check('A5 Authenticated admin -> 200', adminRes.status === 200, adminRes.data);

  const detailNoToken = await api('GET', '/admin/audit-logs/' + String(loginLog._id));
  check('A6 Audit detail without token -> 401', detailNoToken.status === 401, detailNoToken.data);

  /* ============ B. AUDIT CREATION: PRODUCT ============ */
  console.log('\n=== B. PRODUCT AUDIT ===');

  const createProductRes = await api('POST', '/admin/products', {
    token: adminToken,
    body: { name: 'Audit Sparkler', originalPrice: 100, category: category0._id.toString(), stock: 50, status: 'active' }
  });
  check('B1 Create product -> 201', createProductRes.status === 201, createProductRes.data);
  const productId = createProductRes.data && createProductRes.data.data && createProductRes.data.data.product && createProductRes.data.data.product._id;
  check('B2 Product id returned', !!productId);
  const createProdLog = await AuditLog.findOne({ module: 'PRODUCT', action: 'CREATE', targetId: productId });
  check('B3 Product CREATE audit record exists', !!createProdLog);
  check('B4 Create audit actor is admin', createProdLog && String(createProdLog.actor) === String(admin._id));
  check('B5 Create audit module is PRODUCT', createProdLog && createProdLog.module === 'PRODUCT');
  check('B6 Create audit action is CREATE', createProdLog && createProdLog.action === 'CREATE');
  check('B7 Create audit timestamp exists', createProdLog && !!createProdLog.createdAt);
  check('B8 Create audit has a description', createProdLog && typeof createProdLog.description === 'string' && createProdLog.description.length > 0);
  check('B9 Create audit newValues.name matches', createProdLog && createProdLog.newValues && createProdLog.newValues.name === 'Audit Sparkler');
const updateProductRes = await api('PUT', '/admin/products/' + productId, {
    token: adminToken,
    body: { name: 'Audit Sparkler V2', originalPrice: 150, category: category0._id.toString(), stock: 40 }
  });
  check('B10 Update product -> 200', updateProductRes.status === 200, updateProductRes.data);
  const updateProdLog = await AuditLog.findOne({ module: 'PRODUCT', action: 'UPDATE', targetId: productId });
  check('B11 Product UPDATE audit record exists', !!updateProdLog);
  check('B12 Update oldValues.name recorded', updateProdLog && updateProdLog.oldValues && updateProdLog.oldValues.name === 'Audit Sparkler');
  check('B13 Update newValues.name recorded', updateProdLog && updateProdLog.newValues && updateProdLog.newValues.name === 'Audit Sparkler V2');

  const deleteProductRes = await api('DELETE', '/admin/products/' + productId, { token: adminToken });
  check('B14 Delete product -> 200', deleteProductRes.status === 200, deleteProductRes.data);
  const deleteProdLog = await AuditLog.findOne({ module: 'PRODUCT', action: 'DELETE', targetId: productId });
  check('B15 Product DELETE audit record exists', !!deleteProdLog);

  /* ============ C. AUDIT CREATION: CATEGORY ============ */
  console.log('\n=== C. CATEGORY AUDIT ===');

  const createCatRes = await api('POST', '/admin/categories', {
    token: adminToken,
    body: { name: 'Audit Flowers', status: 'active', discount: 5 }
  });
  check('C1 Create category -> 201', createCatRes.status === 201, createCatRes.data);
  const catId = createCatRes.data && createCatRes.data.data && createCatRes.data.data.category && createCatRes.data.data.category._id;
  const catCreateLog = await AuditLog.findOne({ module: 'CATEGORY', action: 'CREATE', targetId: catId });
  check('C2 Category CREATE audit record exists', !!catCreateLog);

  const updateCatRes = await api('PUT', '/admin/categories/' + catId, {
    token: adminToken,
    body: { name: 'Audit Flowers V2', discount: 8 }
  });
  check('C3 Update category -> 200', updateCatRes.status === 200, updateCatRes.data);
  const catUpdateLog = await AuditLog.findOne({ module: 'CATEGORY', action: 'UPDATE', targetId: catId });
  check('C4 Category UPDATE audit record exists', !!catUpdateLog);
  check('C5 Category update old/new discount recorded', catUpdateLog && catUpdateLog.oldValues && catUpdateLog.oldValues.discount === 5 && catUpdateLog.newValues && catUpdateLog.newValues.discount === 8);

  const emptyCat = await Category.create({ name: 'Audit Empty Cat', status: 'active', discount: 0 });
  const deleteCatRes = await api('DELETE', '/admin/categories/' + emptyCat._id.toString(), { token: adminToken });
  check('C6 Delete category -> 200', deleteCatRes.status === 200, deleteCatRes.data);
  const catDeleteLog = await AuditLog.findOne({ module: 'CATEGORY', action: 'DELETE', targetId: emptyCat._id });
  check('C7 Category DELETE audit record exists', !!catDeleteLog);

  const catWithProducts = await Category.create({ name: 'Audit Busy Cat', status: 'active', discount: 5 });
  await Product.create({ name: 'Busy Product', description: 'x', category: catWithProducts._id, originalPrice: 100, price: 95, discount: 5, stock: 5, status: 'active' });
  const deactCatRes = await api('DELETE', '/admin/categories/' + catWithProducts._id.toString(), { token: adminToken });
  check('C8 Delete busy category -> deactivated (200)', deactCatRes.status === 200, deactCatRes.data);
  const catDeactLog = await AuditLog.findOne({ module: 'CATEGORY', action: 'STATUS_CHANGE', targetId: catWithProducts._id });
  check('C9 Category deactivation STATUS_CHANGE audit exists', !!catDeactLog);
/* ============ D. AUDIT CREATION: COUPON ============ */
  console.log('\n=== D. COUPON AUDIT ===');

  const couponCreateRes = await api('POST', '/admin/coupons', {
    token: adminToken,
    body: { code: 'AUDIT10', discountType: 'percentage', discountValue: 10, minimumOrderAmount: 0, status: 'active' }
  });
  check('D1 Create coupon -> 201', couponCreateRes.status === 201, couponCreateRes.data);
  const couponId = couponCreateRes.data && couponCreateRes.data.data && couponCreateRes.data.data.coupon && couponCreateRes.data.data.coupon._id;
  const couponCreateLog = await AuditLog.findOne({ module: 'COUPON', action: 'CREATE', targetId: couponId });
  check('D2 Coupon CREATE audit record exists', !!couponCreateLog);

  const couponUpdateRes = await api('PUT', '/admin/coupons/' + couponId, {
    token: adminToken,
    body: { discountValue: 15 }
  });
  check('D3 Update coupon -> 200', couponUpdateRes.status === 200, couponUpdateRes.data);
  const couponUpdateLog = await AuditLog.findOne({ module: 'COUPON', action: 'UPDATE', targetId: couponId });
  check('D4 Coupon UPDATE audit record exists', !!couponUpdateLog);
  check('D5 Coupon update old/new discountValue recorded', couponUpdateLog && couponUpdateLog.oldValues && couponUpdateLog.oldValues.discountValue === 10 && couponUpdateLog.newValues && couponUpdateLog.newValues.discountValue === 15);

  const couponDeactRes = await api('PUT', '/admin/coupons/' + couponId, {
    token: adminToken,
    body: { status: 'inactive' }
  });
  check('D6 Deactivate coupon -> 200', couponDeactRes.status === 200, couponDeactRes.data);
  const couponDeactLog = await AuditLog.findOne({ module: 'COUPON', action: 'STATUS_CHANGE', targetId: couponId });
  check('D7 Coupon deactivation STATUS_CHANGE audit exists', !!couponDeactLog);

  const couponDeleteRes = await api('DELETE', '/admin/coupons/' + couponId, { token: adminToken });
  check('D8 Delete coupon -> 200', couponDeleteRes.status === 200, couponDeleteRes.data);
  const couponDeleteLog = await AuditLog.findOne({ module: 'COUPON', action: 'DELETE', targetId: couponId });
  check('D9 Coupon DELETE audit record exists', !!couponDeleteLog);

  /* ============ E. AUDIT CREATION: ORDER STATUS ============ */
  console.log('\n=== E. ORDER STATUS CHANGE AUDIT ===');

  const { order } = await seedOrder(customer);
  const orderStatusRes = await api('PUT', '/admin/orders/' + order._id.toString() + '/status', {
    token: adminToken,
    body: { status: 'confirmed' }
  });
  check('E1 Order status change -> 200', orderStatusRes.status === 200, orderStatusRes.data);
  const orderStatusLog = await AuditLog.findOne({ module: 'ORDER', action: 'STATUS_CHANGE', targetId: order._id });
  check('E2 Order STATUS_CHANGE audit record exists', !!orderStatusLog);
  check('E3 Order old/new status recorded', orderStatusLog && orderStatusLog.oldValues && orderStatusLog.oldValues.status === 'pending' && orderStatusLog.newValues && orderStatusLog.newValues.status === 'confirmed');

  const orderBadRes = await api('PUT', '/admin/orders/' + order._id.toString() + '/status', {
    token: adminToken,
    body: { status: 'delivered' }
  });
  check('E4 Invalid order transition -> 400', orderBadRes.status === 400, orderBadRes.data);
  const badOrderLogCount = await AuditLog.countDocuments({ module: 'ORDER', targetId: order._id });
  check('E5 Failed transition leaves no extra audit record', badOrderLogCount === 1, badOrderLogCount);
/* ============ F. AUDIT CREATION: INVENTORY ============ */
  console.log('\n=== F. INVENTORY AUDIT ===');

  const invProduct = await seedProduct(999, category0);
  const invRes = await api('PUT', '/admin/inventory/' + invProduct._id.toString(), {
    token: adminToken,
    body: { stock: 5, reorderLevel: 15 }
  });
  check('F1 Inventory adjustment -> 200', invRes.status === 200, invRes.data);
  const invLog = await AuditLog.findOne({ module: 'INVENTORY', action: 'UPDATE', targetId: invProduct._id });
  check('F2 Inventory adjustment audit record exists', !!invLog);
  check('F3 Inventory old/new stock recorded', invLog && invLog.oldValues && invLog.oldValues.stock === 100 && invLog.newValues && invLog.newValues.stock === 105);

  /* ============ G. AUDIT CREATION: SETTINGS ============ */
  console.log('\n=== G. SETTINGS AUDIT ===');

  const settingsRes = await api('PUT', '/admin/settings', {
    token: adminToken,
    body: { minimumOrderAmount: 2500, lowStockThreshold: 15, shopName: 'Audit Test Crackers V2' }
  });
  check('G1 Settings update -> 200', settingsRes.status === 200, settingsRes.data);
  const settingsLog = await AuditLog.findOne({ module: 'SETTINGS', action: 'UPDATE' });
  check('G2 Settings update audit record exists', !!settingsLog);
  check('G3 Settings changed keys recorded in old/new values', settingsLog && settingsLog.oldValues && settingsLog.newValues && settingsLog.oldValues.minimumOrderAmount === 2000 && settingsLog.newValues.minimumOrderAmount === 2500);

  /* ============ H. AUDIT CREATION: CUSTOMER (admin change) ============ */
  console.log('\n=== H. CUSTOMER AUDIT ===');

  const custStatusRes = await api('PUT', '/admin/customers/' + customer._id.toString() + '/status', {
    token: adminToken,
    body: { status: 'inactive' }
  });
  check('H1 Customer status change -> 200', custStatusRes.status === 200, custStatusRes.data);
  const custStatusLog = await AuditLog.findOne({ module: 'CUSTOMER', action: 'STATUS_CHANGE', targetId: customer._id });
  check('H2 Customer STATUS_CHANGE audit record exists', !!custStatusLog);

  await api('PUT', '/admin/customers/' + customer._id.toString() + '/status', { token: adminToken, body: { status: 'active' } });

  const custTypeRes = await api('PUT', '/admin/customers/' + customer._id.toString() + '/type', {
    token: adminToken,
    body: { customerType: 'wholesale' }
  });
  check('H3 Customer type change -> 200', custTypeRes.status === 200, custTypeRes.data);
  const custTypeLog = await AuditLog.findOne({ module: 'CUSTOMER', action: 'UPDATE', targetId: customer._id });
  check('H4 Customer type change audit record exists', !!custTypeLog);

  /* ============ I. AUDIT CREATION: RESELLER ============ */
  console.log('\n=== I. RESELLER AUDIT ===');

  const activateResRes = await api('PUT', '/admin/resellers/' + customer._id.toString() + '/activate', { token: adminToken });
  check('I1 Reseller activate -> 200', activateResRes.status === 200, activateResRes.data);
  const resActivateLog = await AuditLog.findOne({ module: 'RESELLER', action: 'ACTIVATE', targetId: customer._id });
  check('I2 Reseller ACTIVATE audit record exists', !!resActivateLog);

  const deactivateResRes = await api('PUT', '/admin/resellers/' + customer._id.toString() + '/deactivate', { token: adminToken });
  check('I3 Reseller deactivate -> 200', deactivateResRes.status === 200, deactivateResRes.data);
  const resDeactivateLog = await AuditLog.findOne({ module: 'RESELLER', action: 'DEACTIVATE', targetId: customer._id });
  check('I4 Reseller DEACTIVATE audit record exists', !!resDeactivateLog);
/* ============ J. AUDIT CREATION: ADMIN USER ============ */
  console.log('\n=== J. ADMIN USER AUDIT ===');

  const adminUserRes = await api('POST', '/admin/users', {
    token: adminToken,
    body: { name: 'Manager Tester', email: 'manager.tester@example.com', password: 'manager123', role: 'manager', status: 'active' }
  });
  check('J1 Create admin user (super_admin) -> 201', adminUserRes.status === 201, adminUserRes.data);
  const adminUserLog = await AuditLog.findOne({ module: 'ADMIN_USER', action: 'CREATE' });
  check('J2 Admin user CREATE audit record exists', !!adminUserLog);
  check('J3 Admin user audit does NOT contain the password', adminUserLog && !JSON.stringify(adminUserLog.toObject()).includes('manager123'));

  /* ============ K. SECURITY ============ */
  console.log('\n=== K. SECURITY ===');

  const spawnProduct = await seedProduct(400, category0);
  const spoofRes = await api('PUT', '/admin/inventory/' + spawnProduct._id.toString(), {
    token: adminToken,
    body: { stock: 1, actor: { _id: '000000000000000000000000', email: 'evil@example.com' } }
  });
  check('K1 Inventory endpoint accepts body actor field without error', spoofRes.status === 200, spoofRes.data);
  const spoofLog = await AuditLog.findOne({ module: 'INVENTORY', action: 'UPDATE', targetId: spawnProduct._id });
  check('K1b Actor spoofing ignored — actor is the authenticated admin', spoofLog && String(spoofLog.actor) === String(admin._id));

  const allAuditLogs = await AuditLog.find({});
  const auditJson = JSON.stringify(allAuditLogs.map((l) => l.toObject()));
  check('K2 No plaintext passwords stored in any audit record', !/adminpass123|customer123|manager123/.test(auditJson));

  const auditLogService = require('./backend/services/auditLogService');
  const sanitized = auditLogService.sanitizeValue({
    name: 'Safe',
    password: 'hunter2',
    hash: 'abc123',
    accessToken: 'tok',
    apiKey: 'key',
    nested: { refreshToken: 'rt', jwt: 'x' },
    keep: 'yes'
  });
  check('K4 sanitizeValue strips password/hash/token/apiKey keys',
    sanitized && sanitized.password === undefined && sanitized.hash === undefined &&
    sanitized.accessToken === undefined && sanitized.apiKey === undefined);
  check('K4b sanitizeValue keeps non-sensitive keys',
    sanitized && sanitized.name === 'Safe' && sanitized.keep === 'yes' &&
    sanitized.nested && sanitized.nested.refreshToken === undefined && sanitized.nested.jwt === undefined);

const anyLog = await AuditLog.findOne({});
  const putAudit = await api('PUT', '/admin/audit-logs/' + String(anyLog._id), { token: adminToken, body: { description: 'tampered' } });
  check('K5 PUT /admin/audit-logs/:id -> 404 (no such route)', putAudit.status === 404, putAudit.data);
  const patchAudit = await api('PATCH', '/admin/audit-logs/' + String(anyLog._id), { token: adminToken, body: { action: 'OTHER' } });
  check('K6 PATCH /admin/audit-logs/:id -> 404 (no such route)', patchAudit.status === 404, patchAudit.data);
  const delAudit = await api('DELETE', '/admin/audit-logs/' + String(anyLog._id), { token: adminToken });
  check('K7 DELETE /admin/audit-logs/:id -> 404 (no such route)', delAudit.status === 404, delAudit.data);

  /* ============ L. QUERY API ============ */
  console.log('\n=== L. QUERY API ===');

  const totalAuditCount = await AuditLog.countDocuments();

  const page1 = await api('GET', '/admin/audit-logs?page=1&limit=5', { token: adminToken });
  check('L1 Page 1 limit 5 -> 200', page1.status === 200, page1.data);
  const p1Logs = (page1.data && page1.data.data && page1.data.data.auditLogs) || [];
  const p1Meta = (page1.data && page1.data.data && page1.data.data.pagination) || {};
  check('L2 Page 1 returns <= 5 records', p1Logs.length <= 5);
  check('L3 Pagination totals match DB count', p1Meta.total === totalAuditCount, p1Meta);

  const page2 = await api('GET', '/admin/audit-logs?page=2&limit=5', { token: adminToken });
  const p2Logs = (page2.data && page2.data.data && page2.data.data.auditLogs) || [];
  const p1Ids = p1Logs.map((l) => String(l._id)).join(',');
  const p2Ids = p2Logs.map((l) => String(l._id)).join(',');
  check('L4 Different pages return different records', totalAuditCount > 5 ? p1Ids !== p2Ids : true);

  const times = p1Logs.map((l) => new Date(l.createdAt).getTime());
  check('L5 Newest-first default sort', times.every((t, i) => i === 0 || times[i - 1] >= t));

  const bigLimit = await api('GET', '/admin/audit-logs?limit=9999', { token: adminToken });
  const bigLogs = (bigLimit.data && bigLimit.data.data && bigLimit.data.data.auditLogs) || [];
  check('L6 Limit is capped at 100', bigLogs.length <= 100);
  const searchRes = await api('GET', '/admin/audit-logs?search=Audit+Sparkler&limit=50', { token: adminToken });
  const searchLogs = (searchRes.data && searchRes.data.data && searchRes.data.data.auditLogs) || [];
  check('L7 Search finds relevant records', searchRes.status === 200 && searchLogs.length > 0);

  const moduleRes = await api('GET', '/admin/audit-logs?module=COUPON&limit=50', { token: adminToken });
  const moduleLogs = (moduleRes.data && moduleRes.data.data && moduleRes.data.data.auditLogs) || [];
  check('L8 Module filter returns only COUPON', moduleRes.status === 200 && moduleLogs.length > 0 && moduleLogs.every((l) => l.module === 'COUPON'));

  const actionRes = await api('GET', '/admin/audit-logs?action=DELETE&limit=50', { token: adminToken });
  const actionLogs = (actionRes.data && actionRes.data.data && actionRes.data.data.auditLogs) || [];
  check('L9 Action filter returns only DELETE', actionRes.status === 200 && actionLogs.length > 0 && actionLogs.every((l) => l.action === 'DELETE'));

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const dateRes = await api('GET', '/admin/audit-logs?startDate=' + todayStr + '&endDate=' + tomorrowStr + '&limit=200', { token: adminToken });
  const dateLogs = (dateRes.data && dateRes.data.data && dateRes.data.data.auditLogs) || [];
  check('L10 Date range filter includes today records', dateRes.status === 200 && dateLogs.length > 0);

  const oldestRes = await api('GET', '/admin/audit-logs?sort=oldest&limit=5', { token: adminToken });
  const oldestLogs = (oldestRes.data && oldestRes.data.data && oldestRes.data.data.auditLogs) || [];
  const oTimes = oldestLogs.map((l) => new Date(l.createdAt).getTime());
  check('L11 Oldest-first sort', oTimes.every((t, i) => i === 0 || oTimes[i - 1] <= t));

  const badModule = await api('GET', '/admin/audit-logs?module=HACKED', { token: adminToken });
  check('L12 Invalid module filter -> 400', badModule.status === 400, badModule.data);
  const badAction = await api('GET', '/admin/audit-logs?action=EVIL', { token: adminToken });
  check('L13 Invalid action filter -> 400', badAction.status === 400, badAction.data);

  const detailRes = await api('GET', '/admin/audit-logs/' + String(anyLog._id), { token: adminToken });
  const detailLog = detailRes.data && detailRes.data.data && detailRes.data.data.auditLog;
  check('L14 Audit detail GET -> 200', detailRes.status === 200 && !!detailLog, detailRes.data);
  check('L15 Audit detail has actor/action/module/description', detailLog && detailLog.actor && detailLog.action && detailLog.module && detailLog.description);
/* ============ M. CONSISTENCY ============ */
  console.log('\n=== M. CONSISTENCY ===');

  const beforeCouponCount = await AuditLog.countDocuments();
  const dupCoupon = await api('POST', '/admin/coupons', {
    token: adminToken,
    body: { code: 'DUPCHK', discountType: 'fixed', discountValue: 50, status: 'active' }
  });
  check('M1 Create coupon with unique code -> 201', dupCoupon.status === 201, dupCoupon.data);
  const afterCreatedCount = await AuditLog.countDocuments();
  const duplicateCoupon = await api('POST', '/admin/coupons', {
    token: adminToken,
    body: { code: 'DUPCHK', discountType: 'fixed', discountValue: 50, status: 'active' }
  });
  check('M2 Duplicate coupon rejected -> 409', duplicateCoupon.status === 409, duplicateCoupon.data);
  const afterCouponCount = await AuditLog.countDocuments();
  check('M3 Failed duplicate create does NOT leave an audit record', afterCouponCount === afterCreatedCount, afterCreatedCount - beforeCouponCount);

  const { order: order2 } = await seedOrder(customer);
  const ord2 = await api('PUT', '/admin/orders/' + order2._id.toString() + '/status', { token: adminToken, body: { status: 'confirmed' } });
  check('M4 Success order status change through transaction helper -> 200', ord2.status === 200, ord2.data);
  const order2LogCount = await AuditLog.countDocuments({ module: 'ORDER', targetId: order2._id });
  check('M5 Transactional audit created exactly once', order2LogCount === 1, order2LogCount);

  const badProdUpd = await api('PUT', '/admin/products/' + '000000000000000000000000', {
    token: adminToken,
    body: { name: 'Nope', originalPrice: 10, category: category0._id.toString() }
  });
  check('M6 Update nonexistent product -> 404', badProdUpd.status === 404, badProdUpd.data);
  const badProdLogCount = await AuditLog.countDocuments({ module: 'PRODUCT', targetId: '000000000000000000000000' });
  check('M7 Failed product update leaves no audit record', badProdLogCount === 0, badProdLogCount);

  /* ============ SUMMARY ============ */
  console.log('\n========================================');
  console.log('PHASE 8 AUDIT LOG TEST RESULTS: ' + passed + ' passed, ' + failed + ' failed');
  console.log('========================================\n');

  await mongoose.connection.dropDatabase();
  console.log('Scratch DB dropped. Production DB untouched.\n');
  server.close();
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  try { await mongoose.connection.dropDatabase(); } catch (e) { /* best-effort */ }
  if (server) server.close();
  await mongoose.disconnect();
  process.exit(1);
});