/* ============================================================
   VENDHAN CRACKERS — Admin Auth Controllers
   ============================================================ */

const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const auditLogService = require('../services/auditLogService');

/**
 * POST /api/admin/auth/login
 * Login an admin.
 */
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { admin, token } = await authService.loginAdmin({ email, password });

  // Phase 8 — audit record for admin LOGIN (best-effort; only after a
  // successful authentication). The actor is the just-authenticated admin
  // returned by the backend — never a client-supplied identity.
  await auditLogService.createAuditLog({
    actor: admin,
    action: 'LOGIN',
    module: 'AUTH',
    targetId: admin._id || admin.id,
    targetType: 'Admin',
    description: `Admin "${admin.email}" logged in`,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

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