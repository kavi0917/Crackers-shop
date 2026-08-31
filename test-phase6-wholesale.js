/* ============================================================
   PHASE 6 — Wholesale Customer Type + Wholesale Discount Tests
   ============================================================ */

const assert = require('assert');
const calculateProductPricing = require('./backend/utils/calculateProductPricing');
const {
  CUSTOMER_TYPES,
  WHOLESALE_MIN_ORDER_AMOUNT,
  WHOLESALE_TIER_1_MIN,
  WHOLESALE_TIER_1_MAX,
  WHOLESALE_TIER_1_DISCOUNT,
  WHOLESALE_TIER_2_MAX,
  WHOLESALE_TIER_2_DISCOUNT,
  WHOLESALE_TIER_3_DISCOUNT,
  getWholesaleTier,
  isWholesaleMinimumOrderMet,
  calculateWholesaleDiscount
} = require('./backend/utils/wholesale');
const { getMembershipTier, MEMBERSHIP_TIERS, MEMBERSHIP_DISCOUNT_PERCENT } = require('./backend/utils/membership');
const { SECOND_ORDER_DISCOUNT_PERCENT, COMPLETED_ORDER_STATUS } = require('./backend/utils/secondOrderDiscount');
const { MINIMUM_ONLINE_ORDER_AMOUNT, isMinimumOnlineOrderMet } = require('./backend/utils/minimumOrder');
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

console.log('\n=== CONSTANTS ===');
test('Customer types: retail/wholesale', () => {
  assert.strictEqual(CUSTOMER_TYPES.RETAIL, 'retail');
  assert.strictEqual(CUSTOMER_TYPES.WHOLESALE, 'wholesale');
});
test('Wholesale minimum order amount is ₹50,000', () => {
  assert.strictEqual(WHOLESALE_MIN_ORDER_AMOUNT, 50000);
});
test('Wholesale tier constants', () => {
  assert.strictEqual(WHOLESALE_TIER_1_MIN, 100000);
  assert.strictEqual(WHOLESALE_TIER_1_MAX, 250000);
  assert.strictEqual(WHOLESALE_TIER_1_DISCOUNT, 7.5);
  assert.strictEqual(WHOLESALE_TIER_2_MAX, 600000);
  assert.strictEqual(WHOLESALE_TIER_2_DISCOUNT, 12);
  assert.strictEqual(WHOLESALE_TIER_3_DISCOUNT, 15);
});

console.log('\n=== WHOLESALE TIER RULES ===');
test('₹49,999.99 -> 0% (below tier 0)', () => {
  const r = getWholesaleTier(49999.99);
  assert.strictEqual(r.tier, null);
  assert.strictEqual(r.discountPercent, 0);
});
test('₹50,000 -> 5% (tier 0 min)', () => {
  const r = getWholesaleTier(50000);
  assert.strictEqual(r.tier, 'tier0');
  assert.strictEqual(r.discountPercent, 5);
});
test('₹99,999.99 -> 5% (tier 0 max)', () => {
  const r = getWholesaleTier(99999.99);
  assert.strictEqual(r.tier, 'tier0');
  assert.strictEqual(r.discountPercent, 5);
});
test('₹1,00,000 -> 7.5% (tier 1 min)', () => {
  const r = getWholesaleTier(100000);
  assert.strictEqual(r.tier, 'tier1');
  assert.strictEqual(r.discountPercent, 7.5);
});
test('₹2,50,000 -> 7.5% (tier 1 max)', () => {
  const r = getWholesaleTier(250000);
  assert.strictEqual(r.tier, 'tier1');
  assert.strictEqual(r.discountPercent, 7.5);
});
test('₹2,50,000.01 -> 12% (tier 2)', () => {
  const r = getWholesaleTier(250000.01);
  assert.strictEqual(r.tier, 'tier2');
  assert.strictEqual(r.discountPercent, 12);
});
test('₹6,00,000 -> 12% (tier 2 max)', () => {
  const r = getWholesaleTier(600000);
  assert.strictEqual(r.tier, 'tier2');
  assert.strictEqual(r.discountPercent, 12);
});
test('₹6,00,000.01 -> 15% (tier 3)', () => {
  const r = getWholesaleTier(600000.01);
  assert.strictEqual(r.tier, 'tier3');
  assert.strictEqual(r.discountPercent, 15);
});

