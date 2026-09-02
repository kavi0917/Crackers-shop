/* ============================================================
   VENDHAN CRACKERS — Product Service
   ============================================================ */

const { Product, Category } = require('../models');
const ApiError = require('../utils/ApiError');
const generateSlug = require('../utils/generateSlug');
const calculateProductPricing = require('../utils/calculateProductPricing');
const categoryService = require('./categoryService');

/**
 * Validate that a category ID exists.
 */
async function validateCategoryExists(categoryId) {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(404, 'Category not found', ['Invalid category ID']);
  }
  return category;
}

/**
 * Build the product query filter from request query params.
 * Supports: search, category, minPrice, maxPrice, availability, discount.
 */
function buildProductFilter(query) {
  const filter = { status: 'active' };

  // Search against name and description (regex, case-insensitive)
  if (query.search) {
    const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: searchRegex }, { description: searchRegex }];
  }

  // Category filter
  if (query.category) {
    if (!query.category.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, 'Invalid category ID', ['Category must be a valid ObjectId']);
    }
    filter.category = query.category;
  }

  // Price filter
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) {
      const minPrice = Number(query.minPrice);
      if (isNaN(minPrice) || minPrice < 0) {
        throw new ApiError(400, 'Invalid minimum price', ['minPrice must be a non-negative number']);
      }
      filter.price.$gte = minPrice;
    }
    if (query.maxPrice !== undefined) {
      const maxPrice = Number(query.maxPrice);
      if (isNaN(maxPrice) || maxPrice < 0) {
        throw new ApiError(400, 'Invalid maximum price', ['maxPrice must be a non-negative number']);
      }
      filter.price.$lte = maxPrice;
    }
  }

  // Availability filter
  if (query.availability) {
    switch (query.availability) {
      case 'in_stock':
        filter.stock = { $gt: 0 };
        break;
      case 'low_stock':
        filter.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$reorderLevel'] }] };
        break;
      case 'out_of_stock':
        filter.stock = 0;
        break;
      default:
        throw new ApiError(400, 'Invalid availability filter', ['availability must be in_stock, low_stock, or out_of_stock']);
    }
  }

  // Discount filter
  if (query.discount !== undefined) {
    const discount = Number(query.discount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      throw new ApiError(400, 'Invalid discount filter', ['discount must be between 0 and 100']);
    }
    filter.discount = { $gte: discount };
  }

  return filter;
}

/**
 * Build the product sort object.
 * Validates allowed sort values to prevent field injection.
 */
function buildProductSort(sort) {
  const allowedSorts = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    discount_desc: { discount: -1 },
    rating_desc: { rating: -1 },
    name_asc: { name: 1 },
    featured: { isFeatured: -1, rating: -1 }
  };

  if (!sort) return allowedSorts.featured;
  if (!allowedSorts[sort]) {
    throw new ApiError(400, 'Invalid sort parameter', ['sort must be one of: newest, price_asc, price_desc, discount_desc, rating_desc, name_asc, featured']);
  }
  return allowedSorts[sort];
}

/**
 * Public: List products with filters, sorting, and pagination.
 */
async function listProducts(query, { page, limit, skip }) {
  const filter = buildProductFilter(query);
  const sort = buildProductSort(query.sort);

  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate('category', 'name slug discount')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  // Attach category-based discount info to each product.
  // Stored model already has price (selling) + originalPrice (original) +
  // discount (category discount), so expose those values directly.
  const enriched = products.map((p) => {
    const storedOriginal = (typeof p.originalPrice === 'number' && !Number.isNaN(p.originalPrice) && p.originalPrice > 0)
      ? p.originalPrice
      : p.price;
    const storedSelling = (typeof p.price === 'number' && !Number.isNaN(p.price)) ? p.price : 0;
    const storedDiscount = (typeof p.discount === 'number' && !Number.isNaN(p.discount)) ? p.discount : 0;
    return {
      ...p.toObject(),
      discountPercent: storedDiscount,
      discountAmount: Math.round(storedOriginal * storedDiscount / 100 * 100) / 100,
      finalPrice: storedSelling,
      price: storedSelling,
      originalPrice: storedOriginal
    };
  });

  return { products: enriched, total };
}

/**
 * Public: Get a single active product by id.
 */
