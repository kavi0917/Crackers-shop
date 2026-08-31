/* ============================================================
   VENDHAN CRACKERS — Review Service
   ============================================================ */

const { Review, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate');

/**
 * Recalculate a product's rating and reviewCount from approved reviews.
 * Uses MongoDB aggregation for accuracy — never trusts client values.
 */
async function recalculateProductRating(productId) {
  const result = await Review.aggregate([
    { $match: { product: productId, status: 'approved' } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  const rating = result.length > 0 ? Math.round(result[0].avgRating * 10) / 10 : 0;
  const reviewCount = result.length > 0 ? result[0].count : 0;

  await Product.findByIdAndUpdate(productId, { rating, reviewCount });
}

/**
 * Public: List approved reviews for a product with pagination.
 * Returns customer display name only — never exposes private info.
 */
async function listProductReviews(productId, query) {
  // Verify product exists and is active
  const product = await Product.findOne({ _id: productId, status: 'active' });
  if (!product) {
    throw new ApiError(404, 'Product not found', ['Product does not exist or is inactive']);
  }

  const { page, limit, skip } = paginate(query, { defaultLimit: 10, maxLimit: 50 });

  const filter = { product: productId, status: 'approved' };
  const total = await Review.countDocuments(filter);
  const reviews = await Review.find(filter)
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const mapped = reviews.map((r) => ({
    id: r._id,
    customerName: r.user ? r.user.name : 'Anonymous',
    rating: r.rating,
    comment: r.comment,
    date: r.createdAt
  }));

  return { reviews: mapped, total, page, limit };
}

/**
 * Create a review for a product.
 * Authenticated customer only. One review per user per product.
 */
async function createReview(userId, productId, { rating, comment }) {
  // Verify product exists and is active
  const product = await Product.findOne({ _id: productId, status: 'active' });
  if (!product) {
    throw new ApiError(404, 'Product not found', ['Product does not exist or is inactive']);
  }

  // Check for existing review (one per user per product)
  const existing = await Review.findOne({ user: userId, product: productId });
  if (existing) {
    throw new ApiError(409, 'You have already reviewed this product', ['Duplicate review']);
  }

  const review = await Review.create({
    user: userId,
    product: productId,
    rating,
    comment: comment || null,
    status: 'approved'
  });

  // Recalculate product rating
  await recalculateProductRating(productId);

  return review;
}

/**
 * Update a review. Customer can only update their own review.
 */
async function updateReview(userId, reviewId, { rating, comment }) {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found', ['Review does not exist']);
  }

  // Security: only the owner can update their review
  if (review.user.toString() !== userId.toString()) {
    throw new ApiError(403, 'You can only update your own review', ['Not authorized to update this review']);
  }

  if (rating !== undefined) review.rating = rating;
  if (comment !== undefined) review.comment = comment;

  await review.save();

  // Recalculate product rating
  await recalculateProductRating(review.product);

  return review;
}

/**
 * Delete a review. Customer can delete their own; admin can delete any.
 */
async function deleteReview(userId, reviewId, isAdmin = false) {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found', ['Review does not exist']);
  }

  // Security: customer can only delete their own review
  if (!isAdmin && review.user.toString() !== userId.toString()) {
    throw new ApiError(403, 'You can only delete your own review', ['Not authorized to delete this review']);
  }

  await review.deleteOne();

  // Recalculate product rating
  await recalculateProductRating(review.product);

  return { message: 'Review deleted successfully' };
}

/**
 * Admin: List all reviews with search, status filter, and pagination.
 */
async function listReviewsAdmin(query) {
  const { page, limit, skip } = paginate(query, { defaultLimit: 10, maxLimit: 50 });

  const filter = {};
  if (query.status) {
    if (!['pending', 'approved', 'rejected', 'hidden'].includes(query.status)) {
      throw new ApiError(400, 'Invalid status filter', ['status must be pending, approved, rejected, or hidden']);
    }
    filter.status = query.status;
  }
  if (query.rating) {
    const rating = parseInt(query.rating, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      throw new ApiError(400, 'Invalid rating filter', ['rating must be between 1 and 5']);
    }
    filter.rating = rating;
  }
  if (query.search) {
    const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ comment: searchRegex }];
  }

  const total = await Review.countDocuments(filter);
  const reviews = await Review.find(filter)
    .populate('user', 'name email')
    .populate('product', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const mapped = reviews.map((r) => ({
    id: r._id,
    customer: r.user ? { id: r.user._id, name: r.user.name, email: r.user.email } : null,
    product: r.product ? { id: r.product._id, name: r.product.name } : null,
    rating: r.rating,
    comment: r.comment,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }));

  return { reviews: mapped, total, page, limit };
}

/**
 * Admin: Get a single review by id.
 */
async function getReviewAdmin(reviewId) {
  const review = await Review.findById(reviewId)
    .populate('user', 'name email')
    .populate('product', 'name');
  if (!review) {
    throw new ApiError(404, 'Review not found', ['Review does not exist']);
  }

  return {
    id: review._id,
    customer: review.user ? { id: review.user._id, name: review.user.name, email: review.user.email } : null,
    product: review.product ? { id: review.product._id, name: review.product.name } : null,
    rating: review.rating,
    comment: review.comment,
    status: review.status,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt
  };
}

/**
 * Admin: Delete or hide a review.
 * Prefers hiding (status = 'hidden') to preserve data, but supports
 * permanent deletion when explicitly requested.
 */
async function deleteReviewAdmin(reviewId, { permanent = false } = {}) {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(404, 'Review not found', ['Review does not exist']);
  }

  if (permanent) {
    await review.deleteOne();
  } else {
    // Prefer hiding over permanent deletion
    review.status = 'hidden';
    await review.save();
  }

  // Recalculate product rating
  await recalculateProductRating(review.product);

  return {
    deleted: permanent,
    hidden: !permanent,
    message: permanent ? 'Review deleted permanently' : 'Review hidden successfully'
  };
}

module.exports = {
  listProductReviews,
  createReview,
  updateReview,
  deleteReview,
  listReviewsAdmin,
  getReviewAdmin,
  deleteReviewAdmin,
  recalculateProductRating
};