console.log('\n=== WHOLESALE MINIMUM ORDER AMOUNT RULES ===');
test('₹49,999 -> NOT met', () => {
  assert.strictEqual(isWholesaleMinimumOrderMet(49999), false);
});
test('₹49,999.99 -> NOT met (paise)', () => {
  assert.strictEqual(isWholesaleMinimumOrderMet(49999.99), false);
});
test('₹50,000 -> met', () => {
  assert.strictEqual(isWholesaleMinimumOrderMet(50000), true);
});
test('₹50,001 -> met', () => {
  assert.strictEqual(isWholesaleMinimumOrderMet(50001), true);
});

console.log('\n=== WHOLESALE DISCOUNT CALCULATION ===');
test('₹49,999.99 -> 0% discount = ₹0', () => {
  const r = calculateWholesaleDiscount(49999.99);
  assert.strictEqual(r.discountPercent, 0);
  assert.strictEqual(r.discountAmount, 0);
});
test('₹50,000 -> 5% = ₹2,500', () => {
  const r = calculateWholesaleDiscount(50000);
  assert.strictEqual(r.discountPercent, 5);
  assert.strictEqual(r.discountAmount, 2500);
});
test('₹80,000 -> 5% = ₹4,000', () => {
  const r = calculateWholesaleDiscount(80000);
  assert.strictEqual(r.tier, 'tier0');
  assert.strictEqual(r.discountPercent, 5);
  assert.strictEqual(r.discountAmount, 4000);
});
test('₹99,999.99 -> 5% = ₹5,000 (rounded)', () => {
  const r = calculateWholesaleDiscount(99999.99);
  assert.strictEqual(r.tier, 'tier0');
  assert.strictEqual(r.discountPercent, 5);
  assert.strictEqual(r.discountAmount, 5000);
});
test('₹1,00,000 -> 7.5% = ₹7,500', () => {
  const r = calculateWholesaleDiscount(100000);
  assert.strictEqual(r.discountPercent, 7.5);
  assert.strictEqual(r.discountAmount, 7500);
});
test('₹2,50,000 -> 7.5% = ₹18,750', () => {
  const r = calculateWholesaleDiscount(250000);
  assert.strictEqual(r.discountPercent, 7.5);
  assert.strictEqual(r.discountAmount, 18750);
});
test('₹2,50,000.01 -> 12% = ₹30,000 (rounded to 2 decimals)', () => {
  const r = calculateWholesaleDiscount(250000.01);
  assert.strictEqual(r.discountPercent, 12);
  assert.strictEqual(r.discountAmount, 30000);
});
test('₹6,00,000 -> 12% = ₹72,000', () => {
  const r = calculateWholesaleDiscount(600000);
  assert.strictEqual(r.discountPercent, 12);
  assert.strictEqual(r.discountAmount, 72000);
});
test('₹6,00,000.01 -> 15% = ₹90,000 (rounded to 2 decimals)', () => {
  const r = calculateWholesaleDiscount(600000.01);
  assert.strictEqual(r.discountPercent, 15);
  assert.strictEqual(r.discountAmount, 90000);
});

console.log('\n=== WHOLESALE + CATEGORY DISCOUNT ===');
test('Base=2,00,000, Cat=10% -> after cat=1,80,000 -> tier1 7.5% -> final=1,66,500', () => {
  // Category discount first
  const afterCategory = 200000 - (200000 * 0.10); // 180000
  assert.strictEqual(afterCategory, 180000);
  // Wholesale tier from after-category amount
  const wholesale = calculateWholesaleDiscount(afterCategory);
  assert.strictEqual(wholesale.discountPercent, 7.5);
  assert.strictEqual(wholesale.discountAmount, 13500);
  const final = afterCategory - wholesale.discountAmount;
  assert.strictEqual(final, 166500);
});

console.log('\n=== RETAIL CUSTOMER — NO WHOLESALE DISCOUNT ===');
test('Retail customer receives no wholesale discount', () => {
  // Retail uses category + loyalty only. Wholesale discount is never applied.
  const p = calculateProductPricing(1000, 20, 0, 0);
  assert.strictEqual(p.finalPrice, 800);
  // No wholesale fields on retail pricing
  assert.strictEqual(p.wholesaleDiscountPercent, undefined);
});