async function getProductById(id) {
  const product = await Product.findOne({ _id: id, status: 'active' }).populate('category', 'name slug description discount');
  if (!product) {
    throw new ApiError(404, 'Product not found', ['Product does not exist or is inactive']);
  }
  const storedOriginal = (typeof product.originalPrice === 'number' && !Number.isNaN(product.originalPrice) && product.originalPrice > 0)
    ? product.originalPrice
    : product.price;
  const storedSelling = (typeof product.price === 'number' && !Number.isNaN(product.price)) ? product.price : 0;
  const storedDiscount = (typeof product.discount === 'number' && !Number.isNaN(product.discount)) ? product.discount : 0;
  return {
    ...product.toObject(),
    discountPercent: storedDiscount,
    discountAmount: Math.round(storedOriginal * storedDiscount / 100 * 100) / 100,
    finalPrice: storedSelling,
    price: storedSelling,
    originalPrice: storedOriginal
  };
}

/**
 * Public: Get a single active product by slug.
 */
async function getProductBySlug(slug) {
  const product = await Product.findOne({ slug, status: 'active' }).populate('category', 'name slug description discount');
  if (!product) {
    throw new ApiError(404, 'Product not found', ['Product does not exist or is inactive']);
  }
  const storedOriginal = (typeof product.originalPrice === 'number' && !Number.isNaN(product.originalPrice) && product.originalPrice > 0)
    ? product.originalPrice
    : product.price;
  const storedSelling = (typeof product.price === 'number' && !Number.isNaN(product.price)) ? product.price : 0;
  const storedDiscount = (typeof product.discount === 'number' && !Number.isNaN(product.discount)) ? product.discount : 0;
  return {
    ...product.toObject(),
    discountPercent: storedDiscount,
    discountAmount: Math.round(storedOriginal * storedDiscount / 100 * 100) / 100,
    finalPrice: storedSelling,
    price: storedSelling,
    originalPrice: storedOriginal
  };
}

/**
 * Public: Get related products from the same category.
 * Excludes the current product and returns only active products.
 */
async function getRelatedProducts(id, limit = 3) {
  // Ensure the product exists and is active
  const product = await Product.findOne({ _id: id, status: 'active' });
  if (!product) {
    throw new ApiError(404, 'Product not found', ['Product does not exist or is inactive']);
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 3, 1), 12);

  const products = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    status: 'active'
  })
    .populate('category', 'name slug discount')
    .sort({ isFeatured: -1, rating: -1, createdAt: -1 })
    .limit(safeLimit);

  // Attach pricing values. Stored model already has the selling price,
  // original price, and category discount — expose them directly.
  return products.map((p) => {
    const storedOriginal = (typeof p.originalPrice === 'number' && !Number.isNaN(p.originalPrice) && p.originalPrice > 0)
      ? p.originalPrice
      : p.price;
    const storedSelling = (typeof p.price === 'number' && !Number.isNaN(p.price)) ? p.price : 0;
    const storedDiscount = (typeof p.discount === 'number' && !Number.isNaN(p.discount)) ? p.discount : 0;
    return {
      ...p.toObject(),
      discountPercent: storedDiscount,
      discountAmount: Math.round(storedOriginal * storedDiscount / 100 * 100) / 100,
      finalPrice: storedSelling,
      price: storedSelling,
      originalPrice: storedOriginal
    };
  });
}

/**
 * Admin: Get all products (including inactive).
 */
async function getAllProductsAdmin(query, { page, limit, skip }) {
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: searchRegex }, { description: searchRegex }];
  }
  // Category filter by the product → category ObjectId reference. The dropdown
  // sends real category IDs; validate the shape so a malformed value returns a
  // clean 400 instead of a MongoDB CastError (500).
  if (query.category) {
    if (!query.category.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, 'Invalid category ID', ['Category must be a valid ObjectId']);
    }
    filter.category = query.category;
  }
  if (query.status) {
    filter.status = query.status;
  }

  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate('category', 'name slug discount')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { products: products.map((p) => enrichProductPricing(p)), total };
}

/**
 * Admin: Get a single product by id (including inactive).
 */
async function getProductByIdAdmin(id) {
  const product = await Product.findById(id).populate('category', 'name slug description discount');
  if (!product) {
    throw new ApiError(404, 'Product not found', ['Product does not exist']);
  }
  return enrichProductPricing(product);
}

/**
 * Enrich a product with its authoritative category-based pricing so that
 * create/update responses expose the derived Selling Price (finalPrice),
 * the effective category discount, and the compare-to (original) price.
 *
 * The Selling Price is ALWAYS derived server-side from the product's
 * Original Price (product.price) and the authoritative Category discount.
 * A client-submitted selling price is never trusted or stored.
 */
