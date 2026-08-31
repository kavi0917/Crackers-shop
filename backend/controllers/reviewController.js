/* ============================================================
   VENDHAN CRACKERS — Review Controllers (Customer)
   ============================================================ */

const reviewService = require('../services/reviewService');
const asyncHandler = require('../utils/asyncHandler');
const { paginationMeta } = require('../utils/paginate');

/**
 * GET /api/products/:productId/reviews
 * List approved reviews for a product with pagination.
 */
const listProductReviews = asyncHandler(async (req, res) => {
  const { reviews, total, page, limit } = await reviewService.listProductReviews(req.params.productId, req.query);

  res.json({
    success: true,
    message: 'Reviews retrieved successfully',
    data: {
      reviews,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * POST /api/products/:productId/reviews
 * Create a review for a product (authenticated customer).
 */
const createReview = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.user._id, req.params.productId, req.body);

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully',
    data: { review }
  });
});

/**
 * PUT /api/reviews/:id
 * Update a review (customer can only update their own).
 */
const updateReview = asyncHandler(async (req, res) => {
  const review = await reviewService.updateReview(req.user._id, req.params.id, req.body);

  res.json({
    success: true,
    message: 'Review updated successfully',
    data: { review }
  });
});

/**
 * DELETE /api/reviews/:id
 * Delete a review (customer can delete their own).
 */
const deleteReview = asyncHandler(async (req, res) => {
  const result = await reviewService.deleteReview(req.user._id, req.params.id);

  res.json({
    success: true,
    message: result.message,
    data: result
  });
});

module.exports = {
  listProductReviews,
  createReview,
  updateReview,
  deleteReview
};