/* ============================================================
   VENDHAN CRACKERS — Wishlist Service
   ============================================================ */

const { Wishlist, Product } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Attach the same pricing shape the rest of the storefront uses:
 * stored model already has price (selling) + originalPrice (original) +
 * discount (category discount). Expose those values directly, exactly
 * like productService — wishlist NEVER computes its own pricing.
 */
function enrichProduct(p) {
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
}

/**
 * Get the authenticated user's wishlist.
 * Always loads CURRENT product data from the Product collection — the
 * wishlist record stores only a product reference, so no stale
 * name/price/discount/stock can ever be shown.
 *
 * Deleted products are handled gracefully: the record is kept (business
 * logic does not require auto-deletion) but rendered as unavailable so
 * the page never crashes. Inactive products are shown with their current
 * data plus an `available: false` flag for the unavailable state.
 */
async function getWishlist(userId) {
  const docs = await Wishlist.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate({ path: 'product', populate: { path: 'category', select: 'name slug discount' } });

  const items = [];
  for (const doc of docs) {
    const product = doc.product;

    if (!product) {
      // Product was deleted — keep the record, mark unavailable gracefully.
      items.push({
        _id: doc._id,
        productId: null,
        product: null,
        available: false,
        deleted: true,
        createdAt: doc.createdAt
      });
      continue;
    }

    const enriched = enrichProduct(product);
    items.push({
      _id: doc._id,
      productId: product._id,
      product: enriched,
      available: product.status === 'active',
      deleted: false,
      createdAt: doc.createdAt
    });
  }

  return { items, count: items.length };
}

/**
 * Add a product to the authenticated user's wishlist.
 * Validates: product exists. Duplicates are prevented (404-free): an
 * existing user+product entry returns 409. A unique compound index is the
 * DB-level backstop against concurrent duplicate inserts.
 */
async function addToWishlist(userId, productId) {
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found', ['Product does not exist']);
  }

  const exists = await Wishlist.findOne({ user: userId, product: productId });
  if (exists) {
    throw new ApiError(409, 'Product already in wishlist', ['Duplicate wishlist item']);
  }

  return Wishlist.create({ user: userId, product: productId });
}

/**
 * Remove a product from the authenticated user's wishlist.
 * Ownership is enforced by scoping the delete to the authenticated user's
 * records — a customer can never remove another customer's wishlist item
 * (it simply does not exist for them → 404).
 */
async function removeFromWishlist(userId, productId) {
  const doc = await Wishlist.findOneAndDelete({ user: userId, product: productId });
  if (!doc) {
    throw new ApiError(404, 'Item not found in wishlist', ['Wishlist item does not exist']);
  }
  return { removed: true, productId };
}

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist
};