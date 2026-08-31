/* ============================================================
   VENDHAN CRACKERS — Admin Review Controllers
   ============================================================ */

const reviewService = require('../services/reviewService');
const asyncHandler = require('../utils/asyncHandler');
const { paginationMeta } = require('../utils/paginate');

/**
 * GET /api/admin/reviews
 * List all reviews with search, status filter, and pagination.
 */
const listReviews = asyncHandler(async (req, res) => {
  const { reviews, total, page, limit } = await reviewService.listReviewsAdmin(req.query);

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
 * GET /api/admin/reviews/:id
 * Return a single review.
 */
const getReview = asyncHandler(async (req, res) => {
  const review = await reviewService.getReviewAdmin(req.params.id);

  res.json({
    success: true,
    message: 'Review retrieved successfully',
    data: { review }
  });
});

/**
 * DELETE /api/admin/reviews/:id
 * Delete or hide a review. Supports ?permanent=true for hard delete.
 */
const deleteReview = asyncHandler(async (req, res) => {
  const result = await reviewService.deleteReviewAdmin(req.params.id, {
    permanent: req.query.permanent === 'true'
  });

  res.json({
    success: true,
    message: result.message,
    data: result
  });
});

module.exports = {
  listReviews,
  getReview,
  deleteReview
};