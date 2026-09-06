/* ============================================================
   VENDHAN CRACKERS — PHASE 5 ADMIN DASHBOARD ANALYTICS Focused Test
   Run: node test-phase5-dashboard-analytics.js

   DB SAFETY:
     - Uses mongodb://localhost:27017/vendhan_crackers_dashboard_test
       (disposable scratch database).
     - Drops the scratch database when finished.
     - The production DB (vendhan_crackers) is NEVER touched.
     - The app is started in-process on an ephemeral port — the already
       running dev server on :5000 is never used.

   Covers: admin access, customer → 403, missing/expired token → 401,
   summary vs fixtures, sales trend vs stored totals, cancelled order
   exclusion (existing business definition), order-status counts,
   retail vs wholesale counts/sales, best-selling products,
   best-selling categories, low-stock threshold, empty date range,
   existing dashboard + admin orders/products/customers/inventory APIs.
   ============================================================ */

const path = require('path');
const mongoose = require('./backend/node_modules/mongoose');
const jwt = require('./backend/node_modules/jsonwebtoken');
require('./backend/node_modules/dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const SCRATCH_MONGODB_URI = 'mongodb://localhost:27017/vendhan_crackers_dashboard_test';

const { Setting, Admin, Category, Product, User, Order } = require('./backend/models');
const app = require('./backend/app');

let passed = 0;
let failed = 0;

function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log('  ✅ ' + name);
  } else {
    failed++;
    console.log('  ❌ ' + name + (extra !== undefined ? ' — ' + JSON.stringify(extra).slice(0, 500) : ''));
  }
}

const closeEnough = (a, b, eps = 0.01) => Math.abs(Number(a) - Number(b)) < eps;

let server = null;
let BASE = '';
let orderSeq = 0;

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

/* Create an order document directly (the same shape checkoutService.createOrder
   persists) so analytics can be exercised with realistic stored snapshots. */
async function createOrderFor(userId, customerType, {
  product, productName, price, qty, status = 'pending', total, subtotal, daysAgo = 0
}) {
  orderSeq++;
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return Order.create({
    orderId: 'P5-' + Date.now() + '-' + orderSeq,
    user: userId,
    customer: { name: 'Phase 5 Tester', phone: '9800000001', email: 'p5-tester@example.com' },
    deliveryAddress: { address: '1 Test Street', city: 'Chennai', state: 'Tamil Nadu', pincode: '600017' },
    createdAt,
    updatedAt: createdAt,
    items: [{
      product,
      productName,
      price,
      originalPrice: Math.round(price * 1.1 * 100) / 100,
      discountPercent: 0,
      discountAmount: 0,
      wholesaleDiscountPercent: 0,
      wholesaleDiscountAmount: 0,
      quantity: qty,
      subtotal
    }],
    pricing: {
      subtotal,
      comboDiscount: 0,
      couponDiscount: 0,
      secondOrderDiscountPercent: 0,
      secondOrderDiscountAmount: 0,
      membershipTier: 'none',
      membershipDiscountPercent: 0,
      membershipDiscountAmount: 0,
      customerType,
      wholesaleTier: null,
      wholesaleDiscountPercent: 0,
      wholesaleDiscountAmount: 0,
      referralDiscountPercent: 0,
      referralDiscountAmount: 0,
      referralCode: null,
      referredByReseller: null,
      deliveryCharge: 0,
      gst: 0,
      total
    },
    payment: { method: 'cod', status: status === 'cancelled' ? 'refunded' : 'pending' },
    status,
    statusHistory: [{ status, changedAt: new Date() }]
  });
}