function enrichProductPricing(product) {
  const categoryDiscount = product.category && product.category.discount !== undefined
    ? product.category.discount
    : 0;
  // Stored model now contains: originalPrice (admin-entered original), discount
  // (category discount), price (derived selling price). Use the stored values so
  // the API response matches the database exactly.
  const storedOriginal = (typeof product.originalPrice === 'number' && !Number.isNaN(product.originalPrice) && product.originalPrice > 0)
    ? product.originalPrice
    : product.price;
  const pricing = calculateProductPricing(storedOriginal, categoryDiscount);
  const base = product.toObject ? product.toObject() : { ...product };
  return {
    ...base,
    categoryDiscount,
    discountPercent: Number(product.discount) || pricing.discountPercent,
    discountAmount: pricing.discountAmount,
    finalPrice: (typeof product.price === 'number' && !Number.isNaN(product.price)) ? product.price : pricing.finalPrice,
    sellingPrice: (typeof product.price === 'number' && !Number.isNaN(product.price)) ? product.price : pricing.finalPrice,
    originalPrice: storedOriginal
  };
}

/**
 * Admin: Create a new product.
 * Validates category exists, prevents duplicate slug, updates category productCount.
 */
async function createProduct(data) {
  const category = await validateCategoryExists(data.category);

  // Never trust a client-submitted selling price — always derive it from the
  // Original Price and the authoritative category discount.
  delete data.sellingPrice;
  delete data.finalPrice;

  // Generate slug from name if not provided
  const slug = data.slug || generateSlug(data.name);
  const existingSlug = await Product.findOne({ slug });
  if (existingSlug) {
    throw new ApiError(409, 'A product with this slug already exists', ['Duplicate product slug']);
  }

  // Authoritative pricing: the admin's "Original Price" input is stored as
  // originalPrice; discount is taken from the selected category; the selling
  // price is calculated server-side and stored in `price`.
  const originalPrice = Number(data.price) || Number(data.originalPrice) || 0;
  const discount = (category.discount !== undefined && category.discount !== null) ? Number(category.discount) : 0;
  const pricing = calculateProductPricing(originalPrice, discount);
  const sellingPrice = Math.round(pricing.finalPrice * 100) / 100;

  const product = await Product.create({
    name: data.name,
    slug,
    description: data.description || null,
    category: data.category,
    price: sellingPrice,
    originalPrice,
    discount,
    images: data.images || [],
    stock: data.stock !== undefined ? data.stock : 0,
    reorderLevel: data.reorderLevel !== undefined ? data.reorderLevel : 20,
    status: data.status || 'active',
    isFeatured: data.isFeatured !== undefined ? data.isFeatured : false
  });

  // Refresh category product count
  await categoryService.refreshCategoryProductCount(data.category);

  // Re-load with the authoritative category discount so the response exposes
  // the derived Selling Price, discount %, and compare-to price.
  const enrichedProduct = await Product.findById(product._id).populate('category', 'name slug discount');
  return enrichProductPricing(enrichedProduct);
}

/**
 * Admin: Update an existing product.
 */
