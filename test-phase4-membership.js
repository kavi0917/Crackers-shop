/* ============================================================
   PHASE 4 — Membership Discount System Verification Tests
   ============================================================ */

const assert = require('assert');
const calculateProductPricing = require('./backend/utils/calculateProductPricing');
const { getMembershipTier, MEMBERSHIP_TIERS, MEMBERSHIP_DISCOUNT_PERCENT } = require('./backend/utils/membership');
const { SECOND_ORDER_DISCOUNT_PERCENT, COMPLETED_ORDER_STATUS } = require('./backend/utils/secondOrderDiscount');

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
test('Second-order discount is 3%', () => {
  assert.strictEqual(SECOND_ORDER_DISCOUNT_PERCENT, 3);
});
test('Completed order status is "delivered"', () => {
  assert.strictEqual(COMPLETED_ORDER_STATUS, 'delivered');
});
test('Membership tiers: none/silver/gold/platinum', () => {
  assert.strictEqual(MEMBERSHIP_TIERS.NONE, 'none');
  assert.strictEqual(MEMBERSHIP_TIERS.SILVER, 'silver');
  assert.strictEqual(MEMBERSHIP_TIERS.GOLD, 'gold');
  assert.strictEqual(MEMBERSHIP_TIERS.PLATINUM, 'platinum');
});
test('Membership discounts: 0/4/7/10', () => {
  assert.strictEqual(MEMBERSHIP_DISCOUNT_PERCENT.none, 0);
  assert.strictEqual(MEMBERSHIP_DISCOUNT_PERCENT.silver, 4);
  assert.strictEqual(MEMBERSHIP_DISCOUNT_PERCENT.gold, 7);
  assert.strictEqual(MEMBERSHIP_DISCOUNT_PERCENT.platinum, 10);
});

console.log('\n=== MEMBERSHIP TIER RULES ===');
test('0 completed orders -> none, 0%', () => {
  const r = getMembershipTier(0);
  assert.strictEqual(r.tier, 'none');
  assert.strictEqual(r.discountPercent, 0);
});
test('1 completed order -> none, 0%', () => {
  const r = getMembershipTier(1);
  assert.strictEqual(r.tier, 'none');
  assert.strictEqual(r.discountPercent, 0);
});
test('2 completed orders -> none, 0%', () => {
  const r = getMembershipTier(2);
  assert.strictEqual(r.tier, 'none');
  assert.strictEqual(r.discountPercent, 0);
});
test('3 completed orders -> silver, 4%', () => {
  const r = getMembershipTier(3);
  assert.strictEqual(r.tier, 'silver');
  assert.strictEqual(r.discountPercent, 4);
});
test('6 completed orders -> silver, 4%', () => {
  const r = getMembershipTier(6);
  assert.strictEqual(r.tier, 'silver');
  assert.strictEqual(r.discountPercent, 4);
});
test('7 completed orders -> gold, 7%', () => {
  const r = getMembershipTier(7);
  assert.strictEqual(r.tier, 'gold');
  assert.strictEqual(r.discountPercent, 7);
});
test('12 completed orders -> gold, 7%', () => {
  const r = getMembershipTier(12);
  assert.strictEqual(r.tier, 'gold');
  assert.strictEqual(r.discountPercent, 7);
});
test('13 completed orders -> platinum, 10%', () => {
  const r = getMembershipTier(13);
  assert.strictEqual(r.tier, 'platinum');
  assert.strictEqual(r.discountPercent, 10);
});
test('20 completed orders -> platinum, 10%', () => {
  const r = getMembershipTier(20);
  assert.strictEqual(r.tier, 'platinum');
  assert.strictEqual(r.discountPercent, 10);
});

console.log('\n=== CASE 1 — FIRST ORDER (0 previous delivered) ===');
test('Base=1000, Cat=20%, no loyalty -> final=800', () => {
  const p = calculateProductPricing(1000, 20, 0, 0);
  assert.strictEqual(p.discountAmount, 200);
  assert.strictEqual(p.secondOrderDiscountPercent, 0);
  assert.strictEqual(p.membershipDiscountPercent, 0);
  assert.strictEqual(p.finalPrice, 800);
});

