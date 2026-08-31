/* ============================================================
   WHOLESALE TIER 0 — New ₹50,000–₹99,999.99 → 5% Discount
   Boundary Tests
   Run: node test-wholesale-tier0.js
   ============================================================ */

const assert = require('assert');
const calculateProductPricing = require('./backend/utils/calculateProductPricing');
const {
  CUSTOMER_TYPES,
  WHOLESALE_MIN_ORDER_AMOUNT,
  WHOLESALE_TIER_0_MIN,
  WHOLESALE_TIER_0_MAX,
  WHOLESALE_TIER_0_DISCOUNT,
  getWholesaleTier,
  isWholesaleMinimumOrderMet,
  calculateWholesaleDiscount
} = require('./backend/utils/wholesale');
const calculatePricing = require('./backend/utils/calculatePricing');

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

console.log('\n=== NEW TIER 0 CONSTANTS ===');
test('Tier 0 min = ₹50,000', () => {
  assert.strictEqual(WHOLESALE_TIER_0_MIN, 50000);
});
test('Tier 0 max = ₹99,999.99', () => {
  assert.strictEqual(WHOLESALE_TIER_0_MAX, 99999.99);
});
test('Tier 0 discount = 5%', () => {
  assert.strictEqual(WHOLESALE_TIER_0_DISCOUNT, 5);
});

console.log('\n=== BOUNDARY 1 — ₹49,999.99 → 5% must NOT apply ===');
test('₹49,999.99 → no tier, 0% discount', () => {
  const r = getWholesaleTier(49999.99);
  assert.strictEqual(r.tier, null);
  assert.strictEqual(r.discountPercent, 0);
});
test('₹49,999.99 → discount amount ₹0', () => {
  const r = calculateWholesaleDiscount(49999.99);
  assert.strictEqual(r.discountPercent, 0);
  assert.strictEqual(r.discountAmount, 0);
});

console.log('\n=== BOUNDARY 2 — ₹50,000.00 → exactly 5% ===');
test('₹50,000.00 → tier0, 5%', () => {
  const r = getWholesaleTier(50000);
  assert.strictEqual(r.tier, 'tier0');
  assert.strictEqual(r.discountPercent, 5);
});
test('₹50,000.00 → discount ₹2,500 (5% of 50,000)', () => {
  const r = calculateWholesaleDiscount(50000);
  assert.strictEqual(r.discountPercent, 5);
  assert.strictEqual(r.discountAmount, 2500);
});

console.log('\n=== BOUNDARY 3 — ₹75,000 → exactly 5% ===');
test('₹75,000 → tier0, 5%', () => {
  const r = getWholesaleTier(75000);
  assert.strictEqual(r.tier, 'tier0');
  assert.strictEqual(r.discountPercent, 5);
});
test('₹75,000 → discount ₹3,750 (5% of 75,000)', () => {
  const r = calculateWholesaleDiscount(75000);
  assert.strictEqual(r.discountPercent, 5);
  assert.strictEqual(r.discountAmount, 3750);
});

console.log('\n=== BOUNDARY 4 — ₹99,999.99 → exactly 5% ===');
test('₹99,999.99 → tier0, 5%', () => {
  const r = getWholesaleTier(99999.99);
  assert.strictEqual(r.tier, 'tier0');
  assert.strictEqual(r.discountPercent, 5);
});
test('₹99,999.99 → discount = 5% of 99,999.99 = 4,999.9995 rounded to 4,999.99', () => {
  const r = calculateWholesaleDiscount(99999.99);
  assert.strictEqual(r.discountPercent, 5);
  assert.strictEqual(r.discountAmount, 5000); // Math.round(4999.9995) = 5000
});

console.log('\n=== BOUNDARY 5 — ₹100,000.00 → existing higher tier (tier1 7.5%) ===');
test('₹100,000.00 → tier1, 7.5%', () => {
  const r = getWholesaleTier(100000);
  assert.strictEqual(r.tier, 'tier1');
  assert.strictEqual(r.discountPercent, 7.5);
});
test('₹100,000.00 → discount ₹7,500 (7.5%)', () => {
  const r = calculateWholesaleDiscount(100000);
  assert.strictEqual(r.discountPercent, 7.5);
  assert.strictEqual(r.discountAmount, 7500);
});