async function updateProduct(id, data) {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Product not found', ['Product does not exist']);
  }

  // Never trust a client-submitted selling price — always derive it from the
  // Original Price and the authoritative category discount.
  delete data.sellingPrice;
  delete data.finalPrice;

  // Track old category for productCount refresh if category changes
  const oldCategoryId = data.category && data.category.toString() !== product.category.toString()
    ? product.category.toString()
    : null;

  // If category is changing, validate the new category
  if (data.category && data.category.toString() !== product.category.toString()) {
    await validateCategoryExists(data.category);
  }

  // Handle slug if provided or name changes
  if (data.slug && data.slug !== product.slug) {
    const existingSlug = await Product.findOne({ slug: data.slug, _id: { $ne: id } });
    if (existingSlug) {
      throw new ApiError(409, 'A product with this slug already exists', ['Duplicate product slug']);
    }
    product.slug = data.slug;
  } else if (data.name && data.name !== product.name && !data.slug) {
    // Auto-regenerate slug when name changes and no explicit slug given
    const newSlug = generateSlug(data.name);
    const existingSlug = await Product.findOne({ slug: newSlug, _id: { $ne: id } });
    if (!existingSlug) {
      product.slug = newSlug;
    }
  }

  // Apply updatable fields
  if (data.name !== undefined) product.name = data.name;
  if (data.description !== undefined) product.description = data.description;
  if (data.category !== undefined) product.category = data.category;
  if (data.price !== undefined) product.price = data.price;
  if (data.originalPrice !== undefined) product.originalPrice = data.originalPrice;
  if (data.discount !== undefined) product.discount = data.discount;
  if (data.images !== undefined) product.images = data.images;
  if (data.stock !== undefined) product.stock = data.stock;
  if (data.reorderLevel !== undefined) product.reorderLevel = data.reorderLevel;
  if (data.status !== undefined) product.status = data.status;
  if (data.isFeatured !== undefined) product.isFeatured = data.isFeatured;

  // Authoritative pricing: whenever the admin enters a new Original Price
  // (data.price), or the category (and thus its discount) changes, recompute
  // the stored discount = category discount and selling price =
  // originalPrice × (100 − discount) / 100. This keeps the database consistent
  // with the corrected records (originalPrice | discount | price).
  const finalCategory = await Category.findById(product.category);
  const authoritativeDiscount = (finalCategory && finalCategory.discount !== undefined && finalCategory.discount !== null)
    ? Number(finalCategory.discount)
    : 0;
  if (data.price !== undefined || data.originalPrice !== undefined || data.category !== undefined) {
    const orig = (data.originalPrice !== undefined)
      ? Number(data.originalPrice)
      : ((data.price !== undefined) ? Number(data.price) : Number(product.originalPrice || product.price));
    if (orig > 0) {
      const pricing = calculateProductPricing(orig, authoritativeDiscount);
      product.discount = authoritativeDiscount;
      product.price = Math.round(pricing.finalPrice * 100) / 100;
      if (data.price !== undefined && data.originalPrice === undefined) {
        product.originalPrice = orig;
      }
    }
  }

  await product.save();

  // Refresh product count for the new category
  await categoryService.refreshCategoryProductCount(product.category.toString());

  // Refresh product count for the old category if it changed
  if (oldCategoryId) {
    await categoryService.refreshCategoryProductCount(oldCategoryId);
  }

  // Re-load with the authoritative category discount so the response exposes
  // the derived Selling Price even after a category change.
  const enrichedProduct = await Product.findById(id).populate('category', 'name slug discount');
  return enrichProductPricing(enrichedProduct);
}

/**
 * Admin: Delete a product — HARD DELETE of the Product document ONLY.
 *
 * ARCHITECTURE SAFETY (Part 2 — Future Product Deletion):
 * The Admin "Delete Product" action removes ONLY the Product document.
 * Nothing else is deleted, updated, or cascade-purged. Historical and
 * business records remain intact forever, including:
 *   - Orders / Order Items (denormalized productName, price, qty snapshots)
 *   - Historical pricing snapshots (stored in the order item itself)
 *   - Customer order history (orders are self-contained in Order docs)
 *   - Sales reports / history (aggregate from Order snapshots)
 *   - Commission records and referral/reseller history (keyed by Order/User)
 *   - InventoryTransaction audit logs (keyed by product ObjectId)
 *   - Carts (product refs may remain; cartService skips missing products)
 *   - Combos (missing products surface as unavailable and are handled
 *     gracefully by comboService.loadComboItems)
 *
 * The Product document itself is schema-uniqued by slug, so once removed
 * the SKU/slug can be reused; historical records keep their persisted
 * snapshot values.
 *
 * NOTE: This is intentionally NOT a soft-delete. `Inactive` status is a
 * separate, non-destructive action (see updateProduct). Setting
 * status=inactive MUST NOT delete anything.
 */
async function deleteProduct(id) {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Product not found', ['Product does not exist']);
  }

  await Product.findByIdAndDelete(product._id);

  // Refresh category product count (only the product catalog count changes)
  if (product.category) {
    await categoryService.refreshCategoryProductCount(product.category.toString());
  }

  return {
    deleted: true,
    deactivated: false,
    message: 'Product deleted successfully',
    product: {
      id: product._id.toString(),
      name: product.name,
      status: product.status,
      category: product.category ? product.category.toString() : null
    }
  };
}

/* NOTE: The future architecture intentionally has NO bulk "purge inactive"
   service. Inactive status is non-destructive (INACTIVE ≠ DELETE). The
   one-time test-data cleanup is implemented as a standalone, reviewed
   script: scripts/cleanupTestProducts.js (see PART 1). */

module.exports = {
  listProducts,
  getProductById,
  getProductBySlug,
  getRelatedProducts,
  getAllProductsAdmin,
  getProductByIdAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  buildProductFilter,
  buildProductSort
};