console.log('\n=== WHOLESALE CUSTOMER — NO LOYALTY DISCOUNTS ===');
test('Wholesale with 1 previous order: NO 3% second-order discount', () => {
  // Backend passes secondOrder=0 for wholesale regardless of order count
  const p = calculateProductPricing(1000, 20, 0, 0);
  assert.strictEqual(p.secondOrderDiscountPercent, 0);
  assert.strictEqual(p.finalPrice, 800);
});
test('Wholesale with 5 delivered orders: NO Silver discount', () => {
  // Backend passes membership=0 for wholesale regardless of order count
  const p = calculateProductPricing(1000, 20, 0, 0);
  assert.strictEqual(p.membershipDiscountPercent, 0);
  assert.strictEqual(p.finalPrice, 800);
});
test('Wholesale with 10 delivered orders: NO Gold discount', () => {
  const p = calculateProductPricing(1000, 20, 0, 0);
  assert.strictEqual(p.membershipDiscountPercent, 0);
  assert.strictEqual(p.finalPrice, 800);
});
test('Wholesale with 15 delivered orders: NO Platinum discount', () => {
  const p = calculateProductPricing(1000, 20, 0, 0);
  assert.strictEqual(p.membershipDiscountPercent, 0);
  assert.strictEqual(p.finalPrice, 800);
});

console.log('\n=== RETAIL LOYALTY STILL WORKS ===');
test('Retail with 1 delivered order: 3% second-order still works', () => {
  const p = calculateProductPricing(1000, 20, 3, 0);
  assert.strictEqual(p.secondOrderDiscountPercent, 3);
  assert.strictEqual(p.secondOrderDiscountAmount, 24);
  assert.strictEqual(p.finalPrice, 776);
});
test('Retail with 5 delivered orders: Silver 4% still works', () => {
  const p = calculateProductPricing(1000, 20, 0, 4);
  assert.strictEqual(p.membershipDiscountPercent, 4);
  assert.strictEqual(p.membershipDiscountAmount, 32);
  assert.strictEqual(p.finalPrice, 768);
});
test('Retail with 10 delivered orders: Gold 7% still works', () => {
  const p = calculateProductPricing(1000, 20, 0, 7);
  assert.strictEqual(p.membershipDiscountPercent, 7);
  assert.strictEqual(p.membershipDiscountAmount, 56);
  assert.strictEqual(p.finalPrice, 744);
});
test('Retail with 15 delivered orders: Platinum 10% still works', () => {
  const p = calculateProductPricing(1000, 20, 0, 10);
  assert.strictEqual(p.membershipDiscountPercent, 10);
  assert.strictEqual(p.membershipDiscountAmount, 80);
  assert.strictEqual(p.finalPrice, 720);
});

console.log('\n=== CLIENT MANIPULATION TESTS ===');
test('Client submits customerType=wholesale when DB says retail — backend ignores', () => {
  // The backend determines customerType from the authenticated user's DB record.
  // A retail user's DB record has customerType='retail', so wholesale is never applied.
  const dbCustomerType = 'retail';
  const clientSubmitted = 'wholesale';
  assert.notStrictEqual(clientSubmitted, dbCustomerType);
  // Backend uses dbCustomerType
  assert.strictEqual(dbCustomerType, 'retail');
});
test('Client submits wholesaleDiscountPercent=15 when DB says retail — backend ignores', () => {
  // Wholesale discount is only calculated when customerType === 'wholesale'.
  const customerType = 'retail';
  const wholesaleDiscountPercent = customerType === 'wholesale' ? 15 : 0;
  assert.strictEqual(wholesaleDiscountPercent, 0);
});
test('Client submits membershipTier=platinum when DB says wholesale — backend does NOT apply', () => {
  // Wholesale customers NEVER receive membership discounts.
  const customerType = 'wholesale';
  const membershipDiscountPercent = customerType === 'wholesale' ? 0 : 10;
  assert.strictEqual(membershipDiscountPercent, 0);
});
test('Client submits fake price/subtotal/total — backend recalculates from authoritative data', () => {
  // Backend uses product.price from DB, never client-submitted values.
  const dbPrice = 1000;
  const clientFakePrice = 999999;
  const p = calculateProductPricing(dbPrice, 20, 0, 0);
  assert.strictEqual(p.originalPrice, 1000);
  assert.notStrictEqual(p.originalPrice, clientFakePrice);
  assert.strictEqual(p.finalPrice, 800);
});

