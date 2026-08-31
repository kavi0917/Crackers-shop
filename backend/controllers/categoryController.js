/* ============================================================
   VENDHAN CRACKERS — Category Controllers
   ============================================================ */

const categoryService = require('../services/categoryService');
const asyncHandler = require('../utils/asyncHandler');
const { paginate, paginationMeta } = require('../utils/paginate');

/**
 * GET /api/categories
 * Return all active categories.
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getActiveCategories();

  res.json({
    success: true,
    message: 'Categories retrieved successfully',
    data: { categories }
  });
});

/**
 * GET /api/categories/:id
 * Return a single active category.
 */
const getCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);

  res.json({
    success: true,
    message: 'Category retrieved successfully',
    data: { category }
  });
});

/**
 * GET /api/categories/:id/products
 * Return active products in a category with pagination.
 */
const getCategoryProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { defaultLimit: 12, maxLimit: 50 });

  const { products, total } = await categoryService.getCategoryProducts(req.params.id, { page, limit, skip });

  res.json({
    success: true,
    message: 'Category products retrieved successfully',
    data: {
      products,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * GET /api/admin/categories
 * Return all categories (including inactive) for admins.
 */
const getAllCategoriesAdmin = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategoriesAdmin();

  res.json({
    success: true,
    message: 'All categories retrieved successfully',
    data: { categories }
  });
});

/**
 * POST /api/admin/categories
 * Create a new category.
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, image, status, discount } = req.body;

  const category = await categoryService.createCategory({ name, description, image, status, discount });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: { category }
  });
});

/**
 * PUT /api/admin/categories/:id
 * Update a category.
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { name, description, image, status, discount } = req.body;

  const category = await categoryService.updateCategory(req.params.id, { name, description, image, status, discount });

  res.json({
    success: true,
    message: 'Category updated successfully',
    data: { category }
  });
});

/**
 * DELETE /api/admin/categories/:id
 * Delete/deactivate a category.
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.deleteCategory(req.params.id);

  res.json({
    success: true,
    message: result.message,
    data: result
  });
});

module.exports = {
  getCategories,
  getCategory,
  getCategoryProducts,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory
};