/* ============================================================
   VENDHAN CRACKERS — Admin Order Controllers
   ============================================================ */

const adminOrderService = require('../services/adminOrderService');
const asyncHandler = require('../utils/asyncHandler');
const { paginate, paginationMeta } = require('../utils/paginate');

/**
 * Audit context derived from the backend-authenticated admin (req.admin).
 * Frontend-supplied identity is never used for audit records.
 */
function auditContext(req) {
  return {
    actor: req.admin,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  };
}

/**
 * GET /api/admin/orders
 * List all orders with filters, search, and pagination.
 */
const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10, maxLimit: 50 });

  const { orders, total } = await adminOrderService.listOrders(req.query, { page, limit, skip });

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
 * GET /api/admin/orders/:id
 * Return a single order (admin).
 */
const getOrder = asyncHandler(async (req, res) => {
  const order = await adminOrderService.getOrderById(req.params.id);

  res.json({
    success: true,
    message: 'Order retrieved successfully',
    data: { order }
  });
});

/**
 * PUT /api/admin/orders/:id/status
 * Update an order's status with transition validation.
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await adminOrderService.updateOrderStatus(req.params.id, req.body.status, req.admin._id, auditContext(req));

  res.json({
    success: true,
    message: 'Order status updated successfully',
    data: { order }
  });
});

module.exports = {
  listOrders,
  getOrder,
  updateOrderStatus
};