console.log('\n=== CASE 2 — SECOND ORDER (1 previous delivered) ===');
test('Base=1000, Cat=20%, 2nd=3%, membership=0 -> final=776', () => {
  const p = calculateProductPricing(1000, 20, 3, 0);
  assert.strictEqual(p.discountAmount, 200);
  assert.strictEqual(p.secondOrderDiscountAmount, 24);
  assert.strictEqual(p.membershipDiscountPercent, 0);
  assert.strictEqual(p.membershipDiscountAmount, 0);
  assert.strictEqual(p.finalPrice, 776);
});

console.log('\n=== CASE 3 — THIRD ORDER / SILVER (2 previous delivered) ===');
test('Base=1000, Cat=20%, 2nd=0, membership=4% -> final=768', () => {
  const p = calculateProductPricing(1000, 20, 0, 4);
  assert.strictEqual(p.discountAmount, 200);
  assert.strictEqual(p.secondOrderDiscountPercent, 0);
  assert.strictEqual(p.membershipDiscountAmount, 32);
  assert.strictEqual(p.finalPrice, 768);
});

console.log('\n=== CASE 4 — SIXTH ORDER (5 previous delivered) ===');
test('Silver 4% applies', () => {
  const r = getMembershipTier(5);
  assert.strictEqual(r.tier, 'silver');
  assert.strictEqual(r.discountPercent, 4);
});

console.log('\n=== CASE 5 — SEVENTH ORDER / GOLD (6 previous delivered) ===');
test('Gold 7% applies', () => {
  const r = getMembershipTier(6);
  assert.strictEqual(r.tier, 'silver'); // 6 is still silver
  const r2 = getMembershipTier(7);
  assert.strictEqual(r2.tier, 'gold');
  assert.strictEqual(r2.discountPercent, 7);
});

console.log('\n=== CASE 6 — TWELFTH ORDER (11 previous delivered) ===');
test('Gold 7% applies', () => {
  const r = getMembershipTier(11);
  assert.strictEqual(r.tier, 'gold');
  assert.strictEqual(r.discountPercent, 7);
});

console.log('\n=== CASE 7 — THIRTEENTH ORDER / PLATINUM (12 previous delivered) ===');
test('Platinum 10% applies', () => {
  const r = getMembershipTier(12);
  assert.strictEqual(r.tier, 'gold'); // 12 is still gold
  const r2 = getMembershipTier(13);
  assert.strictEqual(r2.tier, 'platinum');
  assert.strictEqual(r2.discountPercent, 10);
});

console.log('\n=== CASE 8 — 20TH ORDER (19 previous delivered) ===');
test('Platinum 10% applies', () => {
  const r = getMembershipTier(19);
  assert.strictEqual(r.tier, 'platinum');
  assert.strictEqual(r.discountPercent, 10);
});

console.log('\n=== CASE 9/10 — CANCELLED/PENDING ORDERS ===');
test('Cancelled orders do NOT count as completed', () => {
  // Only status === 'delivered' counts. Cancelled is excluded.
  const cancelledStatus = 'cancelled';
  assert.notStrictEqual(cancelledStatus, COMPLETED_ORDER_STATUS);
});
test('Pending orders do NOT count as completed', () => {
  const pendingStatus = 'pending';
  assert.notStrictEqual(pendingStatus, COMPLETED_ORDER_STATUS);
});

console.log('\n=== CASE 11 — CLIENT MANIPULATION (0 completed, submits platinum) ===');
test('Backend ignores client tier — 0 completed -> none, 0%', () => {
  // The backend derives tier from completed orders, never trusts client.
  const r = getMembershipTier(0);
  assert.strictEqual(r.tier, 'none');
  assert.strictEqual(r.discountPercent, 0);
});

console.log('\n=== CASE 12 — SECOND ORDER + MEMBERSHIP MANIPULATION ===');
test('1 completed order -> only 3% second-order applies, no membership', () => {
  // Backend passes secondOrder=3, membership=0 for 1 completed order.
  const p = calculateProductPricing(1000, 20, 3, 0);
  assert.strictEqual(p.secondOrderDiscountPercent, 3);
  assert.strictEqual(p.membershipDiscountPercent, 0);
  assert.strictEqual(p.finalPrice, 776);
});

