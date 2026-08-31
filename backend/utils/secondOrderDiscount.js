/* ============================================================
   VENDHAN CRACKERS — Second-Order Retail Discount Helper
   ============================================================ */

const { Order } = require('../models');

/**
 * The second-order retail discount percentage.
 * A retail customer placing their SECOND successfully completed order
 * receives this additional discount on top of the category discount.
 */
const SECOND_ORDER_DISCOUNT_PERCENT = 3;

/**
 * The order status that represents a "completed" order.
 * In this project, the terminal success state is `delivered`
 * (pending → confirmed → packed → delivered).
 */
const COMPLETED_ORDER_STATUS = 'delivered';

/**
 * Determine whether the authenticated retail customer is eligible for the
 * second-order discount.
 *
 * Eligibility: the customer has EXACTLY ONE previously completed order.
 * The current order is NOT counted.
 *
 * @param {string} userId - The authenticated customer's ObjectId
 * @returns {Promise<{ eligible: boolean, completedOrders: number, discountPercent: number }>}
 */
async function getSecondOrderEligibility(userId) {
  // Count the customer's previously COMPLETED (delivered) orders.
  // The current order is not yet created, so it is naturally excluded.
  const completedOrders = await Order.countDocuments({
    user: userId,
    status: COMPLETED_ORDER_STATUS
  });

  const eligible = completedOrders === 1;

  return {
    eligible,
    completedOrders,
    discountPercent: eligible ? SECOND_ORDER_DISCOUNT_PERCENT : 0
  };
}

module.exports = {
  SECOND_ORDER_DISCOUNT_PERCENT,
  COMPLETED_ORDER_STATUS,
  getSecondOrderEligibility
};