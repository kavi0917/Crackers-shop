/* ============================================================
   VENDHAN CRACKERS — Combo Controllers (Public)
   ============================================================ */

const comboService = require('../services/comboService');
const asyncHandler = require('../utils/asyncHandler');
const { paginationMeta } = require('../utils/paginate');

/**
 * GET /api/combos
 * List active combos with pagination.
 */
const listCombos = asyncHandler(async (req, res) => {
  const { combos, total, page, limit } = await comboService.listActiveCombos(req.query);

  res.json({
    success: true,
    message: 'Combos retrieved successfully',
    data: {
      combos,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * GET /api/combos/:id
 * Return a single active combo with full details.
 */
const getCombo = asyncHandler(async (req, res) => {
  const combo = await comboService.getComboById(req.params.id);

  res.json({
    success: true,
    message: 'Combo retrieved successfully',
    data: { combo }
  });
});

/**
 * POST /api/combos/:id/add-to-cart
 * Add a (optionally customized) combo to the authenticated customer's cart.
 * Body: { items: [productId, ...] } — optional customer product picks, one per
 * combo slot. Backend still validates active status, availability and stock and
 * is the final authority.
 */
const addComboToCart = asyncHandler(async (req, res) => {
  const customProducts = req.body && Array.isArray(req.body.items) ? req.body.items : null;
  const cart = await comboService.addComboToCart(req.user._id, req.params.id, customProducts);

  res.json({
    success: true,
    message: 'Combo added to cart successfully',
    data: { cart }
  });
});

module.exports = {
  listCombos,
  getCombo,
  addComboToCart
};