/* ============================================================
   VENDHAN CRACKERS — ORDER TRACKING TIMELINE (Phase 3) Focused Test
   Run: node test-order-tracking-timeline.js

   DB SAFETY:
     - Uses mongodb://localhost:27017/vendhan_crackers_tracking_test
       (disposable scratch database).
     - Drops the scratch database when finished.
     - The production DB (vendhan_crackers) is NEVER touched.
     - The app is started in-process on an ephemeral port — the already
       running dev server on :5000 is never used or disturbed.

   Covers: the data contract the customer tracking timeline is built from
   (status + statusHistory on list / detail / track), all lifecycle states
   (pending, confirmed, packed, delivered, cancelled), cancelled-order
   history, admin transitions still working and reflecting into customer
   tracking, customer cancellation, ownership isolation (customer B cannot
   see customer A's order), no-orders customer, expired/invalid/absent
   tokens, and admin endpoints remaining accessible to admins only.
   ============================================================ */

const path = require('path');
const mongoose = require('./backend/node_modules/mongoose');
const jwt = require('./backend/node_modules/jsonwebtoken');
require('./backend/node_modules/dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const SCRATCH_MONGODB_URI = 'mongodb://localhost:27017/vendhan_crackers_tracking_test';

const { Admin, Order } = require('./backend/models');
const app = require('./backend/app');

let passed = 0;
let failed = 0;

function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log('  ✅ ' + name);
  } else {
    failed++;
    console.log('  ❌ ' + name + (extra !== undefined ? ' — ' + JSON.stringify(extra).slice(0, 300) : ''));
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
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty */ }
  return { status: res.status, data };
}

const histStatuses = (order) => Array.isArray(order && order.statusHistory)
  ? order.statusHistory.map((h) => h && h.status)
  : [];

let orderSeq = 0;

/* Create an order document directly (the same shape checkoutService creates)
   so the tracking endpoints can be exercised for every lifecycle state. */
async function createOrder(userId, { status, history }) {
  orderSeq++;
  const order = await Order.create({
    orderId: 'TRK-' + Date.now() + '-' + orderSeq,
    user: userId,
    customer: { name: 'Tracking Tester', phone: '9840011223', email: 'tracking-tester@example.com' },
    deliveryAddress: { address: '1 Test Street', city: 'Chennai', state: 'Tamil Nadu', pincode: '600017' },
    items: [{
      product: new mongoose.Types.ObjectId(),
      productName: 'Test Sparkler',
      price: 500,
      quantity: 5,
      subtotal: 2500
    }],
    pricing: { subtotal: 2500, deliveryCharge: 0, gst: 0, total: 2500 },
    payment: { method: 'cod', status: 'pending' },
    status,
    statusHistory: history.map((s) => ({ status: s, changedAt: new Date() }))
  });
  return order;
}

