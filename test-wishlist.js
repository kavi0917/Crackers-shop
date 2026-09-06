/* ============================================================
   VENDHAN CRACKERS — WISHLIST API Test (Phase 2)
   Run: node test-wishlist.js

   DB SAFETY:
     - Uses mongodb://localhost:27017/vendhan_crackers_wishlist_test
       (disposable scratch database).
     - Drops the scratch database when finished.
     - The production DB (vendhan_crackers) is NEVER touched.
     - The app is started in-process on an ephemeral port — the already
       running dev server on :5000 is never used or disturbed.

   Covers: auth, empty wishlist, add, duplicate prevention, remove,
   multiple items, per-customer isolation, invalid/nonexistent product,
   unauthorized/expired/admin-token rejection, add-to-cart reuse,
   out-of-stock, live pricing (no stale snapshots), cart/pricing intact.
   ============================================================ */

const path = require('path');
const mongoose = require('./backend/node_modules/mongoose');
const jwt = require('./backend/node_modules/jsonwebtoken');
require('./backend/node_modules/dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const SCRATCH_MONGODB_URI = 'mongodb://localhost:27017/vendhan_crackers_wishlist_test';

const { Category, Product, Setting, Wishlist } = require('./backend/models');
const app = require('./backend/app');

let passed = 0;
let failed = 0;

function check(name, cond, extra) {
  if (cond) { passed++; console.log('  ✅ ' + name); }
  else { failed++; console.log('  ❌ ' + name + (extra ? ' — ' + fmtExtra(extra) : '')); }
}

function fmtExtra(extra) {
  try { return JSON.stringify(extra).slice(0, 300); } catch (e) { return String(extra); }
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

let seq = 0;

async function createCategory() {
  seq++;
  return Category.create({ name: 'Wishlist Cat ' + seq, discount: 10, status: 'active' });
}

async function createProduct(category, { price = 500, stock = 100, status = 'active', discount = 10 } = {}) {
  seq++;
  // Mirror the admin flow: admin enters the ORIGINAL price; the selling price
  // is the derived original × (1 − category discount). Store both exactly like
  // the real product creation pipeline does.
  const originalPrice = price;
  const sellingPrice = Math.round(originalPrice * (1 - discount / 100) * 100) / 100;
  return Product.create({
    name: 'Wishlist Product ' + seq,
    category: category._id,
    originalPrice,
    price: sellingPrice,
    discount,
    stock,
    status,
    images: ['/uploads/test-' + seq + '.webp']
  });
}

async function main() {
  console.log('========== WISHLIST (Phase 2) ==========\n');

  await mongoose.connect(SCRATCH_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase(); // start clean

  server = app.listen(0);
  const port = server.address().port;
  BASE = 'http://127.0.0.1:' + port + '/api';
  console.log(`In-process server on :${port} against scratch DB '${mongoose.connection.name}'\n`);

  // Seed the SINGLE settings doc the shop's cart/checkout services expect
  // (same pattern as test-retail-order-summary.js / test-wholesale-discount-flow.js).
  await Setting.create({
    shopName: 'Vendhan Crackers Wishlist Test',
    phone: '9876500999',
    email: 'wishlist-shop@example.com',
    address: '1 Wishlist Test Street, Chennai',
    deliveryCharge: 49,
    freeDeliveryThreshold: 1000,
    minimumOrderAmount: 2000
  });

/* ---- Seed products ---- */
  const cat = await createCategory();
  const pStock = await createProduct(cat, { price: 800, stock: 50 });   // in-stock product
  const pZero = await createProduct(cat, { price: 300, stock: 0 });     // out-of-stock product

  /* ---- Register two customers (real JWT flow) ---- */
  const regA = await api('POST', '/auth/register', { body: { name: 'Wishlist A', email: 'wishlistA@example.com', phone: '9200000001', password: 'strongpass123' } });
  const regB = await api('POST', '/auth/register', { body: { name: 'Wishlist B', email: 'wishlistB@example.com', phone: '9200000002', password: 'strongpass123' } });
  check('Customer A registration succeeds (201)', regA.status === 201, regA.data);
  check('Customer B registration succeeds (201)', regB.status === 201, regB.data);
  const tokenA = regA.data && regA.data.data && regA.data.data.token;
  const tokenB = regB.data && regB.data.data && regB.data.data.token;
  const userAId = regA.data && regA.data.data && regA.data.data.user && regA.data.data.user._id;
  check('Registration returns a customer token', typeof tokenA === 'string' && tokenA.length > 20);

  console.log('\n--- 1. AUTHENTICATION ---');
  check('GET /api/wishlist without token → 401 (unauthorized)', (await api('GET', '/wishlist')).status === 401);
  const adminToken = jwt.sign({ id: new mongoose.Types.ObjectId(), role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  check('Admin token on wishlist API → 403 (customer auth required)', (await api('GET', '/wishlist', { token: adminToken })).status === 403);
  const expiredToken = jwt.sign({ id: new mongoose.Types.ObjectId(), role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
  check('Expired customer token → 401', (await api('GET', '/wishlist', { token: expiredToken })).status === 401);
  const malformedToken = jwt.sign({ id: new mongoose.Types.ObjectId(), role: 'customer' }, 'wrong-secret-key', { expiresIn: '5m' });
  check('Token signed with wrong secret → 401', (await api('GET', '/wishlist', { token: malformedToken })).status === 401);

  console.log('\n--- 2. EMPTY WISHLIST ---');
  const empty = await api('GET', '/wishlist', { token: tokenA });
  check('Authenticated customer can fetch wishlist (200)', empty.status === 200, empty.data);
  check('Empty wishlist returns items [] and count 0', Array.isArray(empty.data.data.items) && empty.data.data.items.length === 0 && empty.data.data.count === 0);

  console.log('\n--- 3. ADD VALID PRODUCT ---');
  const add1 = await api('POST', '/wishlist', { token: tokenA, body: { productId: String(pStock._id) } });
  check('POST valid product → 201', add1.status === 201, add1.data);
  const afterAdd = await api('GET', '/wishlist', { token: tokenA });
  check('Product appears in wishlist (count 1, productId matches)',
    afterAdd.data.data.count === 1 && String(afterAdd.data.data.items[0].productId) === String(pStock._id));

  console.log('\n--- 4. LIVE PRODUCT DATA (no stale snapshots) ---');
  // Change the product's prices directly in the DB AFTER it was wishlisted
  // (original ₹1000 → derived selling ₹900 at the 10% category discount).
  pStock.originalPrice = 1000;
  pStock.price = 900;
  await pStock.save();
  const live = await api('GET', '/wishlist', { token: tokenA });
  const liveItem = live.data.data.items[0];
  check('Wishlist shows the CURRENT product price (900, not the 720 at add time)', Number(liveItem.product.finalPrice) === 900 && Number(liveItem.product.price) === 900, liveItem.product);
  check('Wishlist shows current name/stock/status from Product data', liveItem.product.name === pStock.name && Number(liveItem.product.stock) === 50 && liveItem.product.status === 'active');
  check('Wishlist item exposes availability flag', liveItem.available === true);

  console.log('\n--- 5. DUPLICATE PREVENTION ---');
  const dup = await api('POST', '/wishlist', { token: tokenA, body: { productId: String(pStock._id) } });
  check('Add same product twice → 409 already in wishlist', dup.status === 409, dup.data);
  const afterDup = await api('GET', '/wishlist', { token: tokenA });
  check('Duplicate add did not create a second entry (count still 1)', afterDup.data.data.count === 1);
  let dbDupRejected = false;
  try {
    await Wishlist.create({ user: userAId, product: pStock._id });
  } catch (e) {
    dbDupRejected = e && (e.code === 11000);
  }
  check('DB-level unique index rejects duplicate user+product', dbDupRejected);

  console.log('\n--- 6. ADD MULTIPLE PRODUCTS ---');
  const add2 = await api('POST', '/wishlist', { token: tokenA, body: { productId: String(pZero._id) } });
  check('Add out-of-stock product to wishlist → 201 (save-for-later is allowed)', add2.status === 201, add2.data);
  const multi = await api('GET', '/wishlist', { token: tokenA });
  check('Multiple products in wishlist (count 2)', multi.data.data.count === 2, multi.data.data);
  const ids = multi.data.data.items.map((it) => String(it.productId)).sort();
  check('Both wishlisted product ids present', ids.includes(String(pStock._id)) && ids.includes(String(pZero._id)));

  console.log('\n--- 7. OUT-OF-STOCK STATE ---');
  const zeroItem = multi.data.data.items.find((it) => String(it.productId) === String(pZero._id));
  check('Out-of-stock product shows current out_of_stock state', zeroItem.product.stock === 0 && zeroItem.product.stockStatus === 'out_of_stock');
  const cartZero = await api('POST', '/cart/items', { token: tokenA, body: { productId: String(pZero._id), quantity: 1 } });
  check('Existing cart API rejects out-of-stock add (409)', cartZero.status === 409, cartZero.data);

  console.log('\n--- 8. CUSTOMER ISOLATION ---');
  const listB = await api('GET', '/wishlist', { token: tokenB });
  check('Customer B cannot see Customer A wishlist (own wishlist is empty)', listB.data.data.count === 0 && listB.data.data.items.length === 0);
  const delByB = await api('DELETE', '/wishlist/' + String(pStock._id), { token: tokenB });
  check('Customer B cannot remove Customer A item → 404 (ownership enforced)', delByB.status === 404, delByB.data);

  console.log('\n--- 9. INVALID / NONEXISTENT PRODUCT ---');
  const badId = await api('POST', '/wishlist', { token: tokenA, body: { productId: 'not-a-mongo-id' } });
  check('Invalid product ID rejected (422)', badId.status === 422, badId.data);
  const badDel = await api('DELETE', '/wishlist/not-a-mongo-id', { token: tokenA });
  check('Invalid product ID in DELETE rejected (422)', badDel.status === 422, badDel.data);
  const ghost = await api('POST', '/wishlist', { token: tokenA, body: { productId: String(new mongoose.Types.ObjectId()) } });
  check('Nonexistent product rejected (404)', ghost.status === 404, ghost.data);

  console.log('\n--- 10. REMOVE ---');
  const removeZero = await api('DELETE', '/wishlist/' + String(pZero._id), { token: tokenA });
  check('Remove product from wishlist → 200', removeZero.status === 200, removeZero.data);
  const afterRemove = await api('GET', '/wishlist', { token: tokenA });
  check('Removed product disappears (count 1, pZero gone)',
    afterRemove.data.data.count === 1 && !afterRemove.data.data.items.some((it) => String(it.productId) === String(pZero._id)));
  const removeAgain = await api('DELETE', '/wishlist/' + String(pZero._id), { token: tokenA });
  check('Removing an already-removed item → 404', removeAgain.status === 404, removeAgain.data);

  console.log('\n--- 11. ADD TO CART REUSES EXISTING CART API ---');
  const cartAdd = await api('POST', '/cart/items', { token: tokenA, body: { productId: String(pStock._id), quantity: 2 } });
  check('Add-to-cart from a wishlisted product works (200)', cartAdd.status === 200, cartAdd.data);
  const cart = await api('GET', '/cart', { token: tokenA });
  const cartItem = cart.data.data.items.find((it) => String(it.productId) === String(pStock._id));
  check('Cart contains the wishlisted product with quantity 2', !!cartItem && cartItem.quantity === 2);
  check('Cart pricing still uses backend-authoritative current price (900 × 2 = 1800)',
    cartItem && Math.round(cartItem.subtotal * 100) / 100 === 1800, cartItem);

  console.log('\n--- 12. EXISTING CART / PRICING INTACT ---');
  check('Cart data still exposes full pricing shape (afterCategoryPrice, discount, stockStatus, subtotal)',
    !!cartItem && 'afterCategoryPrice' in cartItem && 'discount' in cartItem && 'stockStatus' in cartItem && 'subtotal' in cartItem);
  const cartSummary = await api('GET', '/cart', { token: tokenB });
  check('Unaffected user cart still loads (200)', cartSummary.status === 200);
  check('Wishlist ops never changed Customer B cart (still empty)', cartSummary.data.data.items.length === 0);

  console.log('\n--- 13. DELETED PRODUCT HANDLED GRACEFULLY ---');
  const ghostCat = await createCategory();
  const ghostProd = await createProduct(ghostCat, { price: 250 });
  await api('POST', '/wishlist', { token: tokenA, body: { productId: String(ghostProd._id) } });
  await Product.findByIdAndDelete(ghostProd._id);
  const afterGhost = await api('GET', '/wishlist', { token: tokenA });
  const ghostItem = afterGhost.data.data.items.find((it) => it.deleted === true && !it.product);
  check('Wishlist API handles a deleted product gracefully (200, deleted flag, no crash)',
    afterGhost.status === 200 && !!ghostItem && ghostItem.deleted === true, afterGhost.data.data);
  await Wishlist.deleteOne({ user: userAId, product: ghostProd._id });

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