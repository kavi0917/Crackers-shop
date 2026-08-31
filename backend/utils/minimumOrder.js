/* ============================================================
   VENDHAN CRACKERS — Minimum Order Value Helper
   ============================================================ */

/**
 * Default minimum online order value, in ₹.
 *
 * The live value is stored in the Shop Settings document
 * (Setting.minimumOrderAmount, editable under Admin → Settings).
 * This constant is ONLY the fallback used when no setting value
 * has been persisted yet. It matches the project's existing
 * business rule (₹2,000) — the original hard-coded value.
 *
 * The amount is checked AFTER the category discount is applied
 * and BEFORE any second-order (3%) or membership (Silver 4% / Gold 7% / Platinum 10%)
 * discount is applied.
 */
const MINIMUM_ONLINE_ORDER_AMOUNT = 2000;

/**
 * Check whether the amount AFTER category discount meets the
 * minimum online order value requirement.
 *
 * @param {number} amountAfterCategoryDiscount - Total after category
 *        discounts have been applied (base product totals - category discounts).
 * @param {number} [minimumOrderAmount] - The minimum order amount to enforce.
 *        When omitted, MINIMUM_ONLINE_ORDER_AMOUNT (the Settings fallback) is used
 *        for backward compatibility. The runtime callers pass the Shop Settings value.
 * @returns {boolean} - `true` if the order meets the minimum requirement.
 */
function isMinimumOnlineOrderMet(amountAfterCategoryDiscount, minimumOrderAmount) {
  const min = minimumOrderAmount !== undefined && minimumOrderAmount !== null
    ? Number(minimumOrderAmount)
    : MINIMUM_ONLINE_ORDER_AMOUNT;
  return amountAfterCategoryDiscount >= min;
}

module.exports = {
  MINIMUM_ONLINE_ORDER_AMOUNT,
  isMinimumOnlineOrderMet
};