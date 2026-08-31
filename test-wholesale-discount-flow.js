/* ============================================================
   VENDHAN CRACKERS — Wholesale Discount END-TO-END FLOW Test
   Runs against a SCRATCH database (never the production DB).

   Verifies the FULL pricing flow for wholesale customers:
     Cart API (cartService.loadCart)
     → checkout validate (checkoutService.validateCheckout)
     → order creation (checkoutService.createOrder) + persisted Order

   Covers:
     - Wholesale ₹49,999 rejected / ₹50,000, ₹51,000, ₹80,000, ₹180,000 tiers
     - Category discount applied BEFORE wholesale discount
     - Retail regression (no wholesale discount; ₹2,000 minimum)
     - GST stays 0 everywhere ("Inclusive of all taxes")
     - Backend is authoritative: cart response, checkout summary, and the
       created Order all carry the SAME discount / total.

   DB SAFETY:
     - Uses mongodb://localhost:27017/vendhan_crackers_wholesale_fix_test
     - Drops the scratch database when finished.
     - The production DB (vendhan_crackers) is NEVER touched.

   Run: node test-wholesale-discount-flow.js
   ============================================================ */

const mongoose = require('./backend/node_modules/mongoose');
const assert = require('assert');

const SCRATCH_MONGODB_URI =
  'mongodb://localhost:27017/vendhan_crackers_wholesale_fix_test';

const { User, Product, Category, Cart, Order, Setting } = require('./backend/models');
const cartService = require('./backend/services/cartService');
const checkoutService = require('./backend/services/checkoutService');

const VALID_DELIVERY = {
  name: 'Test Buyer',
  phone: '9876543210',
  email: 'ws-flow@example.com',
  address: '1 Integration Test Street',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001'
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✅ ' + name);
  } catch (e) {
    failed++;
    console.log('  ❌ ' + name + ' — ' + e.message);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  ✅ ' + name);
  } catch (e) {
    failed++;
    console.log('  ❌ ' + name + ' — ' + e.message);
  }
}

/* ---------- Scratch-DB helpers ---------- */

let seq = 0;

async function createUser(customerType) {
  seq++;
  return User.create({
    name: 'Flow Test User ' + seq,
    email: 'wsflow' + seq + '@example.com',
    phone: String(9000000000 + seq),
    password: 'strongpass123',
    customerType,
    status: 'active'
  });
}

async function createCategory(discountPercent) {
  seq++;
  return Category.create({
    name: 'WS Flow Cat ' + seq,
    discount: discountPercent || 0,
    status: 'active'
  });
}

async function createProduct(price, category, stock) {
  seq++;
  return Product.create({
    name: 'WS Flow Product ' + seq,
    category: category._id,
    price,
    stock: stock || 100000,
    status: 'active'
  });
}

async function createCart(userId, product, quantity) {
  return Cart.create({
    user: userId,
    items: [
      {
        itemType: 'PRODUCT',
        product: product._id,
        name: product.name,
        price: product.price,
        quantity
      }
    ]
  });
}

/* Run one complete wholesale order scenario end-to-end. */
async function runWholesaleOrder(price, categoryDiscount, qty) {
  const category = await createCategory(categoryDiscount);
  const product = await createProduct(price, category);
  const user = await createUser('wholesale');
  await createCart(user._id, product, qty);

  const cart = await cartService.loadCart(user._id);
  const checkout = await checkoutService.validateCheckout(user._id, VALID_DELIVERY);
  const created = await checkoutService.createOrder(user._id, VALID_DELIVERY, 'cod');
  const order = await Order.findById(created.order._id);

  return { cart, checkout, created, order, product, category, user };
}

/* Retail variant (comparable numbers) for the regression check. */
async function runRetailOrder(price, categoryDiscount, qty) {
  const category = await createCategory(categoryDiscount);
  const product = await createProduct(price, category);
  const user = await createUser('retail');
  await createCart(user._id, product, qty);

  const cart = await cartService.loadCart(user._id);
  const checkout = await checkoutService.validateCheckout(user._id, VALID_DELIVERY);
  const created = await checkoutService.createOrder(user._id, VALID_DELIVERY, 'cod');
  const order = await Order.findById(created.order._id);

  return { cart, checkout, created, order, product, category, user };
}
/* ============================================================
   MAIN
   ============================================================ */