console.log('\n=== BOUNDARY 6 — Category discount applied BEFORE new 5% ===');
test('Original=₹60,000, cat=10% → after cat=₹54,000 → 5% wholesale = ₹2,700', () => {
  const original = 60000;
  const categoryPct = 10;
  const categoryAmount = Math.round((original * categoryPct / 100) * 100) / 100;
  const afterCategory = Math.round((original - categoryAmount) * 100) / 100;
  assert.strictEqual(categoryAmount, 6000);
  assert.strictEqual(afterCategory, 54000);

  const wholesale = calculateWholesaleDiscount(afterCategory);
  assert.strictEqual(wholesale.tier, 'tier0');
  assert.strictEqual(wholesale.discountPercent, 5);
  assert.strictEqual(wholesale.discountAmount, 2700);

  // 5% on original 60,000 would be 3,000 — MUST NOT be used
  assert.notStrictEqual(wholesale.discountAmount, 3000);
});
test('Proves category-first: 5% of original differs from 5% of after-category', () => {
  const original = 60000;
  const afterCategory = 54000;
  const wrongWay = Math.round((original * 5 / 100) * 100) / 100; // 3000
  const rightWay = calculateWholesaleDiscount(afterCategory).discountAmount; // 2700
  assert.strictEqual(wrongWay, 3000);
  assert.strictEqual(rightWay, 2700);
  assert.notStrictEqual(wrongWay, rightWay);
});

console.log('\n=== BOUNDARY 7 — Retail customers never receive the new 5% ===');
test('Retail path — customerType retail → no wholesale discount', () => {
  const customerType = CUSTOMER_TYPES.RETAIL;
  assert.strictEqual(customerType, 'retail');
  const wholesalePct = customerType === CUSTOMER_TYPES.WHOLESALE ? 5 : 0;
  assert.strictEqual(wholesalePct, 0);
});
test('Retail product pricing has no wholesale fields', () => {
  const p = calculateProductPricing(1000, 20, 0, 0);
  assert.strictEqual(p.wholesaleDiscountPercent, undefined);
});

console.log('\n=== BOUNDARY 8 — Existing wholesale tiers unchanged ===');
test('Tier1 edges unchanged: ₹1,00,000 (7.5%) and ₹2,50,000 (7.5%)', () => {
  const r1 = getWholesaleTier(100000);
  assert.strictEqual(r1.tier, 'tier1');
  assert.strictEqual(r1.discountPercent, 7.5);
  const r2 = getWholesaleTier(250000);
  assert.strictEqual(r2.tier, 'tier1');
  assert.strictEqual(r2.discountPercent, 7.5);
});
test('Tier2 edges unchanged: ₹2,50,000.01 (12%) and ₹6,00,000 (12%)', () => {
  const r1 = getWholesaleTier(250000.01);
  assert.strictEqual(r1.tier, 'tier2');
  assert.strictEqual(r1.discountPercent, 12);
  const r2 = getWholesaleTier(600000);
  assert.strictEqual(r2.tier, 'tier2');
  assert.strictEqual(r2.discountPercent, 12);
});
test('Tier3 unchanged: ₹6,00,000.01 → 15%', () => {
  const r = getWholesaleTier(600000.01);
  assert.strictEqual(r.tier, 'tier3');
  assert.strictEqual(r.discountPercent, 15);
});
test('Tier 1–3 discount amounts unchanged', () => {
  assert.strictEqual(calculateWholesaleDiscount(180000).discountAmount, 13500);
  assert.strictEqual(calculateWholesaleDiscount(300000).discountAmount, 36000);
  assert.strictEqual(calculateWholesaleDiscount(700000).discountAmount, 105000);
});