async function main() {
  console.log('========== PHASE 5 ADMIN DASHBOARD ANALYTICS ==========\n');

  await mongoose.connect(SCRATCH_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase(); // start clean

  server = app.listen(0);
  const port = server.address().port;
  BASE = 'http://127.0.0.1:' + port + '/api';
  console.log(`In-process server on :${port} against scratch DB '${mongoose.connection.name}'\n`);

  // Seed Setting (lowStockThreshold = 10 drives the low-stock section).
  await Setting.create({
    shopName: 'Vendhan Crackers',
    phone: '9876500111',
    email: 'p5-shop@example.com',
    address: '42, Festival Street, Chennai — 600001',
    lowStockThreshold: 10
  });

  /* ---- Admin + customers ---- */
  await Admin.create({ name: 'Phase 5 Admin', email: 'p5admin@example.com', password: 'adminpass123', role: 'super_admin' });
  const adminLogin = await api('POST', '/admin/auth/login', { body: { email: 'p5admin@example.com', password: 'adminpass123' } });
  const adminToken = adminLogin.data && adminLogin.data.data && adminLogin.data.data.token;
  check('Admin login returns a token', typeof adminToken === 'string' && adminToken.length > 20);

  const regA = await api('POST', '/auth/register', { body: { name: 'Retail P5', email: 'retailp5@example.com', phone: '9400000101', password: 'strongpass123' } });
  const regB = await api('POST', '/auth/register', { body: { name: 'Wholesale P5', email: 'wholesalep5@example.com', phone: '9400000102', password: 'strongpass123' } });
  const tokenA = regA.data && regA.data.data && regA.data.data.token;
  const tokenB = regB.data && regB.data.data && regB.data.data.token;
  const userA = regA.data && regA.data.data && regA.data.data.user;
  const userB = regB.data && regB.data.data && regB.data.data.user;
  check('Registration returns customer tokens', typeof tokenA === 'string' && typeof tokenB === 'string');

  // Make customer B wholesale (the User model enum supports retail | wholesale).
  await User.findByIdAndUpdate(userB._id, { customerType: 'wholesale' });

  /* ---- Categories + Products ---- */
  const catSpark = await Category.create({ name: 'Phase 5 Sparklers' });
  const catRocket = await Category.create({ name: 'Phase 5 Rockets' });

  const prodSpark = await Product.create({ name: 'P5 Sparkler Box', category: catSpark._id, price: 100, stock: 5, reorderLevel: 8, status: 'active' });
  const prodRocket = await Product.create({ name: 'P5 Rocket Pack', category: catRocket._id, price: 200, stock: 100, reorderLevel: 20, status: 'active' });
  const prodLow = await Product.create({ name: 'P5 Low Stock Item', category: catSpark._id, price: 50, stock: 3, reorderLevel: 10, status: 'active' });
  await Product.create({ name: 'P5 Out Of Stock', category: catRocket._id, price: 80, stock: 0, reorderLevel: 10, status: 'active' });

  /* ---- Orders (realistic stored pricing snapshots) ----
     O1 retail delivered   : spark 10 qty -> subtotal 1000 -> total 1180
     O2 retail pending     : spark  2 qty -> subtotal  200 -> total  249
     O3 wholesale delivered: rocket 20 qty -> subtotal 4000 -> total 4600
     O4 retail CANCELLED   : spark  5 qty -> subtotal  500 -> total  590 (EXCLUDED from sales)
   */
  await createOrderFor(userA._id, 'retail', { product: prodSpark._id, productName: 'P5 Sparkler Box', price: 100, qty: 10, status: 'delivered', subtotal: 1000, total: 1180, daysAgo: 5 });
  await createOrderFor(userA._id, 'retail', { product: prodSpark._id, productName: 'P5 Sparkler Box', price: 100, qty: 2, status: 'pending', subtotal: 200, total: 249, daysAgo: 4 });
  await createOrderFor(userB._id, 'wholesale', { product: prodRocket._id, productName: 'P5 Rocket Pack', price: 200, qty: 20, status: 'delivered', subtotal: 4000, total: 4600, daysAgo: 3 });
  await createOrderFor(userA._id, 'retail', { product: prodSpark._id, productName: 'P5 Sparkler Box', price: 100, qty: 5, status: 'cancelled', subtotal: 500, total: 590, daysAgo: 2 });
  const o1Id = (await Order.findOne({ 'items.productName': 'P5 Sparkler Box', status: 'delivered' }))._id;

  console.log('\n--- 1. AUTHORIZATION ---');
  check('Missing token -> 401', (await api('GET', '/admin/dashboard/analytics')).status === 401);
  check('Customer token -> 403', (await api('GET', '/admin/dashboard/analytics', { token: tokenA })).status === 403);
  const expired = jwt.sign({ id: new mongoose.Types.ObjectId(), role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
  check('Expired admin token -> 401', (await api('GET', '/admin/dashboard/analytics', { token: expired })).status === 401);
  const badSecret = jwt.sign({ id: new mongoose.Types.ObjectId(), role: 'admin' }, 'wrong_secret_key_value', { expiresIn: '5m' });
  check('Wrong-secret token -> 401', (await api('GET', '/admin/dashboard/analytics', { token: badSecret })).status === 401);
  check('Invalid period -> 400', (await api('GET', '/admin/dashboard/analytics?period=bogus', { token: adminToken })).status === 400);

  console.log('\n--- 2. MAIN ANALYTICS PAYLOAD (period=all) ---');
  const analyticsRes = await api('GET', '/admin/dashboard/analytics?period=all', { token: adminToken });
  check('Admin analytics returns 200', analyticsRes.status === 200, analyticsRes.data);
  const a = analyticsRes.data && analyticsRes.data.data;
  check('Payload has summary object', !!(a && a.summary));
  check('Payload has salesTrend object', !!(a && a.salesTrend && Array.isArray(a.salesTrend.sales)));
  check('Payload has orderStatus.byStatus array', !!(a && a.orderStatus && Array.isArray(a.orderStatus.byStatus)));
  check('Payload has customers object', !!(a && a.customers));
  check('Payload has customerTypeSales object', !!(a && a.customerTypeSales && a.customerTypeSales.retail && a.customerTypeSales.wholesale));
  check('Payload has bestSellingProducts array', !!(a && Array.isArray(a.bestSellingProducts)));
  check('Payload has bestSellingCategories array', !!(a && Array.isArray(a.bestSellingCategories)));
  check('Payload has lowStockProducts array', !!(a && Array.isArray(a.lowStockProducts)));
  check('Payload has recentOrders array', !!(a && Array.isArray(a.recentOrders)));

  console.log('\n--- 3. SUMMARY MATCHES FIXTURES ---');
  if (a) {
    check('totalSales = 1180 + 249 + 4600 = 6029 (cancelled 590 excluded)', closeEnough(a.summary.totalSales, 6029), a.summary.totalSales);
    check('totalOrders = 4 (all orders incl. cancelled)', a.summary.totalOrders === 4, a.summary.totalOrders);
    check('pendingOrders = 1', a.summary.pendingOrders === 1, a.summary.pendingOrders);
    check('deliveredOrders = 2', a.summary.deliveredOrders === 2, a.summary.deliveredOrders);
    check('totalProducts = 4 (active products only)', a.summary.totalProducts === 4, a.summary.totalProducts);
    check('totalCustomers = 2 (active users only)', a.summary.totalCustomers === 2, a.summary.totalCustomers);
    check('lowStockCount = 2 (stock>0 && stock<=10)', a.summary.lowStockCount === 2, a.summary.lowStockCount);
    check('outOfStockCount = 1', a.summary.outOfStockCount === 1, a.summary.outOfStockCount);
  }

  console.log('\n--- 4. SALES TREND MATCHES STORED TOTALS ---');
  if (a) {
    const allSales = a.salesTrend.sales.reduce((s, r) => s + Number(r.revenue || 0), 0);
    check('Sum of sales trend = 6029 (stored totals, cancelled excluded)', closeEnough(allSales, 6029), allSales);
    check('Sales trend granularity present', ['day', 'hour', 'month'].includes(a.salesTrend.granularity), a.salesTrend.granularity);
  }

  console.log('\n--- 5. ORDER STATUS COUNTS ---');
  if (a) {
    const map = {};
    a.orderStatus.byStatus.forEach((s) => { map[s.status] = s.count; });
    check('pending = 1', map.pending === 1, map);
    check('confirmed = 0', map.confirmed === 0, map);
    check('packed = 0', map.packed === 0, map);
    check('delivered = 2', map.delivered === 2, map);
    check('cancelled = 1', map.cancelled === 1, map);
    check('orderStatus total = 4', a.orderStatus.total === 4, a.orderStatus.total);
  }

  console.log('\n--- 6. CUSTOMER ANALYTICS ---');
  if (a) {
    check('customers.total = 2', a.customers.total === 2, a.customers);
    check('customers.retail = 1', a.customers.retail === 1, a.customers);
    check('customers.wholesale = 1', a.customers.wholesale === 1, a.customers);
    check('customers.newCustomers (period=all) = 2 (createdAt convention)', a.customers.newCustomers === 2, a.customers);
  }

  console.log('\n--- 7. RETAIL vs WHOLESALE ---');
  if (a) {
    check('retail.sales = 1429 (1180 + 249)', closeEnough(a.customerTypeSales.retail.sales, 1429), a.customerTypeSales.retail);
    check('retail.orderCount = 2 (cancelled excluded)', a.customerTypeSales.retail.orderCount === 2, a.customerTypeSales.retail);
    check('wholesale.sales = 4600', closeEnough(a.customerTypeSales.wholesale.sales, 4600), a.customerTypeSales.wholesale);
    check('wholesale.orderCount = 1', a.customerTypeSales.wholesale.orderCount === 1, a.customerTypeSales.wholesale);
  }

  console.log('\n--- 8. BEST-SELLING PRODUCTS ---');
  if (a) {
    const top = a.bestSellingProducts[0];
    check('Arr sorted by quantity desc', a.bestSellingProducts.every((p, i) => i === 0 || a.bestSellingProducts[i - 1].quantitySold >= p.quantitySold));
    check('Top product is P5 Rocket Pack (qty 20)', !!top && top.productName === 'P5 Rocket Pack' && top.quantitySold === 20, top);
    const spark = a.bestSellingProducts.find((p) => p.productName === 'P5 Sparkler Box');
    check('Sparkler Box units = 12 (10+2, cancelled 5 excluded)', !!spark && spark.quantitySold === 12, spark);
    check('Sparkler Box revenue = 1200 (stored item subtotals)', !!spark && closeEnough(spark.revenue, 1200), spark);
  }

  console.log('\n--- 9. BEST-SELLING CATEGORIES ---');
  if (a) {
    const catMap = {};
    a.bestSellingCategories.forEach((c) => { catMap[c.category] = c; });
    const rockets = catMap['Phase 5 Rockets'];
    const sparklers = catMap['Phase 5 Sparklers'];
    check('Rockets revenue = 4000 (order item subtotal via product lookup)', !!rockets && closeEnough(rockets.revenue, 4000), a.bestSellingCategories);
    check('Sparklers revenue = 1200', !!sparklers && closeEnough(sparklers.revenue, 1200), a.bestSellingCategories);
    const cancelledExcluded = !sparklers || sparklers.revenue <= 1700;
    check('Cancelled order revenue excluded from categories', cancelledExcluded, a.bestSellingCategories);
    check('Categories sorted by revenue desc', a.bestSellingCategories.every((c, i) => i === 0 || a.bestSellingCategories[i - 1].revenue >= c.revenue));
  }

  console.log('\n--- 10. LOW-STOCK ---');
  if (a) {
    const names = a.lowStockProducts.map((p) => p.name);
    check('P5 Low Stock Item (stock 3) in low-stock list', names.includes('P5 Low Stock Item'));
    check('P5 Sparkler Box (stock 5 <= threshold 10) in low-stock list', names.includes('P5 Sparkler Box'));
    check('Rocket Pack (stock 100) NOT in low-stock list', !names.includes('P5 Rocket Pack'));
    check('Out-of-stock (stock 0) excluded from low-stock list', !names.includes('P5 Out Of Stock'));
    check('Low-stock items sorted by stock asc', a.lowStockProducts.every((p, i) => i === 0 || a.lowStockProducts[i - 1].stock <= p.stock));
  }

  console.log('\n--- 11. EMPTY / DATE-RANGED PERIOD ---');
  const empty = await api('GET', '/admin/dashboard/analytics?period=today', { token: adminToken });
  check('Today period returns 200', empty.status === 200, empty.data);
  const e = empty.data && empty.data.data;
  if (e) {
    check('Empty period totalSales = 0 (no misleading data)', closeEnough(e.summary.totalSales, 0), e.summary);
    check('Empty period salesTrend empty array', Array.isArray(e.salesTrend.sales) && e.salesTrend.sales.length === 0, e.salesTrend);
    check('Empty period bestSellingProducts empty', Array.isArray(e.bestSellingProducts) && e.bestSellingProducts.length === 0, e.bestSellingProducts);
  }
  const week = await api('GET', '/admin/dashboard/analytics?period=week', { token: adminToken });
  check('Last 7 days period returns 200', week.status === 200, week.data);
  const w = week.data && week.data.data;
  if (w) {
    const dailyGran = w.salesTrend && w.salesTrend.granularity === 'day';
    check('Week sales trend uses daily granularity', dailyGran, w.salesTrend && w.salesTrend.granularity);
    const wholesaleDay = (w.salesTrend && w.salesTrend.sales || []).some((r) => closeEnough(r.revenue, 4600));
    check('Wholesale delivered total (4600) appears as a day bucket', wholesaleDay, w.salesTrend && w.salesTrend.sales);
    const cancelledDay = (w.salesTrend && w.salesTrend.sales || []).some((r) => closeEnough(r.revenue, 590));
    check('Cancelled order total (590) NOT in sales trend', !cancelledDay, w.salesTrend && w.salesTrend.sales);
  }
  const month = await api('GET', '/admin/dashboard/analytics?period=month', { token: adminToken });
  check('Last 30 days period returns 200', month.status === 200, month.data);
  const thisYear = await api('GET', '/admin/dashboard/analytics?period=this_year', { token: adminToken });
  check('This year period returns 200', thisYear.status === 200, thisYear.data);

  console.log('\n--- 12. EXISTING DASHBOARD APIS STILL WORK ---');
  const summaryRes = await api('GET', '/admin/dashboard/summary', { token: adminToken });
  check('GET /summary -> 200 (totalSales 6029)', summaryRes.status === 200 && closeEnough(summaryRes.data.data.totalSales, 6029), summaryRes.data);
  check('GET /sales -> 200', (await api('GET', '/admin/dashboard/sales', { token: adminToken })).status === 200);
  const orderStatsRes = await api('GET', '/admin/dashboard/orders', { token: adminToken });
  check('GET /orders -> 200 with byStatus total 4', orderStatsRes.status === 200 && Array.isArray(orderStatsRes.data.data.byStatus) && orderStatsRes.data.data.total === 4, orderStatsRes.data);
  check('GET /top-products -> 200', (await api('GET', '/admin/dashboard/top-products?limit=5', { token: adminToken })).status === 200);
  check('GET /category-sales -> 200', (await api('GET', '/admin/dashboard/category-sales', { token: adminToken })).status === 200);
  check('GET /recent-orders -> 200', (await api('GET', '/admin/dashboard/recent-orders?limit=5', { token: adminToken })).status === 200);
  check('GET /low-stock -> 200', (await api('GET', '/admin/dashboard/low-stock', { token: adminToken })).status === 200);

  console.log('\n--- 13. EXISTING ADMIN PAGES APIS STILL WORK ---');
  check('GET /admin/orders -> 200', (await api('GET', '/admin/orders', { token: adminToken })).status === 200);
  check('GET /admin/products -> 200', (await api('GET', '/admin/products?limit=10', { token: adminToken })).status === 200);
  check('GET /admin/customers -> 200', (await api('GET', '/admin/customers', { token: adminToken })).status === 200);
  check('GET /admin/inventory -> 200', (await api('GET', '/admin/inventory', { token: adminToken })).status === 200);
  check('GET /admin/inventory/low-stock -> 200', (await api('GET', '/admin/inventory/low-stock', { token: adminToken })).status === 200);

  console.log('\n--- 14. ORDER-SCOPE REGRESSION (admin order detail) ---');
  const detail = await api('GET', `/admin/orders/${o1Id}`, { token: adminToken });
  check('Admin order detail still works -> 200', detail.status === 200 && detail.data.data && detail.data.data.order);

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