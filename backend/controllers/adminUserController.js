/* ============================================================
   VENDHAN CRACKERS — Admin User Management Controllers
   ============================================================ */

const adminUserService = require('../services/adminUserService');
const asyncHandler = require('../utils/asyncHandler');
const { paginationMeta } = require('../utils/paginate');

/**
 * GET /api/admin/users
 * List admin users with pagination.
 */
const listAdmins = asyncHandler(async (req, res) => {
  const { admins, total, page, limit } = await adminUserService.listAdmins(req.query);

  res.json({
    success: true,
    message: 'Admin users retrieved successfully',
    data: {
      admins,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * POST /api/admin/users
 * Create a new admin user.
 */
const createAdmin = asyncHandler(async (req, res) => {
  const admin = await adminUserService.createAdmin(req.body);

  res.status(201).json({
    success: true,
    message: 'Admin user created successfully',
    data: { admin }
  });
});

/**
 * PUT /api/admin/users/:id/status
 * Update an admin user's status.
 */
const updateAdminStatus = asyncHandler(async (req, res) => {
  const admin = await adminUserService.updateAdminStatus(req.params.id, req.body.status);

  res.json({
    success: true,
    message: 'Admin user status updated successfully',
    data: { admin }
  });
});

module.exports = {
  listAdmins,
  createAdmin,
  updateAdminStatus
};