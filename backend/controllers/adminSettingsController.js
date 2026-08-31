/* ============================================================
   VENDHAN CRACKERS — Admin Settings Controllers
   ============================================================ */

const settingsService = require('../services/settingsService');
const asyncHandler = require('../utils/asyncHandler');

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
  const settings = await settingsService.updateSettings(req.body);

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