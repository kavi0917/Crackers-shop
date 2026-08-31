/* ============================================================
   VENDHAN CRACKERS — Public Settings Controllers
   ============================================================ */

const settingsService = require('../services/settingsService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/settings
 * Return the public (non-sensitive) shop configuration.
 * Includes `freeDeliveryThreshold` so customer-facing pages can render
 * the exact free-delivery rule that checkout uses as its source of truth.
 */
const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getPublicSettings();

  res.json({
    success: true,
    message: 'Settings retrieved successfully',
    data: { settings }
  });
});

module.exports = {
  getPublicSettings
};