/* ============================================================
   VENDHAN CRACKERS — Admin Settings Controllers
   ============================================================ */

const settingsService = require('../services/settingsService');
const asyncHandler = require('../utils/asyncHandler');

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
 * GET /api/admin/settings
 * Return shop configuration.
 */
const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettingsAdmin();

  res.json({
    success: true,
    message: 'Settings retrieved successfully',
    data: { settings }
  });
});

/**
 * PUT /api/admin/settings
 * Update shop configuration.
 */
const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body, auditContext(req));

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: { settings }
  });
});

module.exports = {
  getSettings,
  updateSettings
};