async function main() {
  console.log('\n=== WHOLESALE DISCOUNT — END-TO-END FLOW (scratch DB) ===');

  await mongoose.connect(SCRATCH_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase(); // start clean

  // Seed the SINGLE settings doc the shop services expect (delivery free above
  // ₹1,000; retail minimum ₹2,000 — same defaults as the production setup).
  await Setting.create({
    shopName: 'Vendhan Crackers Scratch Test',
    phone: '9876543210',
    email: 'scratch-shop@example.com',
    address: '1 Scratch Test Street, Chennai',
    deliveryCharge: 49,
    freeDeliveryThreshold: 1000,
    minimumOrderAmount: 2000
  });

  console.log('\n--- SETUP ---');
  test('Scratch DB connected and clean', () => {
    assert.strictEqual(mongoose.connection.name, 'vendhan_crackers_wholesale_fix_test');
  });

  /* ---- CASE 1 — Wholesale ₹49,999 -> REJECTED at checkout, no discount ---- */
  console.log('\n--- CASE 1 — Subtotal ₹49,999 (wholesale minimum NOT met) ---');
  await testAsync('Cart: no wholesale discount, minimum flag false, total 49,999', async () => {
    const category = await createCategory(0);
    const product = await createProduct(49999, category);
    const user = await createUser('wholesale');
    await createCart(user._id, product, 1);
    const cart = await cartService.loadCart(user._id);
    assert.strictEqual(cart.customerType, 'wholesale');
    assert.strictEqual(cart.subtotal, 49999);
    assert.strictEqual(cart.wholesaleDiscountAmount, 0);
    assert.strictEqual(cart.discount, 0);
    assert.strictEqual(cart.wholesaleMinAmountMet, false);
    assert.strictEqual(cart.total, 49999);
  });

  await testAsync('Checkout validate REJECTS ₹49,999 with wholesale minimum message', async () => {
    const category = await createCategory(0);
    const product = await createProduct(49999, category);
    const user = await createUser('wholesale');
    await createCart(user._id, product, 1);
    let rejected = false;
    try {
      await checkoutService.validateCheckout(user._id, VALID_DELIVERY);
    } catch (e) {
      rejected = true;
      assert.ok(String(e.message).includes('minimum order amount of ₹50,000'), e.message);
    }
    assert.ok(rejected, 'Expected validateCheckout to reject a below-minimum wholesale order');
  });

  await testAsync('createOrder REJECTS ₹49,999 (no order created)', async () => {
    const category = await createCategory(0);
    const product = await createProduct(49999, category);
    const user = await createUser('wholesale');
    await createCart(user._id, product, 1);
    const ordersBefore = await Order.countDocuments({ user: user._id });
    let rejected = false;
    try {
      await checkoutService.createOrder(user._id, VALID_DELIVERY, 'cod');
    } catch (e) {
      rejected = true;
      assert.ok(String(e.message).includes('minimum order amount of ₹50,000'), e.message);
    }
    assert.ok(rejected, 'Expected createOrder to reject a below-minimum wholesale order');
    const ordersAfter = await Order.countDocuments({ user: user._id });
    assert.strictEqual(ordersAfter, ordersBefore, 'No order may be created for a rejected wholesale order');
  });

  /* ---- CASE 2 — Wholesale ₹50,000 -> tier0 5% = ₹2,500 ---- */
  console.log('\n--- CASE 2 — Subtotal ₹50,000 (5% = ₹2,500) ---');
  await testAsync('Cart, checkout and created order all show ₹2,500 / total ₹47,500', async () => {
    const { cart, checkout, order } = await runWholesaleOrder(50000, 0, 1);

    // Cart (backend-authoritative response)
    assert.strictEqual(cart.subtotal, 50000);
    assert.strictEqual(cart.wholesaleTier, 'tier0');
    assert.strictEqual(cart.wholesaleDiscountPercent, 5);
    assert.strictEqual(cart.wholesaleDiscountAmount, 2500);
    assert.strictEqual(cart.wholesaleMinAmountMet, true);
    assert.strictEqual(cart.discount, 2500);
    assert.strictEqual(cart.total, 47500);

    // Checkout summary
    assert.strictEqual(checkout.pricing.subtotal, 50000);
    assert.strictEqual(checkout.pricing.discount, 2500);
    assert.strictEqual(checkout.wholesaleDiscountAmount, 2500);
    assert.strictEqual(checkout.pricing.gst, 0);
    assert.strictEqual(checkout.pricing.deliveryCharge, 0);
    assert.strictEqual(checkout.pricing.total, 47500);

    // Created order (persisted pricing = same values)
    assert.strictEqual(order.pricing.discount, 2500);
    assert.strictEqual(order.pricing.wholesaleDiscountAmount, 2500);
    assert.strictEqual(order.pricing.gst, 0);
    assert.strictEqual(order.pricing.total, 47500);
  });

  /* ---- CASE 3 — Wholesale ₹51,000 (screenshot scenario) -> 5% = ₹2,550 ---- */
  console.log('\n--- CASE 3 — Subtotal ₹51,000 (5% = ₹2,550; the reported bug) ---');
  await testAsync('Cart, checkout and created order all show ₹2,550 / total ₹48,450', async () => {
    const { cart, checkout, order } = await runWholesaleOrder(3400, 0, 15);

    assert.strictEqual(cart.subtotal, 51000);
    assert.strictEqual(cart.wholesaleDiscountPercent, 5);
    assert.strictEqual(cart.wholesaleDiscountAmount, 2550);
    assert.strictEqual(cart.discount, 2550);
    assert.strictEqual(cart.deliveryCharge, 0);
    assert.strictEqual(cart.total, 48450);

    assert.strictEqual(checkout.pricing.subtotal, 51000);
    assert.strictEqual(checkout.pricing.discount, 2550);
    assert.strictEqual(checkout.pricing.deliveryCharge, 0);
    assert.strictEqual(checkout.pricing.gst, 0);
    assert.strictEqual(checkout.pricing.total, 48450);

    assert.strictEqual(order.pricing.discount, 2550);
    assert.strictEqual(order.pricing.total, 48450);
  });

  /* ---- CASE 4 — Wholesale ₹80,000 -> 5% = ₹4,000 ---- */
  console.log('\n--- CASE 4 — Subtotal ₹80,000 (5% = ₹4,000) ---');
  await testAsync('Cart, checkout and created order all show ₹4,000 discount', async () => {
    const { cart, checkout, order } = await runWholesaleOrder(8000, 0, 10);
    assert.strictEqual(cart.subtotal, 80000);
    assert.strictEqual(cart.wholesaleDiscountAmount, 4000);
    assert.strictEqual(cart.discount, 4000);
    assert.strictEqual(cart.total, 76000);

    assert.strictEqual(checkout.pricing.discount, 4000);
    assert.strictEqual(checkout.pricing.total, 76000);

    assert.strictEqual(order.pricing.discount, 4000);
    assert.strictEqual(order.pricing.total, 76000);
  });

  /* ---- CASE 5 — Wholesale ₹180,000 -> existing 7.5% tier = ₹13,500 ---- */
  console.log('\n--- CASE 5 — Subtotal ₹180,000 (7.5% = ₹13,500) ---');
  await testAsync('Cart, checkout and created order all show ₹13,500 discount', async () => {
    const { cart, checkout, order } = await runWholesaleOrder(18000, 0, 10);
    assert.strictEqual(cart.subtotal, 180000);
    assert.strictEqual(cart.wholesaleTier, 'tier1');
    assert.strictEqual(cart.wholesaleDiscountPercent, 7.5);
    assert.strictEqual(cart.wholesaleDiscountAmount, 13500);
    assert.strictEqual(cart.discount, 13500);
    assert.strictEqual(cart.total, 166500);

    assert.strictEqual(checkout.pricing.discount, 13500);
    assert.strictEqual(checkout.pricing.total, 166500);

    assert.strictEqual(order.pricing.discount, 13500);
    assert.strictEqual(order.pricing.total, 166500);
  });

  /* ---- Category discount + wholesale discount (both must appear) ---- */
  console.log('\n--- CATEGORY + WHOLESALE — category applies FIRST, wholesale on remaining ---');
  await testAsync('Base ₹5,000, category 20% -> ₹4,000/unit ×15 = ₹60,000 -> wholesale 5% = ₹3,000', async () => {
    const { cart, checkout, order } = await runWholesaleOrder(5000, 20, 15);

    // Category discount applied per-unit first
    assert.strictEqual(cart.items[0].originalPrice, 5000);
    assert.strictEqual(cart.items[0].discountAmount, 1000); // 20% of 5000
    assert.strictEqual(cart.items[0].price, 4000); // after category
    assert.strictEqual(cart.subtotal, 60000); // 4000 × 15

    // Wholesale discount is 5% of the 60,000 (amount AFTER category discount)
    assert.strictEqual(cart.wholesaleDiscountPercent, 5);
    assert.strictEqual(cart.wholesaleDiscountAmount, 3000);
    assert.strictEqual(cart.discount, 3000);
    assert.strictEqual(cart.total, 57000);

    assert.strictEqual(checkout.pricing.subtotal, 60000);
    assert.strictEqual(checkout.pricing.discount, 3000);
    assert.strictEqual(checkout.pricing.total, 57000);

    assert.strictEqual(order.pricing.discount, 3000);
    assert.strictEqual(order.pricing.total, 57000);
  });

  /* ---- Retail regression ---- */
  console.log('\n--- RETAIL REGRESSION — no wholesale discount, existing retail rules ---');
  await testAsync('Retail ₹51,000 -> NO wholesale discount; total ₹51,000', async () => {
    const { cart, checkout, order } = await runRetailOrder(3400, 0, 15);
    assert.strictEqual(cart.customerType, 'retail');
    assert.strictEqual(cart.wholesaleDiscountAmount, 0);
    assert.strictEqual(cart.discount, 0);
    assert.strictEqual(cart.total, 51000);

    assert.strictEqual(checkout.pricing.discount, 0);
    assert.strictEqual(checkout.pricing.gst, 0);
    assert.strictEqual(checkout.pricing.total, 51000);

    assert.strictEqual(order.pricing.wholesaleDiscountAmount, 0);
    assert.strictEqual(order.pricing.discount, 0);
    assert.strictEqual(order.pricing.total, 51000);
  });

  await testAsync('Retail ₹1,999 -> REJECTED (₹2,000 minimum); ₹2,000 -> ACCEPTED', async () => {
    // rejected — below the retail ₹2,000 minimum
    const catA = await createCategory(0);
    const prodA = await createProduct(1999, catA);
    const userA = await createUser('retail');
    await createCart(userA._id, prodA, 1);
    let rejected = false;
    try {
      await checkoutService.validateCheckout(userA._id, VALID_DELIVERY);
    } catch (e) {
      rejected = true;
      assert.ok(String(e.message).includes('Minimum order value is ₹2000'), e.message);
    }
    assert.ok(rejected, 'Expected retail ₹1,999 order to be rejected');

    // accepted — retail ₹2,000 exactly
    const catB = await createCategory(0);
    const prodB = await createProduct(2000, catB);
    const userB = await createUser('retail');
    await createCart(userB._id, prodB, 1);
    const summary = await checkoutService.validateCheckout(userB._id, VALID_DELIVERY);
    assert.strictEqual(summary.pricing.subtotal, 2000);
    assert.strictEqual(summary.pricing.discount, 0);
    assert.strictEqual(summary.pricing.total, 2000);
  });

  /* ---- GST regression ---- */
  console.log('\n--- GST REGRESSION — GST stays 0 everywhere ---');
  await testAsync('Every pricing object keeps gst = 0 ("Inclusive of all taxes")', async () => {
    const { checkout, order } = await runWholesaleOrder(8000, 0, 10);
    assert.strictEqual(checkout.pricing.gst, 0);
    assert.strictEqual(order.pricing.gst, 0);
    // total = subtotal - discount + delivery + gst(0)
    assert.strictEqual(
      order.pricing.total,
      order.pricing.subtotal - order.pricing.discount + order.pricing.deliveryCharge
    );
  });

  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  // Cleanup: drop the scratch DB so nothing test-related is left behind.
  await mongoose.connection.dropDatabase();
  console.log('Scratch DB dropped. Production DB untouched.\n');
  await mongoose.disconnect();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  try {
    await mongoose.connection.dropDatabase();
  } catch (e) { /* best-effort cleanup */ }
  process.exit(1);
});