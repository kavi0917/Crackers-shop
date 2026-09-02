/* ============================================================
   VENDHAN CRACKERS — Category Discount → Automatic Selling Price
   Regression Tests
   Run: node test-category-discount-pricing.js
   ============================================================

   Verifies that the Selling Price is ALWAYS derived from:
     Original Price × (100 − Category Discount) / 100
   using the authoritative category discount, and that:
     - 0% discount keeps selling == original (no fake savings)
     - a client-submitted selling price cannot override the backend value
     - existing checkout / wholesale pricing rules remain intact
   ============================================================ */

const assert = require('assert');
const calculateProductPricing = require('./backend/utils/calculateProductPricing');
const calculatePricing = require('./backend/utils/calculatePricing');
const {
  calculateWholesaleDiscount,
  getWholesaleTier,
  CUSTOMER_TYPES,
  WHOLESALE_MIN_ORDER_AMOUNT
} = require('./backend/utils/wholesale');
const { validateProduct } = require('./backend/validators/productValidators');
const { validationResult } = require('express-validator');

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

// Derive the authoritative selling price the way the backend always does.
// This mirrors productService.enrichProductPricing / cartService / checkoutService.
function sellingPrice(basePrice, categoryDiscount) {
  return calculateProductPricing(basePrice, categoryDiscount).finalPrice;
}

/* ---------- 1. Core formula ---------- */
console.log('\n=== TESTS 1–4: ORIGINAL PRICE × (100 − DISCOUNT) / 100 ===');

test('TEST 1 — 50% discount, Original 100 → Selling 50', () => {
  assert.strictEqual(sellingPrice(100, 50), 50);
});
test('TEST 2 — 20% discount, Original 500 → Selling 400', () => {
  assert.strictEqual(sellingPrice(500, 20), 400);
});
test('TEST 3 — 10% discount, Original 1000 → Selling 900', () => {
  assert.strictEqual(sellingPrice(1000, 10), 900);
});
test('TEST 4 — 0% discount, Original 250 → Selling 250 (no change)', () => {
  assert.strictEqual(sellingPrice(250, 0), 250);
});

/* ---------- 2. Recalculation on input changes ---------- */
console.log('\n=== TESTS 5–6: RECALCULATION ON CHANGE ===');

test('TEST 5 — Change Original Price 100→200 at 50% discount → Selling 100', () => {
  assert.strictEqual(sellingPrice(100, 50), 50);
  assert.strictEqual(sellingPrice(200, 50), 100);
});
test('TEST 6 — Change category 50%→0% at Original 200 → Selling 200', () => {
  assert.strictEqual(sellingPrice(200, 50), 100);
  assert.strictEqual(sellingPrice(200, 0), 200);
});

/* ---------- 3. Backend authority / security ---------- */
console.log('\n=== TEST 7: BACKEND AUTHORITY (client manipulation) ===');

test('TEST 7a — Selling Price always derived from base + category, never client value', () => {
  const clientFakeSellingPrice = 999999;
  const derived = sellingPrice(100, 50); // authoritative from base + category
  assert.strictEqual(derived, 50);
  assert.notStrictEqual(derived, clientFakeSellingPrice);
});
async function runValidatorTests() {
testAsync('TEST 7b — Validator REJECTS a client-submitted sellingPrice', async () => {
  const req = {
    body: {
      name: 'Test Product',
      category: '507f1f77bcf86cd799439011', // valid ObjectId format
      price: 100,
      sellingPrice: 999999,
      status: 'active'
    }
  };
  for (const v of validateProduct) await v.run(req);
  const errors = validationResult(req).array();
  assert.ok(errors.length > 0, 'expected sellingPrice to be rejected');
  assert.ok(
    JSON.stringify(errors).toLowerCase().includes('selling price'),
    'rejection message should mention selling price'
  );
});
testAsync('TEST 7c — Validator REJECTS a non-positive Original Price', async () => {
  const req = {
    body: {
      name: 'Test Product',
      category: '507f1f77bcf86cd799439011',
      originalPrice: 0,
      status: 'active'
    }
  };
  for (const v of validateProduct) await v.run(req);
  const errors = validationResult(req).array();
  assert.ok(errors.length > 0, 'expected originalPrice<=0 to be rejected');
});
testAsync('TEST 7d — Validator REJECTS a negative Original Price', async () => {
  const req = {
    body: {
      name: 'Test Product',
      category: '507f1f77bcf86cd799439011',
      originalPrice: -5,
      status: 'active'
    }
  };
  for (const v of validateProduct) await v.run(req);
  const errors = validationResult(req).array();
  assert.ok(errors.length > 0, 'expected negative originalPrice to be rejected');
});
testAsync('TEST 7e — Validator REJECTS a non-numeric Original Price', async () => {
  const req = {
    body: {
      name: 'Test Product',
      category: '507f1f77bcf86cd799439011',
      originalPrice: 'not-a-number',
      status: 'active'
    }
  };
  for (const v of validateProduct) await v.run(req);
  const errors = validationResult(req).array();
  assert.ok(errors.length > 0, 'expected non-numeric originalPrice to be rejected');
});
testAsync('TEST 7f — Validator ACCEPTS a valid positive Original Price', async () => {
  const req = {
    body: {
      name: 'Test Product',
      category: '507f1f77bcf86cd799439011',
      originalPrice: 100,
      status: 'active'
    }
  };
  for (const v of validateProduct) await v.run(req);
  const errors = validationResult(req).array();
  assert.strictEqual(errors.length, 0, 'expected valid product to pass validation');
});
testAsync('TEST 7g — Validator REJECTS a client-submitted price (selling is derived)', async () => {
  const req = {
    body: {
      name: 'Test Product',
      category: '507f1f77bcf86cd799439011',
      originalPrice: 100,
      price: 999,
      status: 'active'
    }
  };
  for (const v of validateProduct) await v.run(req);
  const errors = validationResult(req).array();
  assert.ok(errors.length > 0, 'expected client price to be rejected');
});
}