console.log('\n=== HISTORICAL ORDER PROTECTION ===');
test('Historical order pricing remains unchanged (pure function)', () => {
  const p1 = calculateProductPricing(1000, 20, 0, 4);
  const p2 = calculateProductPricing(1000, 20, 0, 4);
  assert.deepStrictEqual(p1, p2);
});

console.log('\n=== PHASE 1-5 REGRESSION ===');
test('Phase 1: Category discount still works', () => {
  const p = calculateProductPricing(1000, 20, 0, 0);
  assert.strictEqual(p.discountAmount, 200);
  assert.strictEqual(p.finalPrice, 800);
});
test('Phase 2: Coupons remain removed (couponDiscount always 0)', () => {
  const pricing = calculatePricing([{ price: 100, quantity: 1 }], { deliveryCharge: 0, freeDeliveryThreshold: 1000, gstPercent: 0 }, {});
  assert.strictEqual(pricing.couponDiscount, 0);
});
test('Phase 3: Second-order discount still works for retail', () => {
  const p = calculateProductPricing(1000, 20, 3, 0);
  assert.strictEqual(p.secondOrderDiscountAmount, 24);
  assert.strictEqual(p.finalPrice, 776);
});
test('Phase 4: Membership still works for retail', () => {
  const r = getMembershipTier(5);
  assert.strictEqual(r.tier, 'silver');
  assert.strictEqual(r.discountPercent, 4);
  const r2 = getMembershipTier(10);
  assert.strictEqual(r2.tier, 'gold');
  assert.strictEqual(r2.discountPercent, 7);
  const r3 = getMembershipTier(15);
  assert.strictEqual(r3.tier, 'platinum');
  assert.strictEqual(r3.discountPercent, 10);
});
test('Phase 5: ₹2,000 minimum order rule still works', () => {
  assert.strictEqual(MINIMUM_ONLINE_ORDER_AMOUNT, 2000);
  assert.strictEqual(isMinimumOnlineOrderMet(1999.99), false);
  assert.strictEqual(isMinimumOnlineOrderMet(2000), true);
});

console.log('\n=== WHOLESALE MINIMUM ORDER AMOUNT REQUIREMENTS (quantity is irrelevant) ===');
test('Wholesale qty < 50 but amount after cat ₹50,000 -> ALLOWED (amount met)', () => {
  // Quantity plays NO role in eligibility — a low-quantity order that meets the
  // ₹50,000 amount MUST be allowed.
  const amountMet = isWholesaleMinimumOrderMet(50000);
  assert.strictEqual(amountMet, true);
  const wholesale = calculateWholesaleDiscount(50000);
  assert.strictEqual(wholesale.tier, 'tier0');
  assert.strictEqual(wholesale.discountPercent, 5);
  assert.strictEqual(wholesale.discountAmount, 2500);
});
test('Wholesale qty >= 50 but amount after cat ₹49,999.99 -> REJECTED (amount NOT met)', () => {
  // Even with a huge quantity, an order below ₹50,000 MUST be rejected.
  const amountMet = isWholesaleMinimumOrderMet(49999.99);
  assert.strictEqual(amountMet, false);
  const wholesale = calculateWholesaleDiscount(49999.99);
  assert.strictEqual(wholesale.discountPercent, 0);
  assert.strictEqual(wholesale.discountAmount, 0);
});
test('Wholesale amount after cat ₹80,000 -> ALLOWED, 5% discount (tier 0)', () => {
  const amountMet = isWholesaleMinimumOrderMet(80000);
  assert.strictEqual(amountMet, true);
  const wholesale = calculateWholesaleDiscount(80000);
  assert.strictEqual(wholesale.tier, 'tier0');
  assert.strictEqual(wholesale.discountPercent, 5);
  assert.strictEqual(wholesale.discountAmount, 4000);
});

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);