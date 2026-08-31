/* ============================================================
   VENDHAN CRACKERS — Admin Auth Controllers
   ============================================================ */

const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/admin/auth/login
 * Login an admin.
 */
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { admin, token } = await authService.loginAdmin({ email, password });

  res.json({
    success: true,
    message: 'Admin login successful',
    data: { admin, token }
  });
});

/**
 * GET /api/admin/auth/me
 * Return the currently authenticated admin.
 */
const adminGetMe = asyncHandler(async (req, res) => {
  const admin = await authService.getCurrentAdmin(req.admin._id);

  res.json({
    success: true,
    message: 'Admin retrieved successfully',
    data: { admin }
  });
});

module.exports = { adminLogin, adminGetMe };