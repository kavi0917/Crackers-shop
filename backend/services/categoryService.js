/* ============================================================
   VENDHAN CRACKERS — Category Service
   ============================================================ */

const { Category, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const generateSlug = require('../utils/generateSlug');
const calculateProductPricing = require('../utils/calculateProductPricing');

/**
 * Get active categories (public).
 */
async function getActiveCategories() {
  const categories = await Category.find({ status: 'active' }).sort({ name: 1 });
  return categories;
}

/**
 * Get category by id (public — active only).
 */
async function getCategoryById(id) {
  const category = await Category.findOne({ _id: id, status: 'active' });
  if (!category) {
    throw new ApiError(404, 'Category not found', ['Category does not exist or is inactive']);
  }
  return category;
}

/**
 * Get products in a category (public — active products only).
 */
async function getCategoryProducts(id, { page, limit, skip }) {
  // Verify category exists and is active
  await getCategoryById(id);

  const filter = { category: id, status: 'active' };
  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate('category', 'name slug discount')
    .sort({ isFeatured: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Attach category-based discount info to each product
  const enriched = products.map((p) => {
    const categoryDiscount = p.category && p.category.discount !== undefined ? p.category.discount : 0;
    const pricing = calculateProductPricing(p.price, categoryDiscount);
    return {
      ...p.toObject(),
      discountPercent: pricing.discountPercent,
      discountAmount: pricing.discountAmount,
      finalPrice: pricing.finalPrice,
      originalPrice: pricing.originalPrice
    };
  });

  return { products: enriched, total };
}

/**
 * Admin: Get all categories (including inactive).
 */
async function getAllCategoriesAdmin() {
  const categories = await Category.find().sort({ name: 1 });
  return categories;
}

/**
 * Admin: Create a new category.
 * Checks duplicate slug before saving.
 */
async function createCategory({ name, description, image, status, discount }) {
  const slug = generateSlug(name);

  // Prevent duplicate slug
  const existingSlug = await Category.findOne({ slug });
  if (existingSlug) {
    throw new ApiError(409, 'A category with this name already exists', ['Duplicate category slug']);
  }

  const category = await Category.create({
    name,
    description,
    image,
    status: status || 'active',
    discount: discount !== undefined ? discount : 0
  });

  return category;
}

/**
 * Admin: Update a category.
 */
async function updateCategory(id, { name, description, image, status, discount }) {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Category not found', ['Category does not exist']);
  }

  if (name && name !== category.name) {
    const newSlug = generateSlug(name);
    const existingSlug = await Category.findOne({ slug: newSlug, _id: { $ne: id } });
    if (existingSlug) {
      throw new ApiError(409, 'A category with this name already exists', ['Duplicate category slug']);
    }
    category.name = name;
    category.slug = newSlug;
  }

  if (description !== undefined) category.description = description;
  if (image !== undefined) category.image = image;
  if (status !== undefined) category.status = status;
  if (discount !== undefined) category.discount = discount;

  await category.save();
  return category;
}

/**
 * Admin: Delete/deactivate a category.
 * Prefers deactivation over destructive deletion when products exist.
 */
async function deleteCategory(id) {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Category not found', ['Category does not exist']);
  }

  // Count active products in this category
  const activeProductCount = await Product.countDocuments({ category: id, status: 'active' });

  if (activeProductCount > 0) {
    // Prefer deactivation over destructive deletion
    category.status = 'inactive';
    await category.save();
    return { deleted: false, deactivated: true, message: 'Category has active products. It was deactivated instead of deleted.' };
  }

  // No active products — safe to delete
  await Category.findByIdAndDelete(id);
  return { deleted: true, deactivated: false, message: 'Category deleted successfully' };
}

/**
 * Update category productCount field.
 * This is called when products are created, category changed, or deleted/deactivated.
 */
async function refreshCategoryProductCount(categoryId) {
  const count = await Product.countDocuments({ category: categoryId, status: 'active' });
  await Category.findByIdAndUpdate(categoryId, { productCount: count });
  return count;
}

module.exports = {
  getActiveCategories,
  getCategoryById,
  getCategoryProducts,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  refreshCategoryProductCount
};