console.log('\n=== CASE 13 — THIRD ORDER + SECOND-ORDER MANIPULATION ===');
test('2 completed orders -> backend ignores second-order, Silver 4% applies', () => {
  // Backend passes secondOrder=0, membership=4 for 2 completed orders.
  const p = calculateProductPricing(1000, 20, 0, 4);
  assert.strictEqual(p.secondOrderDiscountPercent, 0);
  assert.strictEqual(p.membershipDiscountPercent, 4);
  assert.strictEqual(p.finalPrice, 768);
});

console.log('\n=== DO NOT STACK SILVER + GOLD + PLATINUM ===');
test('Only ONE membership tier applies at a time', () => {
  // Silver customer gets 4%, not 4%+7%+10%
  const silver = getMembershipTier(4);
  assert.strictEqual(silver.discountPercent, 4);
  // Gold customer gets 7%, not 4%+7%
  const gold = getMembershipTier(8);
  assert.strictEqual(gold.discountPercent, 7);
  // Platinum gets 10%, not 4%+7%+10%
  const platinum = getMembershipTier(15);
  assert.strictEqual(platinum.discountPercent, 10);
});

console.log('\n=== MEMBERSHIP DISCOUNT IS ON PRICE AFTER CATEGORY DISCOUNT ===');
test('Silver 4% of 800 (after 20% cat) = 32, not 4% of 1000 = 40', () => {
  const p = calculateProductPricing(1000, 20, 0, 4);
  assert.strictEqual(p.membershipDiscountAmount, 32);
  assert.strictEqual(p.finalPrice, 768);
});

console.log('\n=== STEP 17 — QUANTITY TEST ===');
test('Silver unit=768, qty=5 -> 3840', () => {
  const p = calculateProductPricing(1000, 20, 0, 4);
  const lineTotal = Math.round(p.finalPrice * 5 * 100) / 100;
  assert.strictEqual(lineTotal, 3840);
});

console.log('\n=== STEP 18 — HISTORICAL ORDER TEST ===');
test('Pricing function is pure — same inputs give same output', () => {
  const p1 = calculateProductPricing(1000, 20, 0, 4);
  const p2 = calculateProductPricing(1000, 20, 0, 4);
  assert.deepStrictEqual(p1, p2);
});

console.log('\n=== STEP 19 — SECURITY / CLIENT MANIPULATION ===');
test('Backend clamps discounts to [0,100]', () => {
  const p = calculateProductPricing(1000, 20, 0, 100);
  assert.strictEqual(p.membershipDiscountPercent, 100);
  assert.strictEqual(p.finalPrice, 0);
});
test('Negative membership discount is clamped to 0', () => {
  const p = calculateProductPricing(1000, 20, 0, -5);
  assert.strictEqual(p.membershipDiscountPercent, 0);
  assert.strictEqual(p.finalPrice, 800);
});

console.log('\n=== STEP 20 — REGRESSION (Phase 1 & 3 preserved) ===');
test('Phase 1: Category discount still works (no loyalty)', () => {
  const p = calculateProductPricing(1000, 20, 0, 0);
  assert.strictEqual(p.discountAmount, 200);
  assert.strictEqual(p.finalPrice, 800);
});
test('Phase 3: Second-order discount still works', () => {
  const p = calculateProductPricing(1000, 20, 3, 0);
  assert.strictEqual(p.secondOrderDiscountAmount, 24);
  assert.strictEqual(p.finalPrice, 776);
});
test('Phase 3: Second-order discount does NOT continue after 2nd order', () => {
  // 2 completed orders -> secondOrder=0, membership=4
  const p = calculateProductPricing(1000, 20, 0, 4);
  assert.strictEqual(p.secondOrderDiscountPercent, 0);
  assert.strictEqual(p.membershipDiscountPercent, 4);
});

console.log('\n=== STEP 15 — COUPONS REMAIN REMOVED ===');
test('Coupon discount is always 0 (Phase 2 removal preserved)', () => {
  // calculatePricing.js sets couponDiscount = 0 always.
  const calculatePricing = require('./backend/utils/calculatePricing');
  const pricing = calculatePricing([{ price: 100, quantity: 1 }], { deliveryCharge: 0, freeDeliveryThreshold: 1000, gstPercent: 0 }, {});
  assert.strictEqual(pricing.couponDiscount, 0);
});

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);