/* ============================================================
   VENDHAN CRACKERS — PHASE 6: COUPON MANAGEMENT Focused Test
   Run: node test-phase6-coupons.js

   DB SAFETY:
     - Uses mongodb://localhost:27017/vendhan_crackers_coupon_test
       (disposable scratch database).
     - Drops the scratch database when finished.
     - The production DB (vendhan_crackers) is NEVER touched.
     - The app runs in-process on an ephemeral port (the dev server
       on :5000 is never used or disturbed).

   Covers: admin coupon CRUD, duplicate/invalid rejection, authz
   (401/403), percentage/fixed/expiry/future/inactive/min-order/
   max-discount/usage-limit validation, validation never consumes
   usage, real checkout + order creation with backend revalidation
   and exactly-once usage, failed order does not consume usage,
   double-application impossible, back end ignores client-sent
   discount/total, no-coupon pricing regressions (retail/wholesale/
   category/loyalty/referral/delivery/minimums), GST stays
   tax-inclusive (gst = 0), and coupon + existing discount ordering.
   ============================================================ */

const path = require('path');
const mongoose = require('./backend/node_modules/mongoose');
const jwt = require('./backend/node_modules/jsonwebtoken');
require('./backend/node_modules/dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const SCRATCH_MONGODB_URI = 'mongodb://localhost:27017/vendhan_crackers_coupon_test';

const { Coupon, Admin, Setting, Category, Product, User, Cart, Order } = require('./backend/models');
const couponService = require('./backend/services/couponService');
const calculatePricing = require('./backend/utils/calculatePricing');
const { getWholesaleTier, WHOLESALE_MIN_ORDER_AMOUNT } = require('./backend/utils/wholesale');
const { MINIMUM_ONLINE_ORDER_AMOUNT } = require('./backend/utils/minimumOrder');
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

const closeEnough = (a, b) => Math.abs(Number(a) - Number(b)) < 0.01;

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

async function seedSettings() {
  seq++;
  return Setting.create({
    shopName: 'Vendhan Crackers Coupon Test',
    phone: '9876543210',
    email: 'coupon-test-shop@example.com',
    address: '1 Coupon Test Street, Chennai',
    deliveryCharge: 49,
    freeDeliveryThreshold: 1000,
    minimumOrderAmount: 2000,
    gst: 0
  });
}

async function seedAdmin() {
  seq++;
  return Admin.create({
    name: 'Coupon Admin ' + seq,
    email: 'couponadmin' + seq + '@example.com',
    password: 'adminpass123',
    role: 'super_admin',
    status: 'active'
  });
}

async function seedUser(customerType, opts) {
  seq++;
  return User.create(Object.assign({
    name: 'Coupon User ' + seq,
    email: 'couponuser' + seq + '@example.com',
    phone: String(9400000000 + seq),
    password: 'strongpass123',
    customerType: customerType || 'retail',
    status: 'active'
  }, opts || {}));
}

async function seedCategory(discountPercent) {
  seq++;
  return Category.create({ name: 'Coupon Cat ' + seq, discount: discountPercent || 0, status: 'active' });
}

async function seedProduct(price, category) {
  seq++;
  return Product.create({
    name: 'Coupon Product ' + seq,
    category: category._id,
    price: price,
    stock: 100000,
    status: 'active'
  });
}

async function seedCart(userId, product, quantity) {
  return Cart.create({
    user: userId,
    items: [
      { itemType: 'PRODUCT', product: product._id, name: product.name, price: product.price, quantity: quantity }
    ]
  });
}

async function seedCompletedOrders(userId, count) {
  const product = await Product.findOne({});
  for (let i = 0; i < count; i++) {
    seq++;
    await Order.create({
      orderId: 'SEED' + Date.now() + '_' + seq,
      user: userId,
      customer: { name: 'Seed Buyer', phone: '9800000001', email: 'seedbuyer@example.com' },
      deliveryAddress: { address: '1 Seed St', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
      items: [{ product: product._id, productName: 'Seed product', price: 3000, quantity: 1, subtotal: 3000 }],
      pricing: { subtotal: 3000, discount: 0, deliveryCharge: 0, gst: 0, total: 3000 },
      payment: { method: 'cod', status: 'paid' },
      status: 'delivered',
      statusHistory: [{ status: 'delivered', changedAt: new Date() }]
    });
  }
}

const DELIVERY = {
  name: 'Coupon Buyer',
  phone: '9600000001',
  email: 'coupon-buyer@example.com',
  address: '1 Coupon Buyer St',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001'
};

function custToken(user) {
  return jwt.sign({ id: user._id.toString(), role: 'customer' }, process.env.JWT_SECRET);
}

async function main() {
  console.log('========== PHASE 6 - COUPON MANAGEMENT ==========\n');

  await mongoose.connect(SCRATCH_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase(); // start clean

  server = app.listen(0);
  const port = server.address().port;
  BASE = 'http://127.0.0.1:' + port + '/api';
  console.log('In-process server on :' + port + " against scratch DB '" + mongoose.connection.name + "'\n");

  await seedSettings();

  const admin = await seedAdmin();
  const adminLogin = await api('POST', '/admin/auth/login', {
    body: { email: admin.email, password: 'adminpass123' }
  });
  check('Admin login succeeds (200)', adminLogin.status === 200, adminLogin.data);
  const adminToken = adminLogin.data && adminLogin.data.data && adminLogin.data.data.token;
  check('Admin login returns a token', typeof adminToken === 'string' && adminToken.length > 20);

  const customer = await seedUser('retail');
  const customerToken = custToken(customer);
  const category10 = await seedCategory(10);
  const category0 = await seedCategory(0);

  /* ============ A. ADMIN COUPON MANAGEMENT ============ */
  console.log('\n=== A. ADMIN COUPON MANAGEMENT ===');

  // 1. list (empty)
  const listEmpty = await api('GET', '/admin/coupons', { token: adminToken });
  check('A1 Admin list coupons [empty] -> 200', listEmpty.status === 200, listEmpty.data);
  check('A1b list returns coupons array',
    Array.isArray(listEmpty.data && listEmpty.data.data && listEmpty.data.data.coupons));

  // 2. create percentage coupon
  const pctCreate = await api('POST', '/admin/coupons', {
    token: adminToken,
    body: { code: 'WELCOME10', discountType: 'percentage', discountValue: 10, minimumOrderAmount: 500, maximumDiscount: 150 }
  });
  check('A2 Admin create percentage coupon -> 201', pctCreate.status === 201, pctCreate.data);
  const pctCoupon = pctCreate.data && pctCreate.data.data && pctCreate.data.data.coupon;
  check('A2b code normalized to UPPERCASE', !!pctCoupon && pctCoupon.code === 'WELCOME10');

  // 3. create fixed coupon
  const fixedCreate = await api('POST', '/admin/coupons', {
    token: adminToken,
    body: { code: 'SAVE100', discountType: 'fixed', discountValue: 100, minimumOrderAmount: 500 }
  });
  check('A3 Admin create fixed coupon -> 201', fixedCreate.status === 201, fixedCreate.data);
  const fixedCoupon = fixedCreate.data && fixedCreate.data.data && fixedCreate.data.data.coupon;

  // 4. get one
  const getRes = await api('GET', '/admin/coupons/' + (pctCoupon && pctCoupon._id), { token: adminToken });
  check('A4 Admin get coupon -> 200', getRes.status === 200, getRes.data);

  // 5. update
  const updRes = await api('PUT', '/admin/coupons/' + (pctCoupon && pctCoupon._id), {
    token: adminToken,
    body: { discountValue: 15 }
  });
  check('A5 Admin update coupon -> 200', updRes.status === 200, updRes.data);
  const updCoupon = updRes.data && updRes.data.data && updRes.data.data.coupon;
  check('A5b updated discountValue = 15', !!updCoupon && Number(updCoupon.discountValue) === 15);

  // 6. activate/deactivate
  const deactRes = await api('PUT', '/admin/coupons/' + (pctCoupon && pctCoupon._id), {
    token: adminToken,
    body: { status: 'inactive' }
  });
  const deactStatus = deactRes.data && deactRes.data.data && deactRes.data.data.coupon && deactRes.data.data.coupon.status;
  check('A6a deactivate -> status inactive', deactRes.status === 200 && deactStatus === 'inactive', deactRes.data);
  const reactRes = await api('PUT', '/admin/coupons/' + (pctCoupon && pctCoupon._id), {
    token: adminToken,
    body: { status: 'active' }
  });
  const reactStatus = reactRes.data && reactRes.data.data && reactRes.data.data.coupon && reactRes.data.data.coupon.status;
  check('A6b reactivate -> status active', reactRes.status === 200 && reactStatus === 'active', reactRes.data);

  // 7. delete
  const delRes = await api('DELETE', '/admin/coupons/' + (fixedCoupon && fixedCoupon._id), { token: adminToken });
  check('A7 Admin delete coupon -> 200', delRes.status === 200, delRes.data);

  // 8. duplicate coupon rejected
  const dupRes = await api('POST', '/admin/coupons', {
    token: adminToken,
    body: { code: 'welcome10', discountType: 'percentage', discountValue: 10 }
  });
  check('A8 Duplicate coupon (case-insensitive) rejected (409)', dupRes.status === 409, dupRes.data);

  // 9. invalid coupon data rejected
  const bad1 = await api('POST', '/admin/coupons', { token: adminToken, body: { code: '', discountType: 'percentage', discountValue: 10 } });
  check('A9a empty code rejected (422)', bad1.status === 422, bad1.data);
  const bad2 = await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'BADPCT', discountType: 'percentage', discountValue: 150 } });
  check('A9b percentage > 100 rejected (422)', bad2.status === 422, bad2.data);
  const bad3 = await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'NEG', discountType: 'fixed', discountValue: -5 } });
  check('A9c negative discount rejected (422)', bad3.status === 422, bad3.data);
  const bad4 = await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'EVIL', discountType: 'bogo', discountValue: 5 } });
  check('A9d invalid discount type rejected (422)', bad4.status === 422, bad4.data);
  const bad5 = await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'BADDATE', discountType: 'fixed', discountValue: 10, startDate: 'not-a-date' } });
  check('A9e invalid date rejected (422)', bad5.status === 422, bad5.data);

  // 10. missing admin token rejected
  const noTokList = await api('GET', '/admin/coupons');
  check('A10a missing admin token on list -> 401', noTokList.status === 401, noTokList.data);
  const noTokCreate = await api('POST', '/admin/coupons', { body: { code: 'X1', discountType: 'fixed', discountValue: 10 } });
  check('A10b missing admin token on create -> 401', noTokCreate.status === 401, noTokCreate.data);

  // 11. customer token cannot access admin coupon endpoints
  const custList = await api('GET', '/admin/coupons', { token: customerToken });
  check('A11a customer token on admin list -> 403', custList.status === 403, custList.data);
  const custCreate = await api('POST', '/admin/coupons', { token: customerToken, body: { code: 'X2', discountType: 'fixed', discountValue: 10 } });
  check('A11b customer token on admin create -> 403', custCreate.status === 403, custCreate.data);

  // 12. invalid / expired admin tokens
  const badTok = await api('GET', '/admin/coupons', { token: 'garbage' });
  check('A12a invalid admin token -> 401', badTok.status === 401, badTok.data);
  const expiredAdminTok = jwt.sign({ id: admin._id.toString(), role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
  const expAdminRes = await api('GET', '/admin/coupons', { token: expiredAdminTok });
  check('A12b expired admin token -> 401', expAdminRes.status === 401, expAdminRes.data);

  /* ============ B. COUPON VALIDATION (customer endpoint) ============ */
  console.log('\n=== B. COUPON VALIDATION (/api/coupon/validate) ===');

  // Dedicated coupons for this section (WELCOME10/SAVE100 were mutated/deleted by the Admin CRUD section).
  await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'BV10', discountType: 'percentage', discountValue: 10, minimumOrderAmount: 500, maximumDiscount: 150 } });
  await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'BVF100', discountType: 'fixed', discountValue: 100, minimumOrderAmount: 500 } });

  const pctVal = await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'BV10', subtotal: 1000 } });
  check('B1 valid percentage coupon -> 200 discount 100', pctVal.status === 200 && closeEnough(pctVal.data.data.discountAmount, 100), pctVal.data);

  const fixedVal = await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'BVF100', subtotal: 1000 } });
  check('B2 valid fixed coupon -> 200 discount 100', fixedVal.status === 200 && closeEnough(fixedVal.data.data.discountAmount, 100), fixedVal.data);

  const invVal = await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'NOTACOUPON', subtotal: 1000 } });
  check('B3 invalid coupon -> 404', invVal.status === 404, invVal.data);

  await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'EXPIRED10', discountType: 'percentage', discountValue: 10, expiryDate: new Date(Date.now() - 86400000).toISOString() } });
  const expVal = await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'EXPIRED10', subtotal: 1000 } });
  check('B4 expired coupon -> 400', expVal.status === 400, expVal.data);

  await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'FUTURE10', discountType: 'percentage', discountValue: 10, startDate: new Date(Date.now() + 86400000).toISOString() } });
  const futVal = await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'FUTURE10', subtotal: 1000 } });
  check('B5 future coupon -> 400 (not yet active)', futVal.status === 400, futVal.data);

  await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'INACTIVE5', discountType: 'percentage', discountValue: 5, status: 'inactive' } });
  const inactVal = await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'INACTIVE5', subtotal: 1000 } });
  check('B6 inactive coupon -> 400', inactVal.status === 400, inactVal.data);

  const minFail = await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'BV10', subtotal: 300 } });
  check('B7 min-order fail (300 < 500) -> 400', minFail.status === 400, minFail.data);

  const minPass = await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'BV10', subtotal: 600 } });
  check('B8 min-order pass (600 >= 500) -> 200', minPass.status === 200, minPass.data);

  const maxCap = await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'BV10', subtotal: 3000 } });
  check('B9 maximum discount cap 150 (10% of 3000 capped at 150)', maxCap.status === 200 && closeEnough(maxCap.data.data.discountAmount, 150), maxCap.data);

  // 10. usage limit
  await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'ONLYONCE', discountType: 'percentage', discountValue: 10, usageLimit: 1 } });
  const ul1 = await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'ONLYONCE', subtotal: 1000 } });
  check('B10a usage-limit coupon valid first try (200)', ul1.status === 200, ul1.data);
  await Coupon.findOneAndUpdate({ code: 'ONLYONCE' }, { $set: { usedCount: 1 } });
  const ul2 = await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'ONLYONCE', subtotal: 1000 } });
  check('B10b usage-limit exhausted coupon -> 400', ul2.status === 400, ul2.data);
  await Coupon.findOneAndUpdate({ code: 'ONLYONCE' }, { $set: { usedCount: 0 } });

  // 11. percentage > 100 rejected
  const hov = await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'OLDPCT', discountType: 'percentage', discountValue: 101 } });
  check('A11 percentage >100 rejected (422) at create', hov.status === 422, hov.data);

  // Coupon validation requires customer auth
  const noTokVal = await api('POST', '/coupon/validate', { body: { code: 'WELCOME10', subtotal: 1000 } });
  check('B11 missing customer token on validate -> 401', noTokVal.status === 401, noTokVal.data);
  const badTokVal = await api('POST', '/coupon/validate', { token: 'garbage', body: { code: 'WELCOME10', subtotal: 1000 } });
  check('B12 invalid customer token -> 401', badTokVal.status === 401, badTokVal.data);

  /* ============ C. VALIDATION MUST NOT CONSUME USAGE ============ */
  console.log('\n=== C. VALIDATION MUST NOT CONSUME USAGE ===');

  const freshLimited = await Coupon.create({ code: 'LIMTEST10', discountType: 'percentage', discountValue: 10, usageLimit: 5 });
  check('C1 fresh coupon usedCount = 0', freshLimited.usedCount === 0, freshLimited.usedCount);
  for (let i = 0; i < 3; i++) {
    await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'LIMTEST10', subtotal: 1000 } });
  }
  const afterVal = await Coupon.findOne({ code: 'LIMTEST10' });
  check('C2 validation x3 -> usedCount still 0', !!afterVal && afterVal.usedCount === 0, afterVal && afterVal.usedCount);

  /* ============ D. CHECKOUT / ORDER CREATION ============ */
  console.log('\n=== D. CHECKOUT / ORDER CREATION ===');

  // D1: percent coupon on a real order (subtotal 5000 -> 10% = 500)
  const checkedUser = await seedUser('retail');
  const checkedTok = custToken(checkedUser);
  const checkedProd = await seedProduct(2500, category0);
  await seedCart(checkedUser._id, checkedProd, 2); // 5000

  const coCheck = await api('POST', '/checkout/validate', {
    token: checkedTok,
    body: Object.assign({}, DELIVERY, { couponCode: 'WELCOME10' })
  });
  check('D1 checkout validate with coupon -> 200', coCheck.status === 200, coCheck.data);
  const coCheckPricing = coCheck.data && coCheck.data.data && coCheck.data.data.pricing;
  // subtotal 5000, min cut 500 met, coupon 10% x 5000 = 500 (cap 150? No — cap is maximumDiscount=150)
  // So with WELCOME10 (max 150), discount = 150 not 500. Use SAVE100 or a separate coupon for a clean 10%.
  check('D1b coupon discount for WELCOME10 capped at maxDiscount 150',
    !!coCheckPricing && closeEnough(coCheckPricing.couponDiscount, 150), coCheckPricing);

  // Create an uncapped percentage coupon explicitly for order tests.
  await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'P10', discountType: 'percentage', discountValue: 10 } });

  const coCreate = await api('POST', '/checkout', {
    token: checkedTok,
    body: Object.assign({}, DELIVERY, { couponCode: 'p10' }) // lowercase should normalize
  });
  check('D2 order with coupon -> 201', coCreate.status === 201, coCreate.data);
  const coPricing = coCreate.data && coCreate.data.data && coCreate.data.data.pricing;
  const coOrder = coCreate.data && coCreate.data.data && coCreate.data.data.order;
  check('D2b stored pricing.couponDiscount = 500', !!coPricing && closeEnough(coPricing.couponDiscount, 500), coPricing);
  check('D2c stored pricing.total = 4500', !!coPricing && closeEnough(coPricing.total, 4500), coPricing);
  check('D2d stored order.couponCode = P10 (normalized uppercase)', !!coOrder && coOrder.couponCode === 'P10', coOrder);

  const afterUsage = await Coupon.findOne({ code: 'P10' });
  check('D2e usage incremented exactly once', !!afterUsage && afterUsage.usedCount === 1, afterUsage && afterUsage.usedCount);

  /* ============ E. DOUBLE-APPLICATION ============ */
  console.log('\n=== E. DOUBLE-APPLICATION ===');

  // repeated validation does not double count or double apply
  for (let i = 0; i < 3; i++) {
    await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'P10', subtotal: 5000 } });
  }
  const afterReVal = await Coupon.findOne({ code: 'P10' });
  check('E1 repeated validation does not increment usage (still 1)', !!afterReVal && afterReVal.usedCount === 1, afterReVal && afterReVal.usedCount);

  // Second order: apply once only, discount 10% of (subtotal) not double
  const checked2User = await seedUser('retail');
  const checked2Tok = custToken(checked2User);
  const checked2Prod = await seedProduct(2000, category0);
  await seedCart(checked2User._id, checked2Prod, 1); // 2000 -> 10% = 200
  const co2 = await api('POST', '/checkout', {
    token: checked2Tok,
    body: Object.assign({}, DELIVERY, { couponCode: 'P10' })
  });
  const co2Pricing = co2.data && co2.data.data && co2.data.data.pricing;
  check('E2 coupon not double-applied (discount 200, total 1800)',
    co2.status === 201 && !!co2Pricing && closeEnough(co2Pricing.couponDiscount, 200) && closeEnough(co2Pricing.total, 1800), co2.data);

  /* ============ F. FAILED ORDER DOES NOT CONSUME USAGE ============ */
  console.log('\n=== F. FAILED ORDER DOES NOT CONSUME USAGE ===');

  const fCoup = await Coupon.create({ code: 'FAILONCE', discountType: 'percentage', discountValue: 10, usageLimit: 1 });
  check('F1 initial usedCount = 0', fCoup.usedCount === 0, fCoup.usedCount);

  const fUser = await seedUser('retail');
  const fTok = custToken(fUser);
  const fLowProd = await seedProduct(1000, category0);
  await seedCart(fUser._id, fLowProd, 1);

  const fFail = await api('POST', '/checkout', {
    token: fTok,
    body: Object.assign({}, DELIVERY, { couponCode: 'FAILONCE' })
  });
  check('F2 order below retail min rejected (400)', fFail.status >= 400, fFail.data);
  const fAfterFail = await Coupon.findOne({ code: 'FAILONCE' });
  check('F3 failed order does NOT consume usage (still 0)', !!fAfterFail && fAfterFail.usedCount === 0, fAfterFail && fAfterFail.usedCount);

  const fOkProd = await seedProduct(3000, category0);
  // Replace the existing cart contents (Cart.user has a unique index — do not create a second cart).
  const fCart = await Cart.findOne({ user: fUser._id });
  if (fCart) {
    fCart.items = [{ itemType: 'PRODUCT', product: fOkProd._id, name: fOkProd.name, price: fOkProd.price, quantity: 1 }];
    await fCart.save();
  } else {
    await seedCart(fUser._id, fOkProd, 1);
  }
  const fOk = await api('POST', '/checkout', {
    token: fTok,
    body: Object.assign({}, DELIVERY, { couponCode: 'FAILONCE' })
  });
  check('F4 successful order with coupon -> 201', fOk.status === 201, fOk.data);
  const fAfterOk = await Coupon.findOne({ code: 'FAILONCE' });
  check('F5 successful order consumes usage exactly once (1)', !!fAfterOk && fAfterOk.usedCount === 1, fAfterOk && fAfterOk.usedCount);

  const otherUser = await seedUser('retail');
  const otherTok = custToken(otherUser);
  const fExhausted = await api('POST', '/coupon/validate', { token: otherTok, body: { code: 'FAILONCE', subtotal: 5000 } });
  check('F6 consumed coupon rejected on next validation (400)', fExhausted.status === 400, fExhausted.data);

  /* ============ G. PRICING REGRESSION (no coupon) ============ */
  console.log('\n=== G. PRICING REGRESSION (no coupon) ===');

  const g1User = await seedUser('retail');
  const g1Tok = custToken(g1User);
  const g1Prod = await seedProduct(2000, category0);
  await seedCart(g1User._id, g1Prod, 1);
  const g1 = await api('POST', '/checkout', { token: g1Tok, body: Object.assign({}, DELIVERY) });
  const g1p = g1.data && g1.data.data && g1.data.data.pricing;
  check('G1 retail no-coupon total = 2000, discount 0', g1.status === 201 && !!g1p && closeEnough(g1p.total, 2000) && closeEnough(g1p.discount, 0), g1.data);

  const g2User = await seedUser('wholesale');
  const g2Tok = custToken(g2User);
  const g2Prod = await seedProduct(30000, category0);
  await seedCart(g2User._id, g2Prod, 3);
  const g2 = await api('POST', '/checkout', { token: g2Tok, body: Object.assign({}, DELIVERY) });
  const g2p = g2.data && g2.data.data && g2.data.data.pricing;
  check('G2 wholesale 90,000 -> 5% discount 4,500', g2.status === 201 && !!g2p && closeEnough(g2p.wholesaleDiscountAmount, 4500), g2.data);

  const g3User = await seedUser('retail');
  const g3Tok = custToken(g3User);
  const g3Prod = await seedProduct(2500, category10);
  await seedCart(g3User._id, g3Prod, 1);
  const g3 = await api('POST', '/checkout/validate', { token: g3Tok, body: Object.assign({}, DELIVERY) });
  const g3p = g3.data && g3.data.data && g3.data.data.pricing;
  check('G3 category 10% still applies (subtotal 2250)', g3.status === 200 && !!g3p && closeEnough(g3p.subtotal, 2250), g3.data);

  const g4User = await seedUser('retail');
  await seedCompletedOrders(g4User._id, 1);
  const g4Tok = custToken(g4User);
  const g4Prod = await seedProduct(2500, category0);
  await seedCart(g4User._id, g4Prod, 1);
  const g4 = await api('POST', '/checkout/validate', { token: g4Tok, body: Object.assign({}, DELIVERY) });
  const g4Summary = g4.data && g4.data.data;
  check('G4 second-order 3% (discount 75)', g4.status === 200 && !!g4Summary && closeEnough(g4Summary.secondOrderDiscountAmount, 75), g4.data);

  const g5User = await seedUser('retail');
  await seedCompletedOrders(g5User._id, 3);
  const g5Tok = custToken(g5User);
  const g5Prod = await seedProduct(2500, category0);
  await seedCart(g5User._id, g5Prod, 1);
  const g5 = await api('POST', '/checkout/validate', { token: g5Tok, body: Object.assign({}, DELIVERY) });
  const g5Summary = g5.data && g5.data.data;
  check('G5 membership silver 4% (membershipDiscountPercent=4)', g5.status === 200 && !!g5Summary && Number(g5Summary.membershipDiscountPercent) === 4, g5.data);

  const g6User = await seedUser('retail');
  const g6Tok = custToken(g6User);
  const g6Prod = await seedProduct(2500, category0);
  await seedCart(g6User._id, g6Prod, 1);
  const g6 = await api('POST', '/checkout/validate', { token: g6Tok, body: Object.assign({}, DELIVERY) });
  const g6Summary = g6.data && g6.data.data;
  check('G6 non-referred retail -> referralDiscountAmount 0', g6.status === 200 && !!g6Summary && closeEnough(g6Summary.referralDiscountAmount, 0), g6.data);

  check('G7a retail minimum still 2000', MINIMUM_ONLINE_ORDER_AMOUNT === 2000);
  check('G7b wholesale minimum still 50000', WHOLESALE_MIN_ORDER_AMOUNT === 50000);

  const tierL = [50000, 100000, 250000.01, 600000.01].map((a) => getWholesaleTier(a).discountPercent);
  check('G8 wholesale tiers unchanged (5/7.5/12/15)', JSON.stringify(tierL) === JSON.stringify([5, 7.5, 12, 15]), tierL);

  // G9 delivery charge: above threshold free, below threshold flat charge
  const g9User = await seedUser('retail');
  const g9Tok = custToken(g9User);
  const g9Prod = await seedProduct(2100, category0);
  await seedCart(g9User._id, g9Prod, 1); // 2100 >= 2000 retail min, >= free threshold (1000)
  const g9 = await api('POST', '/checkout/validate', { token: g9Tok, body: Object.assign({}, DELIVERY) });
  const g9p = g9.data && g9.data.data && g9.data.data.pricing;
  check('G9a above deliver threshold (2100 >= 1000) -> delivery 0', g9.status === 200 && !!g9p && closeEnough(g9p.deliveryCharge, 0), g9.data);

  await api('PUT', '/admin/settings', { token: adminToken, body: { deliveryCharge: 49, freeDeliveryThreshold: 99999 } });
  const g9b = await api('POST', '/checkout/validate', { token: g9Tok, body: Object.assign({}, DELIVERY) });
  const g9bp = g9b.data && g9b.data.data && g9b.data.data.pricing;
  check('G9b below threshold (2100 < 99999) -> delivery 49', g9b.status === 200 && !!g9bp && closeEnough(g9bp.deliveryCharge, 49), g9b.data);
  await api('PUT', '/admin/settings', { token: adminToken, body: { deliveryCharge: 49, freeDeliveryThreshold: 1000 } });

  /* ============ H. GST / TAX (INCLUSIVE) REGRESSION ============ */
  console.log('\n=== H. GST / TAX REGRESSION ===');

  const gstUnit = calculatePricing([{ price: 1000, quantity: 1 }], { deliveryCharge: 0, freeDeliveryThreshold: 1000, gstPercent: 18 }, {});
  check('H1 calculatePricing keeps gst = 0 (tax-inclusive)', gstUnit.gst === 0, gstUnit);
  check('H2 total = 1000, no extra 18% added (1000, not 1180)', gstUnit.total === 1000, gstUnit);

  const gstCoupon = calculatePricing([{ price: 1000, quantity: 1 }], { deliveryCharge: 0, freeDeliveryThreshold: 1000, gstPercent: 18 }, { couponDiscount: 100 });
  check('H3 coupon keeps gst = 0 and total = subtotal - coupon (900)', gstCoupon.gst === 0 && gstCoupon.total === 900, gstCoupon);

  const hUser = await seedUser('retail');
  const hTok = custToken(hUser);
  const hProd = await seedProduct(3000, category0);
  await seedCart(hUser._id, hProd, 1);
  const hOrder = await api('POST', '/checkout', { token: hTok, body: Object.assign({}, DELIVERY, { couponCode: 'P10' }) });
  const hPricing = hOrder.data && hOrder.data.data && hOrder.data.data.pricing;
  check('H4 real coupon order stores gst = 0 (no added GST charge)', hOrder.status === 201 && !!hPricing && closeEnough(hPricing.gst, 0), hOrder.data);

  /* ============ I. COUPON + EXISTING DISCOUNTS ORDERING ============ */
  console.log('\n=== I. COUPON + EXISTING DISCOUNT ORDERING ===');

  // Applied order: category -> (loyalty/referral for retail) -> coupon -> delivery.
  // Category 10% on 5000 => subtotal 4500; coupon 10% of 4500 = 450; total 4050.
  const iUser = await seedUser('retail');
  const iTok = custToken(iUser);
  const iProd = await seedProduct(5000, category10);
  await seedCart(iUser._id, iProd, 1);
  const iCheck = await api('POST', '/checkout/validate', { token: iTok, body: Object.assign({}, DELIVERY, { couponCode: 'P10' }) });
  const iP = iCheck.data && iCheck.data.data;
  check('I1 category 10% then coupon 10%: subtotal 4500, coupon 450, total 4050',
    iCheck.status === 200 && !!iP && closeEnough(iP.pricing.subtotal, 4500) && closeEnough(iP.pricing.couponDiscount, 450) && closeEnough(iP.pricing.total, 4050), iCheck.data);

  // Second-order loyalty + coupon: 3% loyalty then coupon on the remainder.
  const i2User = await seedUser('retail');
  await seedCompletedOrders(i2User._id, 1);
  const i2Tok = custToken(i2User);
  const i2Prod = await seedProduct(3000, category0);
  await seedCart(i2User._id, i2Prod, 1);
  const i2Check = await api('POST', '/checkout/validate', { token: i2Tok, body: Object.assign({}, DELIVERY, { couponCode: 'P10' }) });
  const i2P = i2Check.data && i2Check.data.data;
  // second-order 3% = 90 (top-level summary), pre-coupon payable 2910, coupon 291, total 2619
  check('I2 second-order 3% then coupon 10%: total 2619 (2910 - 291)',
    i2Check.status === 200 && !!i2P && closeEnough(i2P.secondOrderDiscountAmount, 90) && closeEnough(i2P.pricing.couponDiscount, 291) && closeEnough(i2P.pricing.total, 2619), i2Check.data);

  /* ============ J. SECURITY / TRUST ============ */
  console.log('\n=== J. SECURITY / FRONTEND-VALUE TRUST ===');

  // J1: frontend-sent discounted total / couponDiscount are ignored; backend recomputes.
  const j1User = await seedUser('retail');
  const j1Tok = custToken(j1User);
  const j1Pre = await Coupon.findOne({ code: 'P10' });
  const j1Prod = await seedProduct(4000, category0);
  await seedCart(j1User._id, j1Prod, 1);
  const j1 = await api('POST', '/checkout', {
    token: j1Tok,
    body: Object.assign({}, DELIVERY, { couponCode: 'P10', couponDiscount: 1, total: 999, pricing: 0 })
  });
  const j1P = j1.data && j1.data.data && j1.data.data.pricing;
  check('J1 backend recomputes couponDiscount (400) ignoring client 1/999', j1.status === 201 && !!j1P && closeEnough(j1P.couponDiscount, 400), j1.data);

  const j1Doc = await Coupon.findOne({ code: 'P10' });
  check('J1b usage incremented by exactly 1 for this order',
    !!j1Doc && !!j1Pre && j1Doc.usedCount === j1Pre.usedCount + 1, { before: j1Pre && j1Pre.usedCount, after: j1Doc && j1Doc.usedCount });

  const j2 = await api('POST', '/coupon/validate', { body: { code: 'P10', subtotal: 1000 } });
  check('J2 unauthenticated coupon validate -> 401', j2.status === 401, j2.data);

  const j3 = await api('GET', '/admin/coupons', { token: customerToken });
  check('J3 customer token on admin coupons -> 403', j3.status === 403, j3.data);

  const j4Coupon = await Coupon.findOne({ code: 'P10' });
  const j4 = await api('GET', '/admin/coupons/' + (j4Coupon && j4Coupon._id), { token: customerToken });
  check('J4 customer token on admin coupon detail -> 403', j4.status === 403, j4.data);

  const j5 = await api('POST', '/coupon/validate', { token: customerToken, body: { code: 'P10', subtotal: 1000 } });
  check('J5 coupon validate uses token identity (200)', j5.status === 200, j5.data);

  /* ============ K. EXACT REPORTED SCENARIOS (Phase 6 fix verification) ============ */
  console.log('\n=== K. EXACT REPORTED SCENARIOS ===');

  // K1/K2 — FIXED ₹100 coupon: subtotal 5500, second-order 3% = 165,
  //        pre-coupon payable 5335, coupon 100, final total 5235.
  await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'KSAVE100', discountType: 'fixed', discountValue: 100, minimumOrderAmount: 500 } });
  const k1User = await seedUser('retail');
  await seedCompletedOrders(k1User._id, 1); // exactly 1 completed order -> second-order 3%
  const k1Tok = custToken(k1User);
  const k1Prod = await seedProduct(5500, category0);
  await seedCart(k1User._id, k1Prod, 1);

  const k1Val = await api('POST', '/coupon/validate', { token: k1Tok, body: { code: 'KSAVE100', subtotal: 5335 } });
  check('K1 /coupon/validate returns discountAmount 100 for SAVE100-style fixed coupon',
    k1Val.status === 200 && closeEnough(k1Val.data.data.discountAmount, 100), k1Val.data);

  const k1Check = await api('POST', '/checkout/validate', { token: k1Tok, body: Object.assign({}, DELIVERY, { couponCode: 'KSAVE100' }) });
  const k1P = k1Check.data && k1Check.data.data;
  check('K1b checkout/validate: subtotal 5500, second-order 165, coupon 100, total 5235',
    k1Check.status === 200 && !!k1P && closeEnough(k1P.pricing.subtotal, 5500) && closeEnough(k1P.secondOrderDiscountAmount, 165) && closeEnough(k1P.pricing.couponDiscount, 100) && closeEnough(k1P.pricing.total, 5235), k1Check.data);

  const k1Order = await api('POST', '/checkout', { token: k1Tok, body: Object.assign({}, DELIVERY, { couponCode: 'KSAVE100' }) });
  const k1O = k1Order.data && k1Order.data.data;
  check('K2 created order persists coupon 100 and total 5235',
    k1Order.status === 201 && !!k1O && closeEnough(k1O.pricing.couponDiscount, 100) && closeEnough(k1O.pricing.total, 5235), k1Order.data);

  // K3 — PERCENTAGE coupon: pre-coupon payable 5335, 10% coupon = 533.50, final total 4801.50.
  await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'KPCT10', discountType: 'percentage', discountValue: 10 } });
  const k3User = await seedUser('retail');
  await seedCompletedOrders(k3User._id, 1);
  const k3Tok = custToken(k3User);
  const k3Prod = await seedProduct(5500, category0);
  await seedCart(k3User._id, k3Prod, 1);

  const k3Val = await api('POST', '/coupon/validate', { token: k3Tok, body: { code: 'KPCT10', subtotal: 5335 } });
  check('K3 /coupon/validate 10% of 5335 = 533.50', k3Val.status === 200 && closeEnough(k3Val.data.data.discountAmount, 533.50), k3Val.data);

  const k3Check = await api('POST', '/checkout/validate', { token: k3Tok, body: Object.assign({}, DELIVERY, { couponCode: 'KPCT10' }) });
  const k3P = k3Check.data && k3Check.data.data;
  check('K3b checkout/validate: coupon 533.50, total 4801.50',
    k3Check.status === 200 && !!k3P && closeEnough(k3P.pricing.couponDiscount, 533.50) && closeEnough(k3P.pricing.total, 4801.50), k3Check.data);

  // K4 — coupon can NEVER exceed the payable amount (balances stay non-negative).
  await api('POST', '/admin/coupons', { token: adminToken, body: { code: 'KBIG10000', discountType: 'fixed', discountValue: 10000 } });
  const k4User = await seedUser('retail');
  const k4Tok = custToken(k4User);
  const k4Prod = await seedProduct(2000, category0);
  await seedCart(k4User._id, k4Prod, 1);

  const k4Val = await api('POST', '/coupon/validate', { token: k4Tok, body: { code: 'KBIG10000', subtotal: 2000 } });
  check('K4 fixed 10000 on payable 2000->clamped to 2000', k4Val.status === 200 && closeEnough(k4Val.data.data.discountAmount, 2000), k4Val.data);

  const k4Check = await api('POST', '/checkout/validate', { token: k4Tok, body: Object.assign({}, DELIVERY, { couponCode: 'KBIG10000' }) });
  const k4P = k4Check.data && k4Check.data.data;
  check('K4b checkout/validate: coupon 2000, total 0 (never negative)',
    k4Check.status === 200 && !!k4P && closeEnough(k4P.pricing.couponDiscount, 2000) && closeEnough(k4P.pricing.total, 0), k4Check.data);

  // Unit-level guarantees (single source of truth in couponService).
  check('K4c calculateCouponDiscount clamps fixed > payable', couponService.calculateCouponDiscount(500, { discountType: 'fixed', discountValue: 1000 }) === 500);
  check('K4d calculateCouponDiscount never negative on zero payable', couponService.calculateCouponDiscount(0, { discountType: 'fixed', discountValue: 100 }) === 0);
  check('K4e maximum discount cap still honored', couponService.calculateCouponDiscount(5000, { discountType: 'percentage', discountValue: 10, maximumDiscount: 150 }) === 150);

  console.log('\n========================================');
  console.log('PHASE 6 COUPON TEST RESULTS: ' + passed + ' passed, ' + failed + ' failed');
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