async function main() {
  console.log('========== ORDER TRACKING TIMELINE (Phase 3) ==========\n');

  await mongoose.connect(SCRATCH_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase(); // start clean

  server = app.listen(0);
  const port = server.address().port;
  BASE = 'http://127.0.0.1:' + port + '/api';
  console.log(`In-process server on :${port} against scratch DB '${mongoose.connection.name}'\n`);

  /* ---- Register three customers (real JWT flow) ---- */
  const regA = await api('POST', '/auth/register', { body: { name: 'Track A', email: 'trackA@example.com', phone: '9300000001', password: 'strongpass123' } });
  const regB = await api('POST', '/auth/register', { body: { name: 'Track B', email: 'trackB@example.com', phone: '9300000002', password: 'strongpass123' } });
  const regC = await api('POST', '/auth/register', { body: { name: 'Track C', email: 'trackC@example.com', phone: '9300000003', password: 'strongpass123' } });
  check('Customer A registration succeeds (201)', regA.status === 201, regA.data);
  check('Customer B registration succeeds (201)', regB.status === 201, regB.data);
  check('Customer C registration succeeds (201)', regC.status === 201, regC.data);
  const tokenA = regA.data && regA.data.data && regA.data.data.token;
  const tokenB = regB.data && regB.data.data && regB.data.data.token;
  const tokenC = regC.data && regC.data.data && regC.data.data.token;
  const userAId = regA.data && regA.data.data && regA.data.data.user && regA.data.data.user._id;
  check('Registration returns customer tokens', typeof tokenA === 'string' && typeof tokenB === 'string' && typeof tokenC === 'string');

  /* ---- Create an admin (bcrypt pre-save hashes the password) ---- */
  await Admin.create({ name: 'Track Admin', email: 'trackingadmin@example.com', password: 'adminpass123', role: 'super_admin' });
  const adminLogin = await api('POST', '/admin/auth/login', { body: { email: 'trackingadmin@example.com', password: 'adminpass123' } });
  check('Admin login succeeds (200)', adminLogin.status === 200, adminLogin.data);
  const adminToken = adminLogin.data && adminLogin.data.data && adminLogin.data.data.token;
  check('Admin login returns a token', typeof adminToken === 'string' && adminToken.length > 20);

  console.log('\n--- 1. AUTHENTICATION / EMPTY STATES ---');
  check('GET /orders without token → 401', (await api('GET', '/orders')).status === 401);
  check('GET /orders/:id without token → 401', (await api('GET', '/orders/aaaaaaaaaaaaaaaaaaaaaaaa')).status === 401);
  check('GET /orders/:id/track without token → 401', (await api('GET', '/orders/aaaaaaaaaaaaaaaaaaaaaaaa/track')).status === 401);

  const expiredToken = jwt.sign({ id: new mongoose.Types.ObjectId(), role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
  check('Expired customer token on /orders → 401', (await api('GET', '/orders', { token: expiredToken })).status === 401);
  check('Expired customer token on /orders/:id/track → 401', (await api('GET', '/orders/aaaaaaaaaaaaaaaaaaaaaaaa/track', { token: expiredToken })).status === 401);

  const adminTokenOnCustomer = jwt.sign({ id: new mongoose.Types.ObjectId(), role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  check('Admin token on customer /orders → 403', (await api('GET', '/orders', { token: adminTokenOnCustomer })).status === 403);

  const noOrders = await api('GET', '/orders', { token: tokenC });
  check('Customer with no orders gets 200 + empty list',
    noOrders.status === 200 && Array.isArray(noOrders.data.data.orders) && noOrders.data.data.orders.length === 0 &&
    noOrders.data.data.pagination.total === 0, noOrders.data);

  console.log('\n--- 2. VALIDATION / NOT FOUND ---');
  check('Invalid Mongo id on detail → 422', (await api('GET', '/orders/not-a-mongo-id', { token: tokenA })).status === 422);
  check('Invalid Mongo id on track → 422', (await api('GET', '/orders/not-a-mongo-id/track', { token: tokenA })).status === 422);
  const ghostId = new mongoose.Types.ObjectId();
  check('Nonexistent order detail → 404', (await api('GET', '/orders/' + ghostId, { token: tokenA })).status === 404);
  check('Nonexistent order track → 404', (await api('GET', '/orders/' + ghostId + '/track', { token: tokenA })).status === 404);

  console.log('\n--- 3. SEED ORDERS ACROSS THE FULL LIFECYCLE ---');
  const pendingOrder = await createOrder(userAId, { status: 'pending', history: ['pending'] });
  const confirmedOrder = await createOrder(userAId, { status: 'confirmed', history: ['pending', 'confirmed'] });
  const packedOrder = await createOrder(userAId, { status: 'packed', history: ['pending', 'confirmed', 'packed'] });
  const deliveredOrder = await createOrder(userAId, { status: 'delivered', history: ['pending', 'confirmed', 'packed', 'delivered'] });
  const cancelledFromConfirmed = await createOrder(userAId, { status: 'cancelled', history: ['pending', 'confirmed', 'cancelled'] });
  const cancelledFromPending = await createOrder(userAId, { status: 'cancelled', history: ['pending', 'cancelled'] });
  check('6 orders seeded for customer A', (await Order.countDocuments({ user: userAId })) === 6);

  console.log('\n--- 4. LIST ENDPOINT (timeline data source) ---');
  const list = await api('GET', '/orders', { token: tokenA });
  const listOrders = list.data && list.data.data ? list.data.data.orders : [];
  check('GET /orders → 200 with 6 orders', list.status === 200 && listOrders.length === 6, list.data);
  const listIds = listOrders.map((o) => String(o.id));
  const allIds = [pendingOrder, confirmedOrder, packedOrder, deliveredOrder, cancelledFromConfirmed, cancelledFromPending].map((o) => String(o._id));
  check('List returns all seeded orders', allIds.every((id) => listIds.includes(id)));
  const pendingInList = listOrders.find((o) => String(o.id) === String(pendingOrder._id));
  check('List order exposes status + statusHistory (pending order)',
    !!pendingInList && pendingInList.status === 'pending' && JSON.stringify(histStatuses(pendingInList)) === '["pending"]', pendingInList);
  const cancelledInList = listOrders.find((o) => String(o.id) === String(cancelledFromConfirmed._id));
  check('List order exposes statusHistory for cancelled order',
    !!cancelledInList && cancelledInList.status === 'cancelled' &&
    JSON.stringify(histStatuses(cancelledInList)) === '["pending","confirmed","cancelled"]', cancelledInList);
  check('List order still exposes total + paymentStatus',
    !!pendingInList && typeof pendingInList.total === 'number' && !!pendingInList.paymentStatus);

  console.log('\n--- 5. DETAIL ENDPOINT (per lifecycle state) ---');
  const detailPending = await api('GET', '/orders/' + pendingOrder._id, { token: tokenA });
  check('Detail pending → 200, status pending, history [pending]',
    detailPending.status === 200 && detailPending.data.data.order.status === 'pending' &&
    JSON.stringify(histStatuses(detailPending.data.data.order)) === '["pending"]', detailPending.data);
  check('Detail includes items + pricing + deliveryAddress',
    Array.isArray(detailPending.data.data.order.items) && !!detailPending.data.data.order.pricing &&
    !!detailPending.data.data.order.deliveryAddress, detailPending.data);

  const detailConfirmed = await api('GET', '/orders/' + confirmedOrder._id, { token: tokenA });
  check('Detail confirmed → status confirmed, history [pending, confirmed]',
    detailConfirmed.status === 200 && detailConfirmed.data.data.order.status === 'confirmed' &&
    JSON.stringify(histStatuses(detailConfirmed.data.data.order)) === '["pending","confirmed"]', detailConfirmed.data);

  const detailPacked = await api('GET', '/orders/' + packedOrder._id, { token: tokenA });
  check('Detail packed → status packed, history [pending, confirmed, packed]',
    detailPacked.status === 200 && detailPacked.data.data.order.status === 'packed' &&
    JSON.stringify(histStatuses(detailPacked.data.data.order)) === '["pending","confirmed","packed"]', detailPacked.data);

  const detailDelivered = await api('GET', '/orders/' + deliveredOrder._id, { token: tokenA });
  check('Detail delivered → status delivered, history [pending, confirmed, packed, delivered]',
    detailDelivered.status === 200 && detailDelivered.data.data.order.status === 'delivered' &&
    JSON.stringify(histStatuses(detailDelivered.data.data.order)) === '["pending","confirmed","packed","delivered"]', detailDelivered.data);

  const detailCancelled = await api('GET', '/orders/' + cancelledFromConfirmed._id, { token: tokenA });
  check('Detail cancelled → status cancelled, history up to cancellation point',
    detailCancelled.status === 200 && detailCancelled.data.data.order.status === 'cancelled' &&
    JSON.stringify(histStatuses(detailCancelled.data.data.order)) === '["pending","confirmed","cancelled"]', detailCancelled.data);

  console.log('\n--- 6. TRACK ENDPOINT (orderId, status, statusHistory, updatedAt) ---');
  const trackPending = await api('GET', '/orders/' + pendingOrder._id + '/track', { token: tokenA });
  const tp = trackPending.data && trackPending.data.data;
  check('Track pending → orderId/status/statusHistory/updatedAt',
    trackPending.status === 200 && tp && String(tp.orderId).indexOf('TRK-') === 0 && tp.status === 'pending' &&
    JSON.stringify(histStatuses(tp)) === '["pending"]' && !!tp.updatedAt, trackPending.data);

  const trackDelivered = await api('GET', '/orders/' + deliveredOrder._id + '/track', { token: tokenA });
  const td = trackDelivered.data && trackDelivered.data.data;
  check('Track delivered → history has 4 lifecycle entries',
    trackDelivered.status === 200 && td && td.status === 'delivered' && histStatuses(td).length === 4, trackDelivered.data);

  const trackCancelled = await api('GET', '/orders/' + cancelledFromConfirmed._id + '/track', { token: tokenA });
  const tc = trackCancelled.data && trackCancelled.data.data;
  check('Track cancelled → cancelled is last history entry',
    trackCancelled.status === 200 && tc && tc.status === 'cancelled' &&
    histStatuses(tc)[histStatuses(tc).length - 1] === 'cancelled', trackCancelled.data);

  console.log('\n--- 7. ADMIN FLOW UNCHANGED + REFLECTS INTO CUSTOMER TRACKING ---');
  check('Customer token on admin orders API → 403', (await api('GET', '/admin/orders', { token: tokenA })).status === 403);

  const adminPutConfirmed = await api('PUT', '/admin/orders/' + pendingOrder._id + '/status', { token: adminToken, body: { status: 'confirmed' } });
  check('Admin pending → confirmed (200)', adminPutConfirmed.status === 200, adminPutConfirmed.data);
  const adminPutPacked = await api('PUT', '/admin/orders/' + pendingOrder._id + '/status', { token: adminToken, body: { status: 'packed' } });
  check('Admin confirmed → packed (200)', adminPutPacked.status === 200, adminPutPacked.data);
  const adminPutDelivered = await api('PUT', '/admin/orders/' + pendingOrder._id + '/status', { token: adminToken, body: { status: 'delivered' } });
  check('Admin packed → delivered (200)', adminPutDelivered.status === 200, adminPutDelivered.data);
  const adminPutInvalidTransition = await api('PUT', '/admin/orders/' + deliveredOrder._id + '/status', { token: adminToken, body: { status: 'confirmed' } });
  check('Admin invalid transition (delivered → confirmed) rejected (400)', adminPutInvalidTransition.status === 400, adminPutInvalidTransition.data);

  const trackAfterAdmin = await api('GET', '/orders/' + pendingOrder._id + '/track', { token: tokenA });
  const ta = trackAfterAdmin.data && trackAfterAdmin.data.data;
  check('Customer track reflects admin lifecycle [pending, confirmed, packed, delivered]',
    trackAfterAdmin.status === 200 && ta && ta.status === 'delivered' &&
    JSON.stringify(histStatuses(ta)) === '["pending","confirmed","packed","delivered"]', trackAfterAdmin.data);

  const adminList = await api('GET', '/admin/orders', { token: adminToken });
  check('Admin order list still works (200)', adminList.status === 200, adminList.data);
  const adminDetail = await api('GET', '/admin/orders/' + deliveredOrder._id, { token: adminToken });
  check('Admin order detail still works (200)', adminDetail.status === 200, adminDetail.data);

  console.log('\n--- 8. CUSTOMER CANCELLATION (business logic intact) ---');
  const cancelRes = await api('POST', '/orders/' + confirmedOrder._id + '/cancel', { token: tokenA });
  check('Customer cancels a confirmed order → 200', cancelRes.status === 200, cancelRes.data);
  const trackAfterCancel = await api('GET', '/orders/' + confirmedOrder._id + '/track', { token: tokenA });
  const tcan = trackAfterCancel.data && trackAfterCancel.data.data;
  check('Cancelled order history ends with cancelled',
    trackAfterCancel.status === 200 && tcan && tcan.status === 'cancelled' &&
    JSON.stringify(histStatuses(tcan)) === '["pending","confirmed","cancelled"]', trackAfterCancel.data);
  const doubleCancel = await api('POST', '/orders/' + confirmedOrder._id + '/cancel', { token: tokenA });
  check('Double cancel rejected (400)', doubleCancel.status === 400, doubleCancel.data);

  console.log('\n--- 9. OWNERSHIP ISOLATION (customer A vs B) ---');
  check('Customer B detail on A order → 404', (await api('GET', '/orders/' + pendingOrder._id, { token: tokenB })).status === 404);
  check('Customer B track on A order → 404', (await api('GET', '/orders/' + pendingOrder._id + '/track', { token: tokenB })).status === 404);
  check('Customer B cancel on A order → 404', (await api('POST', '/orders/' + pendingOrder._id + '/cancel', { token: tokenB })).status === 404);
  const listB = await api('GET', '/orders', { token: tokenB });
  check('Customer B list never includes A orders',
    listB.status === 200 && Array.isArray(listB.data.data.orders) && listB.data.data.orders.length === 0, listB.data);

  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  await mongoose.connection.dropDatabase();
  console.log('Scratch DB dropped. Production DB untouched.\n');
  server.close();
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  try { await mongoose.connection.dropDatabase(); } catch (e) { /* best-effort cleanup */ }
  if (server) server.close();
  process.exit(1);
});