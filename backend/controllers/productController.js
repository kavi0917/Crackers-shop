/* ============================================================
   VENDHAN CRACKERS — Product Controllers
   ============================================================ */

const productService = require('../services/productService');
const asyncHandler = require('../utils/asyncHandler');
const { paginate, paginationMeta } = require('../utils/paginate');

/**
 * GET /api/products
 * List products with filters, sorting, and pagination.
 * Query params: page, limit, search, category, minPrice, maxPrice,
 *               availability, discount, sort
 */
const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 12, maxLimit: 50 });

  const { products, total } = await productService.listProducts(req.query, { page, limit, skip });

  res.json({
    success: true,
    message: 'Products retrieved successfully',
    data: {
      products,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * GET /api/products/:id
 * Return a single active product by ID.
 */
const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);

  res.json({
    success: true,
    message: 'Product retrieved successfully',
    data: { product }
  });
});

/**
 * GET /api/products/slug/:slug
 * Return a single active product by slug.
 */
const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await productService.getProductBySlug(req.params.slug);

  res.json({
    success: true,
    message: 'Product retrieved successfully',
    data: { product }
  });
});

/**
 * GET /api/products/:id/related
 * Return related products from the same category.
 * Excludes the current product, returns only active products.
 */
const getRelatedProducts = asyncHandler(async (req, res) => {
  const products = await productService.getRelatedProducts(req.params.id, req.query.limit);

  res.json({
    success: true,
    message: 'Related products retrieved successfully',
    data: { products }
  });
});

/**
 * GET /api/admin/products
 * List all products (including inactive) for admins.
 */
const getAllProductsAdmin = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 12, maxLimit: 50 });

  const { products, total } = await productService.getAllProductsAdmin(req.query, { page, limit, skip });

  res.json({
    success: true,
    message: 'All products retrieved successfully',
    data: {
      products,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * GET /api/admin/products/:id
 * Return a single product (including inactive) for admins.
 */
const getProductAdmin = asyncHandler(async (req, res) => {
  const product = await productService.getProductByIdAdmin(req.params.id);

  res.json({
    success: true,
    message: 'Product retrieved successfully',
    data: { product }
  });
});

/**
 * POST /api/admin/products
 * Create a new product.
 */
const createProduct = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file) {
    data.images = [`/uploads/${req.file.filename}`];
  }
  const product = await productService.createProduct(data);

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: { product }
  });
});

/**
 * PUT /api/admin/products/:id
 * Update an existing product.
 */
const updateProduct = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.file) {
    data.images = [`/uploads/${req.file.filename}`];
  }
  const product = await productService.updateProduct(req.params.id, data);

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: { product }
  });
});

/**
 * DELETE /api/admin/products/:id
 * Hard-delete the Product document ONLY.
 * Historical/business records (orders, order items, pricing snapshots,
 * customer order history, reports, commissions, referrals, reseller
 * history, inventory audit logs) are NEVER cascade-deleted.
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct(req.params.id);

  res.json({
    success: true,
    message: result.message,
    data: result
  });
});

/**
 * The future architecture intentionally has NO bulk "purge inactive"
 * endpoint. Inactive status is non-destructive and must never delete
 * records (INACTIVE ≠ DELETE). The one-time test-data cleanup lives in
 * scripts/cleanupTestProducts.js and is run manually.
 */

module.exports = {
  listProducts,
  getProduct,
  getProductBySlug,
  getRelatedProducts,
  getAllProductsAdmin,
  getProductAdmin,
  createProduct,
  updateProduct,
  deleteProduct
};
