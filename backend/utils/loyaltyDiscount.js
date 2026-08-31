/* ============================================================
   VENDHAN CRACKERS — Loyalty Discount Helper (Mutually Exclusive)
   ============================================================ */

const { getSecondOrderEligibility } = require('./secondOrderDiscount');
const { getMembershipEligibility } = require('./membership');

/**
 * Determine the applicable loyalty discount for a customer.
 *
 * The loyalty discount is MUTUALLY EXCLUSIVE:
 *   - 2nd completed order  -> secondOrderDiscount = 3%, membership = 0
 *   - Silver (3-6)         -> membership = 4%, secondOrder = 0
 *   - Gold (7-12)          -> membership = 7%, secondOrder = 0
 *   - Platinum (13+)       -> membership = 10%, secondOrder = 0
 *   - otherwise            -> both = 0
 *
 * The current order is NOT counted — eligibility is based on PREVIOUS
 * delivered orders only (status === 'delivered').
 *
 * @param {string} userId - The authenticated customer's ObjectId
 * @returns {Promise<{
 *   secondOrderDiscountPercent: number,
 *   membershipTier: string,
 *   membershipDiscountPercent: number,
 *   completedOrders: number
 * }>}
 */
async function getLoyaltyDiscount(userId) {
  // Both helpers count the same completed orders (status === 'delivered').
  // Run them in parallel for efficiency.
  const [secondOrder, membership] = await Promise.all([
    getSecondOrderEligibility(userId),
    getMembershipEligibility(userId)
  ]);

  // Mutually exclusive: second order takes precedence over membership.
  // Membership starts from the 3rd completed order, so there is no overlap.
  if (secondOrder.eligible) {
    return {
      secondOrderDiscountPercent: secondOrder.discountPercent,
      membershipTier: membership.tier,
      membershipDiscountPercent: 0,
      completedOrders: membership.completedOrders
    };
  }

  return {
    secondOrderDiscountPercent: 0,
    membershipTier: membership.tier,
    membershipDiscountPercent: membership.discountPercent,
    completedOrders: membership.completedOrders
  };
}

module.exports = {
  getLoyaltyDiscount
};