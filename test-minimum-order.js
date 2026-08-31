/* ============================================================
   VENDHAN CRACKERS — Minimum Online Order Value Tests
   ============================================================ */

const assert = require('assert');
const ApiError = require('./backend/utils/ApiError');
const calculateProductPricing = require('./backend/utils/calculateProductPricing');
const {
  calculateAmountAfterCategoryDiscount,
  enforceMinimumOrder
} = require('./backend/services/checkoutService');

/**
 * Build a checkout line item exactly the way checkoutService does:
 *  - product base price (authoritative from DB)
 *  - category discount (authoritative from DB)
 *  - loyalty discount (second-order OR membership, mutually exclusive)
 */
function makeItem(basePrice, categoryDiscount, loyaltyPercent = 0, qty = 1) {
  const isSecondOrder = loyaltyPercent === 3;
  const pricing = calculateProductPricing(
    basePrice,
    categoryDiscount,
    isSecondOrder ? 3 : 0,
    isSecondOrder ? 0 : loyaltyPercent
  );
  return {
    originalPrice: pricing.originalPrice,
    discountAmount: pricing.discountAmount,
    secondOrderDiscountPercent: pricing.secondOrderDiscountPercent,
    secondOrderDiscountAmount: pricing.secondOrderDiscountAmount,
    membershipDiscountPercent: pricing.membershipDiscountPercent,
    membershipDiscountAmount: pricing.membershipDiscountAmount,
    quantity: qty
  };
}

const isBelowMinimumError = (err) =>
  err instanceof ApiError &&
  err.statusCode === 400 &&
  Array.isArray(err.errors) &&
  err.errors.includes('Below minimum order value');

/* ---------------------------------------------------------------- */
/* 1) ₹1,999.99 after category → FAIL                                        */
/* ---------------------------------------------------------------- */
(() => {
  const items = [
    { originalPrice: 2499.99, discountAmount: 500, quantity: 1 } // after category = 1999.99
  ];
  assert.strictEqual(calculateAmountAfterCategoryDiscount(items), 1999.99);
  assert.throws(() => enforceMinimumOrder(items), isBelowMinimumError);
})();

/* ---------------------------------------------------------------- */
/* 2) ₹2,000 after category → PASS                                           */
/* ---------------------------------------------------------------- */
(() => {
  const items = [makeItem(2500, 20)]; // 2500 - 20% = 2000
  assert.strictEqual(calculateAmountAfterCategoryDiscount(items), 2000);
  assert.doesNotThrow(() => enforceMinimumOrder(items));
})();

/* ---------------------------------------------------------------- */
/* 3) ₹2,000 after category + 3% second-order → PASS                            */
/*    Final payable falls BELOW ₹2,000 — order must still be allowed               */
/* ---------------------------------------------------------------- */
(() => {
  const items = [makeItem(2500, 20, 3)]; // after cat 2000, second-order 3% → 1940
  assert.strictEqual(calculateAmountAfterCategoryDiscount(items), 2000);
  assert.strictEqual(items[0].secondOrderDiscountPercent, 3);
  assert.strictEqual(items[0].secondOrderDiscountAmount, 60);
  assert.doesNotThrow(() => enforceMinimumOrder(items));
})();

/* ---------------------------------------------------------------- */
/* 4) ₹2,000 after category + Silver 4% → PASS                                   */
/*    Final payable ₹1,920 (requirement example)                                   */
/* ---------------------------------------------------------------- */
(() => {
  const items = [makeItem(2500, 20, 4)];
  assert.strictEqual(calculateAmountAfterCategoryDiscount(items), 2000);
  assert.strictEqual(items[0].membershipDiscountPercent, 4);
  assert.strictEqual(items[0].membershipDiscountAmount, 80);
  assert.doesNotThrow(() => enforceMinimumOrder(items));
})();

/* ---------------------------------------------------------------- */
/* 5) ₹2,000 after category + Gold 7% → PASS                       */
/* ---------------------------------------------------------------- */
(() => {
  const items = [makeItem(2500, 20, 7)];
  assert.strictEqual(calculateAmountAfterCategoryDiscount(items), 2000);
  assert.strictEqual(items[0].membershipDiscountPercent, 7);
  assert.doesNotThrow(() => enforceMinimumOrder(items));
})();

/* ---------------------------------------------------------------- */
/* 6) ₹2,000 after category + Platinum 10% → PASS                       */
/* ---------------------------------------------------------------- */
(() => {
  const items = [makeItem(2500, 20, 10)];
  assert.strictEqual(calculateAmountAfterCategoryDiscount(items), 2000);
  assert.strictEqual(items[0].membershipDiscountPercent, 10);
  assert.doesNotThrow(() => enforceMinimumOrder(items));
})();

/* ---------------------------------------------------------------- */
/* 7) ₹1,900 after category + ANY loyalty → FAIL                       */
/* ---------------------------------------------------------------- */
[3, 4, 7, 10].forEach((loyaltyPercent) => {
  const items = [makeItem(2500, 24, loyaltyPercent)]; // after cat = 1900
  assert.strictEqual(calculateAmountAfterCategoryDiscount(items), 1900);
  assert.throws(() => enforceMinimumOrder(items), isBelowMinimumError, `loyalty ${loyaltyPercent}% must not rescue ₹1,900 order`);
});

/* ---------------------------------------------------------------- */
/* 8) Client prices are never trusted — we use the backend's prices only */
/* ---------------------------------------------------------------- */
(() => {
  // Client fakes an inflated `price` field on the item.
  // The backend computes the amount ONLY from authoritative originalPrice/discountAmount.
  const tampered = makeItem(2500, 25); // after cat = 1875 → FAILS
  tampered.price = 999999; // client tries to push total above ₹2,000
  tampered.subtotal = 999999;
  assert.strictEqual(calculateAmountAfterCategoryDiscount([tampered]), 1875);
  assert.throws(() => enforceMinimumOrder([tampered]), isBelowMinimumError);

  // Conversely, an order that genuinely meets the minimum must pass
  // even if the client sends a deflated `price`.
  const genuine = makeItem(2500, 20); // after cat = 2000 → PASSES
  genuine.price = 1; // client fakes a low price
  genuine.subtotal = 1;
  assert.strictEqual(calculateAmountAfterCategoryDiscount([genuine]), 2000);
  assert.doesNotThrow(() => enforceMinimumOrder([genuine]));
})();

console.log('All minimum-online-order tests passed ✔');