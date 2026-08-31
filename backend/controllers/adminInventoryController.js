/* ============================================================
   VENDHAN CRACKERS — Admin Inventory Controllers
   ============================================================ */

const adminInventoryService = require('../services/adminInventoryService');
const asyncHandler = require('../utils/asyncHandler');
const { paginate, paginationMeta } = require('../utils/paginate');

/**
 * GET /api/admin/inventory
 * List inventory with search, filters, and pagination.
 */
const listInventory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10, maxLimit: 50 });

  const { inventory, total } = await adminInventoryService.listInventory(req.query, { page, limit, skip });

  res.json({
    success: true,
    message: 'Inventory retrieved successfully',
    data: {
      inventory,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * GET /api/admin/inventory/low-stock
 * Products flagged for low-stock alerts (stock > 0 AND stock <= global lowStockThreshold).
 */
const listLowStock = asyncHandler(async (req, res) => {
  const products = await adminInventoryService.listLowStock();

  res.json({
    success: true,
    message: 'Low stock products retrieved successfully',
    data: { products }
  });
});

/**
 * GET /api/admin/inventory/out-of-stock
 * Products where stock === 0.
 */
const listOutOfStock = asyncHandler(async (req, res) => {
  const products = await adminInventoryService.listOutOfStock();

  res.json({
    success: true,
    message: 'Out of stock products retrieved successfully',
    data: { products }
  });
});

/**
 * PUT /api/admin/inventory/:productId
 * Update stock for a product.
 */
const updateStock = asyncHandler(async (req, res) => {
  const product = await adminInventoryService.updateStock(req.params.productId, req.body, req.admin._id);

  res.json({
    success: true,
    message: 'Inventory updated successfully',
    data: { product }
  });
});

/**
 * GET /api/admin/inventory/:productId/history
 * Return inventory transaction history for a product.
 */
const getInventoryHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 10, maxLimit: 50 });

  const { transactions, total } = await adminInventoryService.getInventoryHistory(req.params.productId, { page, limit, skip });

  res.json({
    success: true,
    message: 'Inventory history retrieved successfully',
    data: {
      transactions,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

module.exports = {
  listInventory,
  listLowStock,
  listOutOfStock,
  updateStock,
  getInventoryHistory
};