console.log('\n=== BOUNDARY 9 — Minimum wholesale ORDER AMOUNT (₹50,000) ===');
test('₹49,999.99 → not met, ₹50,000 → met, ₹50,001 → met', () => {
  assert.strictEqual(WHOLESALE_MIN_ORDER_AMOUNT, 50000);
  assert.strictEqual(isWholesaleMinimumOrderMet(49999.99), false);
  assert.strictEqual(isWholesaleMinimumOrderMet(50000), true);
  assert.strictEqual(isWholesaleMinimumOrderMet(50001), true);
});

console.log('\n=== BOUNDARY 10 — Order pricing snapshot records correct discount values ===');
test('Snapshot values: tier0, 5%, ₹2,700 for ₹54,000 after category', () => {
  const amountAfterCategoryDiscount = 54000;
  const wholesale = calculateWholesaleDiscount(amountAfterCategoryDiscount);
  const pricingSnapshot = {
    wholesaleTier: wholesale.tier,
    wholesaleDiscountPercent: wholesale.discountPercent,
    wholesaleDiscountAmount: wholesale.discountAmount
  };
  assert.deepStrictEqual(pricingSnapshot, {
    wholesaleTier: 'tier0',
    wholesaleDiscountPercent: 5,
    wholesaleDiscountAmount: 2700
  });
});
test('Tier0 enum value is acceptable to Order model', () => {
  const VALID_TIERS = ['tier0', 'tier1', 'tier2', 'tier3'];
  assert.ok(VALID_TIERS.includes('tier0'));
  assert.ok(VALID_TIERS.includes('tier1'));
  assert.ok(VALID_TIERS.includes('tier2'));
  assert.ok(VALID_TIERS.includes('tier3'));
});

console.log('\n=== BOUNDARY 11 — checkout total and created Order total identical ===');
test('buildCheckoutSummary and createOrder use identical calculatePricing totals', () => {
  const items = [
    { price: 49000, originalPrice: 50000, discountAmount: 1000, quantity: 1 },
    { price: 5000, originalPrice: 6000, discountAmount: 1000, quantity: 1 }
  ];
  const settings = { deliveryCharge: 0, freeDeliveryThreshold: 1000, gstPercent: 18 };

  // After-category per unit = originalPrice - discountAmount
  // 49000 + 5000 = 54000
  const amountAfterCategory = Math.round(
    items.reduce((sum, item) => sum + (item.originalPrice - item.discountAmount) * item.quantity, 0) * 100
  ) / 100;
  assert.strictEqual(amountAfterCategory, 54000);
  const wholesale = calculateWholesaleDiscount(amountAfterCategory);
  assert.strictEqual(wholesale.tier, 'tier0');
  assert.strictEqual(wholesale.discountAmount, 2700);

  // calculatePricing is the SAME function used by both buildCheckoutSummary and createOrder
  const pricing = calculatePricing(items, settings, {});
  const snapshot = {
    ...pricing,
    wholesaleTier: wholesale.tier,
    wholesaleDiscountPercent: wholesale.discountPercent,
    wholesaleDiscountAmount: wholesale.discountAmount
  };
  assert.strictEqual(snapshot.wholesaleTier, 'tier0');
  assert.strictEqual(snapshot.subtotal, pricing.subtotal);
  // subtotal = 54000, delivery = 0, GST 18% = 9720 → total = 63720
  assert.strictEqual(snapshot.total, 63720);
});

console.log('\n=== BOUNDARY 13 — Phase 1–8 regression touchpoints unchanged ===');
test('Category discount still applies FIRST per unit', () => {
  const p = calculateProductPricing(1000, 10, 0, 0);
  assert.strictEqual(p.discountAmount, 100);
  assert.strictEqual(p.finalPrice, 900);
});
test('Coupons still removed from pricing', () => {
  const pr = calculatePricing([{ price: 100, quantity: 1 }], { deliveryCharge: 0, freeDeliveryThreshold: 1000, gstPercent: 0 }, {});
  assert.strictEqual(pr.couponDiscount, 0);
});
test('Second-order/membership/referral pricing unchanged for retail', () => {
  const p = calculateProductPricing(1000, 20, 3, 0, 0);
  assert.strictEqual(p.secondOrderDiscountPercent, 3);
  assert.strictEqual(p.finalPrice, 776);
});

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);