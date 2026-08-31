/* ============================================================
   VENDHAN CRACKERS — Product Pricing Calculator (Category-based)
   ============================================================ */

/**
 * Calculate the final unit price for a product based on its category discount,
 * an optional second-order retail discount, an optional membership discount,
 * and an optional reseller referral discount.
 *
 * This is the SINGLE authoritative source for product pricing.
 * The product's own `discount` field is NOT used for customer pricing.
 *
 * Pricing sequence:
 *   1. Product base price
 *   2. Category discount
 *   3. Loyalty discount (mutually exclusive):
 *      - Second-order retail discount (3% — only for a customer's 2nd completed order)
 *      - OR membership discount (Silver 4% / Gold 7% / Platinum 10%)
 *   4. Referral discount (3% — only for referred retail customers)
 *   5. Final price
 *
 * The loyalty discount is applied ON TOP of the category discount
 * (i.e. it is a percentage of the price AFTER the category discount).
 * The referral discount is applied ON TOP of the loyalty discount
 * (i.e. it is a percentage of the price AFTER category + loyalty).
 *
 * @param {number} basePrice - The product's base price (product.price)
 * @param {number} categoryDiscount - The category's discount percentage (0-100)
 * @param {number} [secondOrderDiscount=0] - Optional second-order discount percentage (0-100)
 * @param {number} [membershipDiscount=0] - Optional membership discount percentage (0-100)
 * @param {number} [referralDiscount=0] - Optional reseller referral discount percentage (0-100)
 * @returns {{
 *   originalPrice: number,
 *   discountPercent: number,
 *   discountAmount: number,
 *   secondOrderDiscountPercent: number,
 *   secondOrderDiscountAmount: number,
 *   membershipDiscountPercent: number,
 *   membershipDiscountAmount: number,
 *   referralDiscountPercent: number,
 *   referralDiscountAmount: number,
 *   finalPrice: number
 * }}
 */
function calculateProductPricing(basePrice, categoryDiscount, secondOrderDiscount = 0, membershipDiscount = 0, referralDiscount = 0) {
  const price = Number(basePrice) || 0;
  const discount = Number(categoryDiscount) || 0;
  const secondDiscount = Number(secondOrderDiscount) || 0;
  const memberDiscount = Number(membershipDiscount) || 0;
  const referDiscount = Number(referralDiscount) || 0;

  // Clamp discounts to valid range [0, 100]
  const safeDiscount = Math.min(Math.max(discount, 0), 100);
  const safeSecondDiscount = Math.min(Math.max(secondDiscount, 0), 100);
  const safeMemberDiscount = Math.min(Math.max(memberDiscount, 0), 100);
  const safeReferDiscount = Math.min(Math.max(referDiscount, 0), 100);

  // Use integer-safe math to avoid floating-point inconsistencies
  const discountAmount = Math.round((price * safeDiscount) / 100 * 100) / 100;
  const priceAfterCategory = Math.round((price - discountAmount) * 100) / 100;

  // Second-order discount is a percentage of the price AFTER the category discount
  const secondOrderDiscountAmount = Math.round((priceAfterCategory * safeSecondDiscount) / 100 * 100) / 100;

  // Membership discount is a percentage of the price AFTER the category discount
  const membershipDiscountAmount = Math.round((priceAfterCategory * safeMemberDiscount) / 100 * 100) / 100;

  // Loyalty discount is mutually exclusive — only one of second-order or membership applies.
  // The caller passes only the applicable one (the other is 0).
  const priceAfterLoyalty = Math.round((priceAfterCategory - secondOrderDiscountAmount - membershipDiscountAmount) * 100) / 100;

  // Referral discount is a percentage of the price AFTER category + loyalty
  const referralDiscountAmount = Math.round((priceAfterLoyalty * safeReferDiscount) / 100 * 100) / 100;

  const finalPrice = Math.round((priceAfterLoyalty - referralDiscountAmount) * 100) / 100;

  return {
    originalPrice: Math.round(price * 100) / 100,
    discountPercent: safeDiscount,
    discountAmount,
    secondOrderDiscountPercent: safeSecondDiscount,
    secondOrderDiscountAmount,
    membershipDiscountPercent: safeMemberDiscount,
    membershipDiscountAmount,
    referralDiscountPercent: safeReferDiscount,
    referralDiscountAmount,
    finalPrice
  };
}

module.exports = calculateProductPricing;