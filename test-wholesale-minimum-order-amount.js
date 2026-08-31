/* ============================================================
   VENDHAN CRACKERS — Wholesale Minimum ORDER AMOUNT (₹50,000)
   Eligibility Tests

   Run: node test-wholesale-minimum-order-amount.js

   NEW RULE (replaces the old "wholesale minimum quantity = 50"):
     Wholesale orders require a MINIMUM ORDER AMOUNT of ₹50,000.

   Eligibility is based on the applicable wholesale order/cart amount
   (amount AFTER category discount, BEFORE wholesale discount) — NOT on
   total product quantity.

   Required cases covered below:
     - qty < 50  but subtotal ₹50,000        -> MUST PASS (allowed)
     - qty >= 50 but subtotal below ₹50,000  -> MUST FAIL
     - subtotal ₹49,999                       -> MUST FAIL
     - subtotal ₹49,999.99  (paise)           -> MUST FAIL
     - subtotal ₹50,000                       -> MUST PASS
     - subtotal above ₹50,000                 -> MUST PASS
   ============================================================ */

const assert = require('assert');
const fs = require('fs');
const calculateProductPricing = require('./backend/utils/calculateProductPricing');
const calculatePricing = require('./backend/utils/calculatePricing');
const {
  CUSTOMER_TYPES,
  WHOLESALE_MIN_ORDER_AMOUNT,
  isWholesaleMinimumOrderMet,
  getWholesaleMinimumOrderMessage,
  getWholesaleTier,
  calculateWholesaleDiscount
} = require('./backend/utils/wholesale');
const {
  calculateAmountAfterCategoryDiscount
} = require('./backend/services/checkoutService');
const {
  MINIMUM_ONLINE_ORDER_AMOUNT,
  isMinimumOnlineOrderMet
} = require('./backend/utils/minimumOrder');

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

/**
 * Build a checkout line item the same way checkoutService does:
 * product base price + category discount (authoritative from the backend).
 */
function makeItem(basePrice, categoryDiscount, qty) {
  const pricing = calculateProductPricing(basePrice, categoryDiscount, 0, 0);
  return {
    originalPrice: pricing.originalPrice,
    discountAmount: pricing.discountAmount,
    quantity: qty || 1
  };
}
/* ---------------- 1) SINGLE SOURCE OF TRUTH ---------------- */
console.log('\n=== 1) SINGLE SOURCE OF TRUTH ===');
test('WHOLESALE_MIN_ORDER_AMOUNT constant = 50000', () => {
  assert.strictEqual(WHOLESALE_MIN_ORDER_AMOUNT, 50000);
});
test('User-facing message = "Wholesale orders require a minimum order amount of ₹50,000."', () => {
  assert.strictEqual(
    getWholesaleMinimumOrderMessage(),
    'Wholesale orders require a minimum order amount of ₹50,000.'
  );
});
test('Backend wholesale/cart/checkout files use the constant — old quantity rule is gone', () => {
  const files = [
    './backend/utils/wholesale.js',
    './backend/services/cartService.js',
    './backend/services/checkoutService.js'
  ];
  files.forEach((f) => {
    const src = fs.readFileSync(f, 'utf8');
    assert.ok(src.includes('WHOLESALE_MIN_ORDER_AMOUNT'), f + ' must reference the constant');
    assert.ok(!src.includes('WHOLESALE_MIN_QUANTITY'), f + ' must not use the old quantity constant');
    assert.ok(!src.includes('isWholesaleQuantityMet'), f + ' must not use the old quantity check');
    assert.ok(!/minimum quantity/i.test(src), f + ' must not contain "minimum quantity" messaging');
  });
});

