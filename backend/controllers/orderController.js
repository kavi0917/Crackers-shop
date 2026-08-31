/* ============================================================
   VENDHAN CRACKERS — Customer Order Controllers
   ============================================================ */

const checkoutService = require('../services/checkoutService');
const asyncHandler = require('../utils/asyncHandler');
const { paginate, paginationMeta } = require('../utils/paginate');

/**
 * GET /api/orders
 * List the authenticated customer's orders with pagination.
 */
const listMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10, maxLimit: 50 });

  const { orders, total } = await checkoutService.listCustomerOrders(req.user._id, { page, limit, skip });

  res.json({
    success: true,
    message: 'Orders retrieved successfully',
    data: {
      orders,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * GET /api/orders/:id
 * Return a single order (security: only the owner's order).
 */
const getOrder = asyncHandler(async (req, res) => {
  const order = await checkoutService.getCustomerOrder(req.user._id, req.params.id);

  res.json({
    success: true,
    message: 'Order retrieved successfully',
    data: { order }
  });
});

/**
 * GET /api/orders/:id/track
 * Return order tracking information.
 */
const trackOrder = asyncHandler(async (req, res) => {
  const tracking = await checkoutService.getOrderTracking(req.user._id, req.params.id);

  res.json({
    success: true,
    message: 'Order tracking retrieved successfully',
    data: tracking
  });
});

/**
 * POST /api/orders/:id/cancel
 * Cancel an order and restore stock.
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await checkoutService.cancelOrder(req.user._id, req.params.id);

  res.json({
    success: true,
    message: 'Order cancelled successfully',
    data: { order }
  });
});

module.exports = {
  listMyOrders,
  getOrder,
  trackOrder,
  cancelOrder
};