/* ============================================================
   VENDHAN CRACKERS — Admin Combo Controllers
   ============================================================ */

const comboService = require('../services/comboService');
const asyncHandler = require('../utils/asyncHandler');
const { paginationMeta } = require('../utils/paginate');

/**
 * GET /api/admin/combos
 * List all combos (including inactive) with pagination.
 */
const listCombos = asyncHandler(async (req, res) => {
  const { combos, total, page, limit } = await comboService.listCombosAdmin(req.query);

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
 * GET /api/admin/combos/:id
 * Return a single combo (including inactive).
 */
const getCombo = asyncHandler(async (req, res) => {
  const combo = await comboService.getComboByIdAdmin(req.params.id);

  res.json({
    success: true,
    message: 'Combo retrieved successfully',
    data: { combo }
  });
});

/**
 * POST /api/admin/combos
 * Create a new combo. Supports multipart/form-data with an optional image file
 * (same pattern as Admin Products) or a plain JSON payload.
 */
const createCombo = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file) {
    data.image = `/uploads/${req.file.filename}`;
  }
  const combo = await comboService.createCombo(data);

  res.status(201).json({
    success: true,
    message: 'Combo created successfully',
    data: { combo }
  });
});

/**
 * PUT /api/admin/combos/:id
 * Update an existing combo. Supports multipart/form-data with an optional image
 * file (same pattern as Admin Products) or a plain JSON payload.
 */
const updateCombo = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file) {
    data.image = `/uploads/${req.file.filename}`;
  }
  const combo = await comboService.updateCombo(req.params.id, data);

  res.json({
    success: true,
    message: 'Combo updated successfully',
    data: { combo }
  });
});

/**
 * DELETE /api/admin/combos/:id
 * Delete/deactivate a combo.
 */
const deleteCombo = asyncHandler(async (req, res) => {
  const result = await comboService.deleteCombo(req.params.id);

  res.json({
    success: true,
    message: result.message,
    data: result
  });
});

module.exports = {
  listCombos,
  getCombo,
  createCombo,
  updateCombo,
  deleteCombo
};