/* ============================================================
   VENDHAN CRACKERS — Admin Inventory Service
   ============================================================ */

const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const ApiError = require('../utils/ApiError');
const { getLowStockThreshold, buildLowStockFilter } = require('../utils/lowStock');

/**
 * Compute the Inventory table Stock Status from stock and the GLOBAL
 * Admin Settings lowStockThreshold. The per-product `reorderLevel` no longer
 * determines this — it is only displayed in the table.
 *
 *   stock <= 0                    → 'out_of_stock'
 *   stock > 0 AND stock <= threshold → 'low_stock'
 *   stock > threshold             → 'in_stock'
 */
function getStockStatus(stock, lowStockThreshold) {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

/**
 * Build the inventory filter from query params.
 * Supports: search, status (in_stock/low_stock/out_of_stock), category.
 * The low_stock/in_stock status filters use the GLOBAL lowStockThreshold
 * (consistent with the table's Stock Status pill).
 */
function buildInventoryFilter(query, lowStockThreshold) {
  const filter = { status: 'active' };

  // Search by product name
  if (query.search) {
    const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.name = searchRegex;
  }

  // Category filter
  if (query.category) {
    if (!query.category.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, 'Invalid category ID', ['Category must be a valid ObjectId']);
    }
    filter.category = query.category;
  }

  // Stock status filter
  if (query.status) {
    switch (query.status) {
      case 'in_stock':
        filter.stock = { $gt: lowStockThreshold };
        break;
      case 'low_stock':
        filter.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', lowStockThreshold] }] };
        break;
      case 'out_of_stock':
        filter.stock = 0;
        break;
      default:
        throw new ApiError(400, 'Invalid status filter', ['status must be in_stock, low_stock, or out_of_stock']);
    }
  }

  return filter;
}

/**
 * GET /api/admin/inventory
 * List inventory with search, filters, and pagination.
 */
async function listInventory(query, { page, limit, skip }) {
  // Resolve the GLOBAL low-stock threshold from Admin → Settings at request
  // time so the table's Stock Status reflects the current threshold.
  const lowStockThreshold = await getLowStockThreshold();
  const filter = buildInventoryFilter(query, lowStockThreshold);

  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate('category', 'name slug')
    .sort({ stock: 1 })
    .skip(skip)
    .limit(limit);

  const inventory = products.map((p) => ({
    id: p._id,
    productId: p._id,
    name: p.name,
    slug: p.slug,
    mainImage: p.images && p.images.length > 0 ? p.images[0] : null,
    images: p.images || [],
    category: p.category,
    price: p.price,
    stock: p.stock,
    reorderLevel: p.reorderLevel,
    stockStatus: getStockStatus(p.stock, lowStockThreshold),
    status: p.status,
    updatedAt: p.updatedAt
  }));

  return { inventory, total };
}

/**
 * GET /api/admin/inventory/low-stock
 * Low-stock alert products: stock > 0 AND stock <= global lowStockThreshold.
 */
async function listLowStock() {
  // Low-stock alerts use the GLOBAL threshold from Admin → Settings.
  const lowStockThreshold = await getLowStockThreshold();

  const products = await Product.find({
    status: 'active',
    ...buildLowStockFilter(lowStockThreshold)
  })
    .populate('category', 'name slug')
    .sort({ stock: 1 });

  return products.map((p) => ({
    id: p._id,
    productId: p._id,
    name: p.name,
    category: p.category,
    stock: p.stock,
    reorderLevel: p.reorderLevel,
    stockStatus: 'low_stock',
    updatedAt: p.updatedAt
  }));
}

/**
 * GET /api/admin/inventory/out-of-stock
 * Products where stock === 0.
 */
async function listOutOfStock() {
  const products = await Product.find({ status: 'active', stock: 0 })
    .populate('category', 'name slug')
    .sort({ updatedAt: -1 });

  return products.map((p) => ({
    id: p._id,
    productId: p._id,
    name: p.name,
    category: p.category,
    stock: p.stock,
    reorderLevel: p.reorderLevel,
    stockStatus: 'out_of_stock',
    updatedAt: p.updatedAt
  }));
}

/**
 * PUT /api/admin/inventory/:productId
 * Update stock (and optionally reorderLevel) for a product.
 * Records an inventory transaction.
 */
async function updateStock(productId, { stock, reorderLevel }, adminId) {
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found', ['Product does not exist']);
  }

  const update = {};
  let changeAmount = 0;
  let previousStock = product.stock;

  if (stock !== undefined) {
    const qty = parseInt(stock, 10);
    if (isNaN(qty)) {
      throw new ApiError(400, 'Stock quantity must be an integer', ['Invalid stock value']);
    }
    if (previousStock + qty < 0) {
      throw new ApiError(400, 'Stock cannot go below 0', ['Insufficient stock']);
    }
    update.$inc = { stock: qty };
    changeAmount = qty;
  }

  if (reorderLevel !== undefined) {
    const newReorderLevel = parseInt(reorderLevel, 10);
    if (isNaN(newReorderLevel) || newReorderLevel < 0) {
      throw new ApiError(400, 'Reorder level must be an integer greater than or equal to 0', ['Invalid reorder level']);
    }
    update.$set = { reorderLevel: newReorderLevel };
  }

  if (!update.$inc && !update.$set) {
    throw new ApiError(400, 'Provide stock or reorderLevel to update', ['No fields to update']);
  }

  const updatedProduct = await Product.findByIdAndUpdate(productId, update, { new: true });

  // Record inventory transaction if stock changed
  if (stock !== undefined && changeAmount !== 0) {
    await InventoryTransaction.create({
      product: productId,
      previousStock,
      newStock: updatedProduct.stock,
      changeAmount,
      reason: 'ADMIN_ADJUSTMENT',
      changedBy: adminId,
      changedByModel: 'Admin',
      note: 'Manual stock adjustment by admin'
    });
  }

  return updatedProduct;
}

/**
 * GET /api/admin/inventory/:productId/history
 * Return inventory transaction history for a product.
 */
async function getInventoryHistory(productId, { page, limit, skip }) {
  const filter = { product: productId };
  const total = await InventoryTransaction.countDocuments(filter);
  const transactions = await InventoryTransaction.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { transactions, total };
}

module.exports = {
  getStockStatus,
  listInventory,
  listLowStock,
  listOutOfStock,
  updateStock,
  getInventoryHistory
};