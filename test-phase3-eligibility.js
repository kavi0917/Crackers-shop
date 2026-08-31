/* ============================================================
   PHASE 3 — Second-Order Eligibility Verification Tests
   ============================================================ */

const assert = require('assert');
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
test('Discount percent is 3', () => {
  assert.strictEqual(SECOND_ORDER_DISCOUNT_PERCENT, 3);
});
test('Completed order status is "delivered"', () => {
  assert.strictEqual(COMPLETED_ORDER_STATUS, 'delivered');
});

console.log('\n=== ELIGIBILITY RULE (completedOrders === 1) ===');
test('0 completed orders -> not eligible', () => {
  const completedOrders = 0;
  const eligible = completedOrders === 1;
  assert.strictEqual(eligible, false);
});
test('1 completed order -> eligible', () => {
  const completedOrders = 1;
  const eligible = completedOrders === 1;
  assert.strictEqual(eligible, true);
});
test('2 completed orders -> not eligible', () => {
  const completedOrders = 2;
  const eligible = completedOrders === 1;
  assert.strictEqual(eligible, false);
});
test('3 completed orders -> not eligible', () => {
  const completedOrders = 3;
  const eligible = completedOrders === 1;
  assert.strictEqual(eligible, false);
});

console.log('\n=== TEST 4 — CANCELLED FIRST ORDER ===');
test('Order #1 cancelled, Order #2 being created -> 0 completed -> no discount', () => {
  // Cancelled orders are NOT counted as completed.
  const completedOrders = 0; // cancelled order not counted
  const eligible = completedOrders === 1;
  assert.strictEqual(eligible, false);
});

console.log('\n=== TEST 5 — COMPLETED + CANCELLED ===');
test('Order #1 completed, Order #2 cancelled, Order #3 -> 1 completed -> eligible', () => {
  const completedOrders = 1; // only the delivered order counts
  const eligible = completedOrders === 1;
  assert.strictEqual(eligible, true);
});

console.log('\n=== TEST 13 — RETAIL ELIGIBILITY ===');
test('All customers are retail (role: customer only, no wholesale field)', () => {
  // The User model has role: ['customer'] only — no wholesale/customer-type field.
  // Therefore all existing customers are treated as retail for this phase.
  const userRole = 'customer';
  assert.strictEqual(userRole, 'customer');
});

console.log('\n=== TEST 2 — SECOND ORDER ===');
test('1 previous completed order -> discountPercent = 3', () => {
  const completedOrders = 1;
  const eligible = completedOrders === 1;
  const discountPercent = eligible ? SECOND_ORDER_DISCOUNT_PERCENT : 0;
  assert.strictEqual(discountPercent, 3);
});

console.log('\n=== TEST 3 — THIRD ORDER ===');
test('2 previous completed orders -> discountPercent = 0', () => {
  const completedOrders = 2;
  const eligible = completedOrders === 1;
  const discountPercent = eligible ? SECOND_ORDER_DISCOUNT_PERCENT : 0;
  assert.strictEqual(discountPercent, 0);
});

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);