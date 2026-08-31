/* ============================================================
   VENDHAN CRACKERS — Review Validators
   ============================================================ */

const { body, param } = require('express-validator');

/**
 * Product ID param validator (for review routes under products).
 */
const validateProductIdParam = [
  param('productId')
    .isMongoId().withMessage('Invalid product ID format')
];

/**
 * Review ID param validator.
 */
const validateReviewId = [
  param('id')
    .isMongoId().withMessage('Invalid review ID format')
];

/**
 * Create Review validators.
 * Validates: rating (1-5), comment length.
 */
const validateCreateReview = [
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional({ nullable: true })
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters')
];

/**
 * Update Review validators.
 * Validates: rating (1-5), comment length.
 */
const validateUpdateReview = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional({ nullable: true })
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters')
];

module.exports = {
  validateProductIdParam,
  validateReviewId,
  validateCreateReview,
  validateUpdateReview
};