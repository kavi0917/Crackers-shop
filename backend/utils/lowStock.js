/* ============================================================
   VENDHAN CRACKERS — Low Stock Alert Helper
   ============================================================
   The GLOBAL low-stock alert threshold is defined in Admin → Settings
   (Setting.lowStockThreshold) and is the single source of truth for
   low-stock ALERTS (Dashboard count/list + Inventory low-stock list).

   The per-product `reorderLevel` only drives the general stock-status
   pill (In/Low/Out) in the main inventory view — NOT low-stock alerts.
   ============================================================ */

const { Setting } = require('../models');

// Safe fallback matching the Setting schema default. This is NOT the live
// threshold — Admin → Settings is the source of truth. It only protects the
// dashboard if the setting is ever missing/invalid.
const DEFAULT_LOW_STOCK_THRESHOLD = 20;

/**
 * Read the current global low-stock alert threshold from Admin Settings.
 * Falls back to the Setting schema default if missing/invalid so the
 * dashboard never breaks.
 *
 * @returns {Promise<number>}
 */
async function getLowStockThreshold() {
  try {
    const settings = await Setting.getSettings();
    const threshold = Number(settings.lowStockThreshold);
    if (Number.isFinite(threshold) && threshold >= 0) {
      return threshold;
    }
  } catch (err) {
    // fall through to the safe default
  }
  return DEFAULT_LOW_STOCK_THRESHOLD;
}

/**
 * Mongo filter for low-stock ALERT products:
 *   stock > 0  AND  stock <= threshold
 * Out of stock (stock === 0) is intentionally excluded and remains
 * handled separately as "Out of Stock".
 *
 * @param {number} threshold - global low-stock threshold
 * @returns {object} Mongo query fragment
 */
function buildLowStockFilter(threshold) {
  return {
    $expr: {
      $and: [
        { $gt: ['$stock', 0] },
        { $lte: ['$stock', threshold] }
      ]
    }
  };
}

module.exports = {
  getLowStockThreshold,
  buildLowStockFilter,
  DEFAULT_LOW_STOCK_THRESHOLD
};
