/* ============================================================
   VENDHAN CRACKERS — RETAIL ORDER SUMMARY END-TO-END Test
   Verifies the RETAIL cart → checkout → created-order pricing flow:
   original price → category discount → Subtotal → order-level
   discounts (2nd-order/membership/referral) → delivery → Grand Total
   = Subtotal − discount + delivery, with gst = 0 ("Inclusive of all taxes").
   Uses a SCRATCH database only. Run: node test-retail-order-summary.js
   ============================================================ */

const mongoose = require('./backend/node_modules/mongoose');
const assert = require('assert');

const SCRATCH_MONGODB_URI =
  'mongodb://localhost:27017/vendhan_crackers_retail_fix_test';

const { User, Product, Category, Cart, Order, Setting } = require('./backend/models');
const cartService = require('./backend/services/cartService');
const checkoutService = require('./backend/services/checkoutService');

const VALID_DELIVERY = {
  name: 'Retail Test Buyer',
  phone: '9876500111',
  email: 'retail-fix@example.com',
  address: '1 Retail Test Street',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001'
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ' — ' + e.message); }
}

async function testAsync(name, fn) {
  try { await fn(); passed++; console.log('  ✅ ' + name); }
  catch (e) { failed++; console.log('  ❌ ' + name + ' — ' + e.message); }
}

/* ---------- Scratch-DB helpers ---------- */

let seq = 0;

async function createUser(customerType, opts = {}) {
  seq++;
  return User.create({
    name: 'Retail Fix User ' + seq,
    email: 'retailfix' + seq + '@example.com',
    phone: String(9100000000 + seq),
    password: 'strongpass123',
    customerType,
    status: 'active',
    ...opts
  });
}

async function createCategory(discountPercent) {
  seq++;
  return Category.create({ name: 'Retail Fix Cat ' + seq, discount: discountPercent || 0, status: 'active' });
}

async function createProduct(price, category, stock) {
  seq++;
  return Product.create({
    name: 'Retail Fix Product ' + seq,
    category: category._id,
    price,
    stock: stock || 100000,
    status: 'active'
  });
}

async function createCartItem(userId, product, quantity) {
  return Cart.create({
    user: userId,
    items: [
      { itemType: 'PRODUCT', product: product._id, name: product.name, price: product.price, quantity }
    ]
  });
}
/** Seed `count` previously DELIVERED orders so retail loyalty rules apply. */
async function seedCompletedOrders(userId, count) {
  const seedProduct = await Product.findOne({});
  const orders = [];
  for (let i = 0; i < count; i++) {
    seq++;
    orders.push({
      orderId: 'SEED' + Date.now() + '_' + seq,
      user: userId,
      customer: VALID_DELIVERY,
      deliveryAddress: {
        address: VALID_DELIVERY.address, city: VALID_DELIVERY.city,
        state: VALID_DELIVERY.state, pincode: VALID_DELIVERY.pincode
      },
      items: [{ product: seedProduct._id, productName: 'Seed product', price: 3000, quantity: 1, subtotal: 3000 }],
      pricing: { subtotal: 3000, discount: 0, deliveryCharge: 0, gst: 0, total: 3000 },
      payment: { method: 'cod', status: 'paid' },
      status: 'delivered',
      statusHistory: [{ status: 'delivered', changedAt: new Date() }]
    });
  }
  return Order.create(orders);
}

/** Full retail flow: build user + cart → loadCart → validateCheckout → createOrder. */
async function runRetailFlow({ price, categoryDiscount, qty = 1, deliveredOrders = 0, reseller = null }) {
  const category = await createCategory(categoryDiscount);
  const product = await createProduct(price, category);
  const userOpts = reseller ? { referredBy: reseller._id } : {};
  const user = await createUser('retail', userOpts);
  await createCartItem(user._id, product, qty);
  if (deliveredOrders > 0) await seedCompletedOrders(user._id, deliveredOrders);

  const cart = await cartService.loadCart(user._id);
  const checkout = await checkoutService.validateCheckout(user._id, VALID_DELIVERY);
  const created = await checkoutService.createOrder(user._id, VALID_DELIVERY, 'cod');
  const order = await Order.findById(created.order._id);
  return { cart, checkout, order };
}