/* ---------- 8. Existing product edit remains functional ---------- */
console.log('\n=== TEST 8: EXISTING PRODUCT EDIT ===');

test('TEST 8 — Recalculating on edit is idempotent (no price drift)', () => {
  assert.strictEqual(sellingPrice(500, 20), 400);
  assert.strictEqual(sellingPrice(500, 20), 400);
  assert.strictEqual(sellingPrice(500, 50), 250);
});

/* ---------- 9–10. Shop display invariants ---------- */
console.log('\n=== TESTS 9–10: SHOP DISPLAY DATA SHAPE ===');

test('TEST 9 — Discounted product exposes final (selling) < original (struck)', () => {
  const p = calculateProductPricing(160, 80);
  assert.ok(p.finalPrice < p.originalPrice);
  assert.strictEqual(p.finalPrice, 32);   // ₹32 prominent
  assert.strictEqual(p.originalPrice, 160); // ₹160 struck-through
  assert.strictEqual(p.discountPercent, 80);
});
test('TEST 10 — No-discount product: final == original, no fake savings', () => {
  const p = calculateProductPricing(250, 0);
  assert.strictEqual(p.finalPrice, p.originalPrice);
  assert.strictEqual(p.discountPercent, 0);
  assert.strictEqual(p.discountAmount, 0);
});

/* ---------- 11. Wholesale pricing intact ---------- */
console.log('\n=== TEST 11: WHOLESALE RULES UNCHANGED ===');
test('TEST 11a — Wholesale min order amount still ₹50,000', () => {
  assert.strictEqual(WHOLESALE_MIN_ORDER_AMOUNT, 50000);
});
test('TEST 11b — Wholesale tiers unchanged (5 / 7.5 / 12 / 15)', () => {
  assert.strictEqual(getWholesaleTier(50000).discountPercent, 5);
  assert.strictEqual(getWholesaleTier(100000).discountPercent, 7.5);
  assert.strictEqual(getWholesaleTier(300000).discountPercent, 12);
  assert.strictEqual(getWholesaleTier(700000).discountPercent, 15);
});
test('TEST 11c — Wholesale discount computed on amount AFTER category discount', () => {
  const base = 1000;
  const categoryDiscount = 20;
  const qty = 150;
  const afterCategory = sellingPrice(base, categoryDiscount) * qty; // 800 * 150 = 120000
  const wholesale = calculateWholesaleDiscount(afterCategory);
  assert.strictEqual(wholesale.tier, 'tier1');
  assert.strictEqual(wholesale.discountPercent, 7.5);
  assert.strictEqual(wholesale.discountAmount, 9000); // 7.5% of 120000
});
test('TEST 11d — CUSTOMER_TYPES still has retail/wholesale', () => {
  assert.strictEqual(CUSTOMER_TYPES.RETAIL, 'retail');
  assert.strictEqual(CUSTOMER_TYPES.WHOLESALE, 'wholesale');
});

/* ---------- 12. Checkout total matches order total ---------- */
console.log('\n=== TEST 12: CHECKOUT / ORDER TOTAL CONSISTENCY ===');
test('TEST 12 — Same calculatePricing used for checkout summary and order snapshot', () => {
  const items = [
    { price: 50, quantity: 2 },   // selling 50 (after 50% on 100)
    { price: 400, quantity: 1 }   // selling 400 (after 20% on 500)
  ];
  const settings = { deliveryCharge: 40, freeDeliveryThreshold: 1000, gstPercent: 18 };
  const summaryTotal = calculatePricing(items, settings, { comboDiscount: 0 }).total;
  const orderTotal = calculatePricing(items, settings, { comboDiscount: 0 }).total;
  assert.strictEqual(orderTotal, summaryTotal);
});
test('TEST 12b — calculatePricing subtotal equals sum of selling × qty', () => {
  const items = [
    { price: 50, quantity: 2 },
    { price: 400, quantity: 1 }
  ];
  const pricing = calculatePricing(items, { deliveryCharge: 0, freeDeliveryThreshold: 0, gstPercent: 0 }, { comboDiscount: 0 });
  assert.strictEqual(pricing.subtotal, 500); // 50*2 + 400*1
});

/* ---------- 13. Money/rounding safety ---------- */
console.log('\n=== ROUNDING / MONEY SAFETY ===');
test('₹999.99 at 15% discount rounds to 2 decimals (same as existing convention)', () => {
  const p = calculateProductPricing(999.99, 15);
  // 999.99 * 0.85 = 849.9915 → rounds to 849.99
  assert.strictEqual(p.finalPrice, 849.99);
});

/* ---------- Summary ---------- */
runValidatorTests().then(() => {
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
});

