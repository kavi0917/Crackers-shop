/* ============================================================
   VENDHAN CRACKERS — Wholesale Pricing Helper
   ============================================================ */

/**
 * Wholesale customer type constants.
 */
const CUSTOMER_TYPES = {
  RETAIL: 'retail',
  WHOLESALE: 'wholesale'
};

/**
 * Minimum ORDER AMOUNT (₹) required before a wholesale order is eligible.
 *
 * This is the SINGLE SOURCE OF TRUTH for the wholesale minimum-order rule —
 * both the frontend-exposed cart/checkout summaries and the backend validators
 * derive their threshold from this constant, so they can never disagree.
 *
 * The "applicable wholesale order/cart amount" is the amount AFTER category
 * discount — the SAME basis used to determine the wholesale discount tier —
 * i.e. BEFORE any wholesale or other discount is applied. Total product
 * QUANTITY plays no role in wholesale eligibility.
 */
const WHOLESALE_MIN_ORDER_AMOUNT = 50000;

/**
 * Wholesale discount tiers — based on the amount AFTER category discount
 * and BEFORE wholesale discount.
 *
 *   Tier 0: ₹50,000 to ₹99,999.99 inclusive   -> 5%
 *   Tier 1: ₹1,00,000 to ₹2,50,000 inclusive  -> 7.5%
 *   Tier 2: > ₹2,50,000 to ₹6,00,000 inclusive -> 12%
 *   Tier 3: > ₹6,00,000                        -> 15%
 *   Below ₹50,000                              -> 0%
 */
const WHOLESALE_TIER_0_MIN = 50000;
const WHOLESALE_TIER_0_MAX = 99999.99;
const WHOLESALE_TIER_0_DISCOUNT = 5;

const WHOLESALE_TIER_1_MIN = 100000;
const WHOLESALE_TIER_1_MAX = 250000;
const WHOLESALE_TIER_1_DISCOUNT = 7.5;

const WHOLESALE_TIER_2_MAX = 600000;
const WHOLESALE_TIER_2_DISCOUNT = 12;

const WHOLESALE_TIER_3_DISCOUNT = 15;

/**
 * Determine the wholesale discount tier from the amount AFTER category discount.
 *
 * @param {number} amountAfterCategoryDiscount - Total after category discounts.
 * @returns {{ tier: string|null, discountPercent: number }}
 *   - tier: 'tier0' | 'tier1' | 'tier2' | 'tier3' | null (null = no wholesale discount)
 *   - discountPercent: 5 | 7.5 | 12 | 15 | 0
 */
function getWholesaleTier(amountAfterCategoryDiscount) {
  const amount = Number(amountAfterCategoryDiscount) || 0;

  if (amount >= WHOLESALE_TIER_0_MIN && amount <= WHOLESALE_TIER_0_MAX) {
    return { tier: 'tier0', discountPercent: WHOLESALE_TIER_0_DISCOUNT };
  }
  if (amount >= WHOLESALE_TIER_1_MIN && amount <= WHOLESALE_TIER_1_MAX) {
    return { tier: 'tier1', discountPercent: WHOLESALE_TIER_1_DISCOUNT };
  }
  if (amount > WHOLESALE_TIER_1_MAX && amount <= WHOLESALE_TIER_2_MAX) {
    return { tier: 'tier2', discountPercent: WHOLESALE_TIER_2_DISCOUNT };
  }
  if (amount > WHOLESALE_TIER_2_MAX) {
    return { tier: 'tier3', discountPercent: WHOLESALE_TIER_3_DISCOUNT };
  }
  return { tier: null, discountPercent: 0 };
}

/**
 * Check whether the wholesale order/cart amount meets the wholesale minimum
 * ORDER AMOUNT requirement (₹50,000).
 *
 * @param {number} amountAfterCategoryDiscount - The applicable wholesale
 *        order/cart amount (amount after category discount, before wholesale
 *        discount). Quantity is NOT considered here.
 * @returns {boolean} - `true` if amountAfterCategoryDiscount >= ₹50,000.
 */
function isWholesaleMinimumOrderMet(amountAfterCategoryDiscount) {
  return Number(amountAfterCategoryDiscount) >= WHOLESALE_MIN_ORDER_AMOUNT;
}

/**
 * User-facing validation message shown when a wholesale order does not meet
 * the minimum order amount requirement.
 *
 * Built from the single constant so the ₹50,000 value is never hard-coded
 * anywhere else.
 *
 * @returns {string} - e.g. "Wholesale orders require a minimum order amount of ₹50,000."
 */
function getWholesaleMinimumOrderMessage() {
  return `Wholesale orders require a minimum order amount of ₹${WHOLESALE_MIN_ORDER_AMOUNT.toLocaleString('en-IN')}.`;
}

/**
 * Calculate the wholesale discount amount for a given amount after category discount.
 *
 * @param {number} amountAfterCategoryDiscount - Total after category discounts.
 * @returns {{ tier: string|null, discountPercent: number, discountAmount: number }}
 */
function calculateWholesaleDiscount(amountAfterCategoryDiscount) {
  const amount = Number(amountAfterCategoryDiscount) || 0;
  const { tier, discountPercent } = getWholesaleTier(amount);
  const discountAmount = Math.round((amount * discountPercent) / 100 * 100) / 100;

  return { tier, discountPercent, discountAmount };
}

module.exports = {
  CUSTOMER_TYPES,
  WHOLESALE_MIN_ORDER_AMOUNT,
  WHOLESALE_TIER_0_MIN,
  WHOLESALE_TIER_0_MAX,
  WHOLESALE_TIER_0_DISCOUNT,
  WHOLESALE_TIER_1_MIN,
  WHOLESALE_TIER_1_MAX,
  WHOLESALE_TIER_1_DISCOUNT,
  WHOLESALE_TIER_2_MAX,
  WHOLESALE_TIER_2_DISCOUNT,
  WHOLESALE_TIER_3_DISCOUNT,
  getWholesaleTier,
  isWholesaleMinimumOrderMet,
  getWholesaleMinimumOrderMessage,
  calculateWholesaleDiscount
};