/** Build an ACTIVE reseller (for referral eligibility). */
async function createActiveReseller() {
  seq++;
  return User.create({
    name: 'Reseller ' + seq,
    email: 'reseller' + seq + '@example.com',
    phone: String(9200000000 + seq),
    password: 'strongpass123',
    customerType: 'retail',
    isReseller: true,
    resellerStatus: 'active',
    referralCode: 'RES' + String(100000 + seq),
    status: 'active'
  });
}

/** Assert the four summary fields are identical across cart / checkout / order. */
function assertPricingConsistent(cart, checkout, order, label) {
  assert.strictEqual(checkout.pricing.subtotal, cart.subtotal, label + ' subtotal cart vs checkout');
  assert.strictEqual(order.pricing.subtotal, cart.subtotal, label + ' subtotal cart vs order');
  assert.strictEqual(checkout.pricing.discount, cart.discount, label + ' discount cart vs checkout');
  assert.strictEqual(order.pricing.discount, cart.discount, label + ' discount cart vs order');
  assert.strictEqual(checkout.pricing.deliveryCharge, cart.deliveryCharge, label + ' delivery cart vs checkout');
  assert.strictEqual(order.pricing.deliveryCharge, cart.deliveryCharge, label + ' delivery cart vs order');
  assert.strictEqual(checkout.pricing.total, cart.total, label + ' total cart vs checkout');
  assert.strictEqual(order.pricing.total, cart.total, label + ' total cart vs order');
  assert.strictEqual(cart.gst !== undefined ? cart.gst : 0, 0, label + ' cart gst must stay 0');
  assert.strictEqual(checkout.pricing.gst, 0, label + ' checkout gst must stay 0');
  assert.strictEqual(order.pricing.gst, 0, label + ' order gst must stay 0');
  assert.strictEqual(
    Math.round((cart.subtotal - cart.discount + cart.deliveryCharge) * 100) / 100,
    cart.total,
    label + ' total must equal subtotal − discount + delivery'
  );
}

/* ============================================================
   MAIN
   ============================================================ */
