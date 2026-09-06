/* ============================================================
   VENDHAN CRACKERS — Admin Customer Controllers
   ============================================================ */

const adminCustomerService = require('../services/adminCustomerService');
const asyncHandler = require('../utils/asyncHandler');
const { paginationMeta } = require('../utils/paginate');

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
 * GET /api/admin/customers
 * List customers with search, status filter, sorting, and pagination.
 */
const listCustomers = asyncHandler(async (req, res) => {
  const { customers, total, page, limit } = await adminCustomerService.listCustomers(req.query);

  res.json({
    success: true,
    message: 'Customers retrieved successfully',
    data: {
      customers,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * GET /api/admin/customers/:id
 * Return a single customer with order stats.
 */
const getCustomer = asyncHandler(async (req, res) => {
  const customer = await adminCustomerService.getCustomerById(req.params.id);

  res.json({
    success: true,
    message: 'Customer retrieved successfully',
    data: { customer }
  });
});

/**
 * GET /api/admin/customers/:id/orders
 * List a customer's orders with pagination.
 */
const listCustomerOrders = asyncHandler(async (req, res) => {
  const { orders, total, page, limit } = await adminCustomerService.listCustomerOrders(req.params.id, req.query);

  res.json({
    success: true,
    message: 'Customer orders retrieved successfully',
    data: {
      orders,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * PUT /api/admin/customers/:id/status
 * Update a customer's account status.
 */
const updateCustomerStatus = asyncHandler(async (req, res) => {
  const customer = await adminCustomerService.updateCustomerStatus(req.params.id, req.body.status, auditContext(req));

  res.json({
    success: true,
    message: 'Customer status updated successfully',
    data: { customer }
  });
});

/**
 * PUT /api/admin/customers/:id/type
 * Update a customer's customer type (retail/wholesale).
 */
const updateCustomerType = asyncHandler(async (req, res) => {
  const customer = await adminCustomerService.updateCustomerType(req.params.id, req.body.customerType, auditContext(req));

  res.json({
    success: true,
    message: 'Customer type updated successfully',
    data: { customer }
  });
});

module.exports = {
  listCustomers,
  getCustomer,
  listCustomerOrders,
  updateCustomerStatus,
  updateCustomerType
};