/* ---------------- 2) AMOUNT BOUNDARIES ---------------- */
console.log('\n=== 2) AMOUNT BOUNDARIES (quantity is irrelevant) ===');
test('₹49,999 -> NOT allowed', () => {
  assert.strictEqual(isWholesaleMinimumOrderMet(49999), false);
});
test('₹49,999.99 -> NOT allowed (paise supported)', () => {
  assert.strictEqual(isWholesaleMinimumOrderMet(49999.99), false);
});
test('₹50,000 -> ALLOWED', () => {
  assert.strictEqual(isWholesaleMinimumOrderMet(50000), true);
});
test('₹50,001 -> ALLOWED', () => {
  assert.strictEqual(isWholesaleMinimumOrderMet(50001), true);
});
test('Above ₹50,000 -> ALLOWED', () => {
  assert.strictEqual(isWholesaleMinimumOrderMet(60000), true);
  assert.strictEqual(isWholesaleMinimumOrderMet(100000), true);
});

/* ---------------- 3) REQUIRED SCENARIOS ---------------- */
console.log('\n=== 3) REQUIRED SCENARIOS (order amount = amount after category discount) ===');

test('Qty < 50 (1 unit) but subtotal ₹50,000 -> MUST PASS', () => {
  // Single unit whose after-category amount is exactly ₹50,000.
  const items = [{ originalPrice: 62500, discountAmount: 12500, quantity: 1 }];
  const amount = calculateAmountAfterCategoryDiscount(items);
  assert.strictEqual(amount, 50000);
  assert.strictEqual(isWholesaleMinimumOrderMet(amount), true);
});

test('Qty >= 50 (50 units) but subtotal ₹49,950 below ₹50,000 -> MUST FAIL', () => {
  // 50 units at ₹999 after-category each = 49,950 -> below the minimum.
  const items = [{ originalPrice: 1248.75, discountAmount: 249.75, quantity: 50 }];
  const amount = calculateAmountAfterCategoryDiscount(items);
  assert.strictEqual(amount, 49950);
  assert.strictEqual(isWholesaleMinimumOrderMet(amount), false);
});
test('Subtotal ₹49,999 -> MUST FAIL', () => {
  const items = [{ originalPrice: 62499, discountAmount: 12500, quantity: 1 }];
  const amount = calculateAmountAfterCategoryDiscount(items);
  assert.strictEqual(amount, 49999);
  assert.strictEqual(isWholesaleMinimumOrderMet(amount), false);
});

test('Subtotal ₹49,999.99 (paise) -> MUST FAIL', () => {
  const items = [{ originalPrice: 62499.99, discountAmount: 12500, quantity: 1 }];
  const amount = calculateAmountAfterCategoryDiscount(items);
  assert.strictEqual(amount, 49999.99);
  assert.strictEqual(isWholesaleMinimumOrderMet(amount), false);
});

test('Subtotal ₹50,000 -> MUST PASS', () => {
  const items = [{ originalPrice: 62500, discountAmount: 12500, quantity: 1 }];
  const amount = calculateAmountAfterCategoryDiscount(items);
  assert.strictEqual(amount, 50000);
  assert.strictEqual(isWholesaleMinimumOrderMet(amount), true);
});

test('Subtotal ₹50,001 -> MUST PASS', () => {
  const items = [{ originalPrice: 62501, discountAmount: 12500, quantity: 1 }];
  const amount = calculateAmountAfterCategoryDiscount(items);
  assert.strictEqual(amount, 50001);
  assert.strictEqual(isWholesaleMinimumOrderMet(amount), true);
});

test('Subtotal ₹80,000 (built via makeItem / calculateProductPricing) -> MUST PASS', () => {
  // 80 units, base 1250, 20% category discount -> after-category 1000 each = 80,000.
  const items = [makeItem(1250, 20, 80)];
  assert.strictEqual(items[0].originalPrice, 1250);
  assert.strictEqual(items[0].discountAmount, 250);
  const amount = calculateAmountAfterCategoryDiscount(items);
  assert.strictEqual(amount, 80000);
  assert.strictEqual(isWholesaleMinimumOrderMet(amount), true);
});