async function main() {
  console.log('\n=== RETAIL ORDER SUMMARY — END-TO-END FLOW (scratch DB) ===');

  await mongoose.connect(SCRATCH_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();

  // Seed the single Settings doc (delivery free above ₹1,000; retail min ₹2,000).
  await Setting.create({
    shopName: 'Vendhan Crackers Retail Fix Test',
    phone: '9876500111',
    email: 'retail-fix-shop@example.com',
    address: '1 Retail Fix Street, Chennai',
    deliveryCharge: 49,
    freeDeliveryThreshold: 1000,
    minimumOrderAmount: 2000
  });

  console.log('\n--- SETUP ---');
  test('Scratch DB connected and clean', () => {
    assert.strictEqual(mongoose.connection.name, 'vendhan_crackers_retail_fix_test');
  });

  /* ---- SCENARIO 1 — Retail below ₹2,000 -> REJECTED ---- */
  console.log('\n--- SCENARIO 1 — Retail below ₹2,000 is rejected ---');
  await testAsync('validateCheckout REJECTS ₹1,999 and createOrder creates no order', async () => {
    const category = await createCategory(0);
    const product = await createProduct(1999, category);
    const user = await createUser('retail');
    await createCartItem(user._id, product, 1);
    let rejected = false;
    try {
      await checkoutService.validateCheckout(user._id, VALID_DELIVERY);
    } catch (e) {
      rejected = true;
      assert.ok(String(e.message).includes('Minimum order value is ₹2000'), e.message);
    }
    assert.ok(rejected, 'Expected retail ₹1,999 order to be rejected');

    const ordersBefore = await Order.countDocuments({ user: user._id });
    let orderRejected = false;
    try {
      await checkoutService.createOrder(user._id, VALID_DELIVERY, 'cod');
    } catch (e) {
      orderRejected = true;
    }
    assert.ok(orderRejected, 'Expected createOrder to reject ₹1,999');
    const ordersAfter = await Order.countDocuments({ user: user._id });
    assert.strictEqual(ordersAfter, ordersBefore, 'No order may be created for a rejected retail order');
  });

  /* ---- SCENARIO 2 — Retail exactly ₹2,000 -> ACCEPTED ---- */
  console.log('\n--- SCENARIO 2 — Retail exactly ₹2,000 is accepted ---');
  await testAsync('Cart / checkout / order: subtotal 2,000, discount 0, total 2,000', async () => {
    const { cart, checkout, order } = await runRetailFlow({ price: 2000, categoryDiscount: 0, qty: 1 });
    assert.strictEqual(cart.subtotal, 2000);
    assert.strictEqual(cart.discount, 0);
    assert.strictEqual(cart.total, 2000);
    assert.strictEqual(checkout.pricing.subtotal, 2000);
    assert.strictEqual(checkout.pricing.discount, 0);
    assert.strictEqual(checkout.pricing.total, 2000);
    assert.strictEqual(order.pricing.total, 2000);
    assertPricingConsistent(cart, checkout, order, 'exact ₹2,000');
  });

  /* ---- SCENARIO 3 — Retail above ₹2,000 -> ACCEPTED ---- */
  console.log('\n--- SCENARIO 3 — Retail above ₹2,000 is accepted ---');
  await testAsync('Cart / checkout / order: subtotal 2,500, discount 0, total 2,500', async () => {
    const { cart, checkout, order } = await runRetailFlow({ price: 2500, categoryDiscount: 0, qty: 1 });
    assert.strictEqual(cart.subtotal, 2500);
    assert.strictEqual(cart.total, 2500);
    assertPricingConsistent(cart, checkout, order, 'above ₹2,000');
  });

  /* ---- SCENARIO 4 — No order-level discount: subtotal = discounted product amount ---- */
  console.log('\n--- SCENARIO 4 — No order-level discount (category discount only) ---');
  await testAsync('Product ₹5,000 @ 20% category -> Subtotal ₹4,000, no discount, total ₹4,000', async () => {
    const { cart, checkout, order } = await runRetailFlow({ price: 5000, categoryDiscount: 20, qty: 1 });
    assert.strictEqual(cart.items[0].afterCategoryPrice, 4000);
    assert.strictEqual(cart.subtotal, 4000);
    assert.strictEqual(cart.discount, 0);
    assert.strictEqual(cart.total, 4000);
    assertPricingConsistent(cart, checkout, order, 'category-only (no loyalty)');
  });

/* ---- SCENARIO 5 — THE MAIN BUG: 3% Second-Order Discount must reduce the Grand Total ---- */
  console.log('\n--- SCENARIO 5 — 3% Second Order Discount reflected in Grand Total ---');
  await testAsync('Subtotal ₹5,500 − Second Order 3% ₹165 = Grand Total ₹5,335 (the reported case)', async () => {
    const { cart, checkout, order } = await runRetailFlow({ price: 5500, categoryDiscount: 0, qty: 1, deliveredOrders: 1 });
    assert.strictEqual(cart.secondOrderDiscountPercent, 3);
    assert.strictEqual(cart.secondOrderDiscountAmount, 165); // 3% of 5,500
    assert.strictEqual(cart.subtotal, 5500);            // after-category subtotal
    assert.strictEqual(cart.discount, 165);             // discount MUST be present
    assert.strictEqual(cart.deliveryCharge, 0);
    assert.strictEqual(cart.total, 5335);               // 5500 − 165 + 0
    assert.ok(cart.total < cart.subtotal, 'Grand Total must be lower than Subtotal when a discount applies');
    // Item display contract: after-category unit 5,500; final unit 5,335 (no double count).
    assert.strictEqual(cart.items[0].afterCategoryPrice, 5500);
    assert.strictEqual(cart.items[0].price, 5335);
    assertPricingConsistent(cart, checkout, order, 'second-order 3% case');
    assert.strictEqual(order.pricing.subtotal, 5500);
    assert.strictEqual(order.pricing.discount, 165);
    assert.strictEqual(order.pricing.deliveryCharge, 0);
    assert.strictEqual(order.pricing.gst, 0);
    assert.strictEqual(order.pricing.total, 5335);
  });

  /* ---- SCENARIO 6 — Category discount + Second Order Discount: no double counting ---- */
  console.log('\n--- SCENARIO 6 — Category + Second Order (no double discounting) ---');
  await testAsync('₹5,000 @ 20% category -> Subtotal ₹4,000 -> 3% second-order ₹120 -> Total ₹3,880', async () => {
    const { cart, checkout, order } = await runRetailFlow({ price: 5000, categoryDiscount: 20, qty: 1, deliveredOrders: 1 });
    assert.strictEqual(cart.items[0].afterCategoryPrice, 4000); // after 20% category
    assert.strictEqual(cart.subtotal, 4000);                    // category affects Subtotal first
    assert.strictEqual(cart.secondOrderDiscountAmount, 120);    // 3% of 4,000
    assert.strictEqual(cart.discount, 120);
    assert.strictEqual(cart.total, 3880);                       // 4000 − 120
    assert.strictEqual(cart.items[0].price, 3880);              // final unit price
    assert.ok(cart.total !== 4000 - 120 - 120, 'double discount would be ₹3,760 — must not happen');
    assertPricingConsistent(cart, checkout, order, 'category + second-order');
  });

  /* ---- SCENARIO 7 — Membership + Referral combined ---- */
  console.log('\n--- SCENARIO 7 — Membership (Silver 4%) + Referral 3% combined ---');
  await testAsync('₹2,500 @ 20% category -> Subtotal ₹2,000; Silver 4% ₹80 + Referral 3% ₹57.60 -> Total ₹1,862.40', async () => {
    const reseller = await createActiveReseller();
    const { cart, checkout, order } = await runRetailFlow({ price: 2500, categoryDiscount: 20, qty: 1, deliveredOrders: 3, reseller });
    assert.strictEqual(cart.items[0].afterCategoryPrice, 2000); // 2500 − 20%
    assert.strictEqual(cart.subtotal, 2000);
    assert.strictEqual(cart.membershipDiscountPercent, 4);
    assert.strictEqual(cart.membershipDiscountAmount, 80);      // 4% of 2000
    assert.strictEqual(cart.referralDiscountPercent, 3);
    assert.strictEqual(cart.referralDiscountAmount, 57.6);      // 3% of (2000 − 80)
    assert.strictEqual(cart.discount, 137.6);                   // 80 + 57.60
    assert.strictEqual(cart.total, 1862.4);                     // 2000 − 137.60
    assertPricingConsistent(cart, checkout, order, 'membership + referral');
  });

  /* ---- SCENARIO 8 — Membership Gold 7% (single order-level discount) ---- */
  console.log('\n--- SCENARIO 8 — Membership Gold 7% only (no referral) ---');
  await testAsync('₹2,000 @ 0% category -> Subtotal ₹2,000 -> Gold 7% ₹140 -> Total ₹1,860', async () => {
    const { cart, checkout, order } = await runRetailFlow({ price: 2000, categoryDiscount: 0, qty: 1, deliveredOrders: 7 });
    assert.strictEqual(cart.membershipDiscountPercent, 7);
    assert.strictEqual(cart.membershipDiscountAmount, 140);
    assert.strictEqual(cart.subtotal, 2000);
    assert.strictEqual(cart.discount, 140);
    assert.strictEqual(cart.total, 1860);
    assertPricingConsistent(cart, checkout, order, 'gold membership');
  });

  /* ---- GST regression ---- */
  console.log('\n--- GST REGRESSION — GST stays 0 everywhere ("Inclusive of all taxes") ---');
  await testAsync('gst = 0 in cart, checkout and order; no GST added on top of subtotal', async () => {
    const { cart, checkout, order } = await runRetailFlow({ price: 5500, categoryDiscount: 0, qty: 1, deliveredOrders: 1 });
    assert.strictEqual(cart.gst !== undefined ? cart.gst : 0, 0);
    assert.strictEqual(checkout.pricing.gst, 0);
    assert.strictEqual(order.pricing.gst, 0);
    assert.strictEqual(order.pricing.total, order.pricing.subtotal - order.pricing.discount + order.pricing.deliveryCharge);
    assert.notStrictEqual(order.pricing.total, Math.round(order.pricing.subtotal * 1.18 * 100) / 100);
  });

  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  await mongoose.connection.dropDatabase();
  console.log('Scratch DB dropped. Production DB untouched.\n');
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  try { await mongoose.connection.dropDatabase(); } catch (e) { /* best-effort cleanup */ }
  process.exit(1);
});