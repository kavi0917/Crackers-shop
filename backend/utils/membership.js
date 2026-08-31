/* ============================================================
   VENDHAN CRACKERS — Membership Eligibility Helper
   ============================================================ */

const { Order } = require('../models');
const { COMPLETED_ORDER_STATUS } = require('./secondOrderDiscount');

/* ---------- Membership Tier Definitions ---------- */
const MEMBERSHIP_TIERS = {
  NONE: 'none',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum'
};

const MEMBERSHIP_DISCOUNT_PERCENT = {
  [MEMBERSHIP_TIERS.NONE]: 0,
  [MEMBERSHIP_TIERS.SILVER]: 4,
  [MEMBERSHIP_TIERS.GOLD]: 7,
  [MEMBERSHIP_TIERS.PLATINUM]: 10
};

/**
 * Determine the membership tier from the number of previously completed orders.
 *
 * The current order is NOT counted — eligibility is based on PREVIOUS
 * delivered orders only.
 *
 *   completedOrders < 3   -> none     (0%)
 *   3 <= completed <= 6   -> silver   (4%)
 *   7 <= completed <= 12  -> gold     (7%)
 *   completed >= 13       -> platinum (10%)
 *
 * @param {number} completedOrders - Number of previously delivered orders
 * @returns {{ tier: string, discountPercent: number }}
 */
function getMembershipTier(completedOrders) {
  const count = Number(completedOrders) || 0;

  if (count >= 13) {
    return { tier: MEMBERSHIP_TIERS.PLATINUM, discountPercent: MEMBERSHIP_DISCOUNT_PERCENT[MEMBERSHIP_TIERS.PLATINUM] };
  }
  if (count >= 7) {
    return { tier: MEMBERSHIP_TIERS.GOLD, discountPercent: MEMBERSHIP_DISCOUNT_PERCENT[MEMBERSHIP_TIERS.GOLD] };
  }
  if (count >= 3) {
    return { tier: MEMBERSHIP_TIERS.SILVER, discountPercent: MEMBERSHIP_DISCOUNT_PERCENT[MEMBERSHIP_TIERS.SILVER] };
  }
  return { tier: MEMBERSHIP_TIERS.NONE, discountPercent: MEMBERSHIP_DISCOUNT_PERCENT[MEMBERSHIP_TIERS.NONE] };
}

/**
 * Determine the membership eligibility for a customer.
 *
 * Counts ONLY previously delivered orders (status === 'delivered').
 * The current order is not yet created, so it is naturally excluded.
 *
 * @param {string} userId - The authenticated customer's ObjectId
 * @returns {Promise<{ tier: string, discountPercent: number, completedOrders: number }>}
 */
async function getMembershipEligibility(userId) {
  const completedOrders = await Order.countDocuments({
    user: userId,
    status: COMPLETED_ORDER_STATUS
  });

  const { tier, discountPercent } = getMembershipTier(completedOrders);

  return {
    tier,
    discountPercent,
    completedOrders
  };
}

module.exports = {
  MEMBERSHIP_TIERS,
  MEMBERSHIP_DISCOUNT_PERCENT,
  getMembershipTier,
  getMembershipEligibility
};