/* ---------------- 4) WHOLESALE DISCOUNT LOGIC UNCHANGED ---------------- */
console.log('\n=== 4) WHOLESALE DISCOUNT CALCULATION UNCHANGED ===');
test('₹50,000 -> tier0 5% / ₹2,500', () => {
  const w = calculateWholesaleDiscount(50000);
  assert.strictEqual(w.tier, 'tier0');
  assert.strictEqual(w.discountPercent, 5);
  assert.strictEqual(w.discountAmount, 2500);
});
test('₹80,000 -> tier0 5% / ₹4,000', () => {
  const w = calculateWholesaleDiscount(80000);
  assert.strictEqual(w.tier, 'tier0');
  assert.strictEqual(w.discountPercent, 5);
  assert.strictEqual(w.discountAmount, 4000);
});
test('Higher tiers unchanged (7.5% / 12% / 15%)', () => {
  assert.strictEqual(getWholesaleTier(100000).discountPercent, 7.5);
  assert.strictEqual(calculateWholesaleDiscount(180000).discountAmount, 13500);
  assert.strictEqual(calculateWholesaleDiscount(300000).discountAmount, 36000);
  assert.strictEqual(calculateWholesaleDiscount(700000).discountAmount, 105000);
});
/* ---------------- 5) GST / FINAL TOTAL UNCHANGED ---------------- */
console.log('\n=== 5) GST + FINAL ORDER TOTAL UNCHANGED ===');
test('GST stays 0 ("inclusive of all taxes") — not re-calculated, position unchanged', () => {
  const items = [{ price: 50000, quantity: 1 }];
  const settings = { deliveryCharge: 0, freeDeliveryThreshold: 1000, gstPercent: 18 };
  const pricing = calculatePricing(items, settings, {});
  assert.strictEqual(pricing.gst, 0); // GST is inclusive, never added again
  assert.strictEqual(pricing.subtotal, 50000);
  assert.strictEqual(pricing.total, 50000); // subtotal + ₹0 delivery + ₹0 GST
});
test('GST unchanged with 18% configured, delivery/free-threshold rules intact', () => {
  const items = [
    { price: 40000, quantity: 1 },
    { price: 10000, quantity: 1 }
  ];
  const settings = { deliveryCharge: 49, freeDeliveryThreshold: 1000, gstPercent: 18 };
  const pricing = calculatePricing(items, settings, {});
  assert.strictEqual(pricing.subtotal, 50000);
  assert.strictEqual(pricing.deliveryCharge, 0); // free delivery above ₹1,000
  assert.strictEqual(pricing.gst, 0);
  assert.strictEqual(pricing.total, 50000);
});

/* ---------------- 6) RETAIL ORDERING UNCHANGED ---------------- */
console.log('\n=== 6) RETAIL ORDERING UNCHANGED ===');
test('Customer types untouched (retail/wholesale)', () => {
  assert.strictEqual(CUSTOMER_TYPES.RETAIL, 'retail');
  assert.strictEqual(CUSTOMER_TYPES.WHOLESALE, 'wholesale');
});
test('Retail gets NO wholesale discount fields', () => {
  const p = calculateProductPricing(1000, 20, 0, 0);
  assert.strictEqual(p.finalPrice, 800);
  assert.strictEqual(p.wholesaleDiscountPercent, undefined);
  assert.strictEqual(p.wholesaleDiscountAmount, undefined);
});
test('Retail ₹2,000 minimum online order rule unchanged', () => {
  assert.strictEqual(MINIMUM_ONLINE_ORDER_AMOUNT, 2000);
  assert.strictEqual(isMinimumOnlineOrderMet(1999.99), false);
  assert.strictEqual(isMinimumOnlineOrderMet(2000), true);
});

/* ---------------- SUMMARY ---------------- */
console.log('\n========================================');
console.log('Wholesale minimum ORDER AMOUNT tests: ' + passed + ' passed, ' + failed + ' failed');
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);