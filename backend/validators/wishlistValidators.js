/* ============================================================
   VENDHAN CRACKERS — Wishlist Validators
   ============================================================ */

const { body, param } = require('express-validator');

/**
 * Add to Wishlist validators.
 * Validates: productId is present and a valid MongoDB ObjectId.
 */
const validateAddToWishlist = [
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID format')
];

/**
 * Remove Wishlist item param validator.
 * Validates: productId path param is a valid MongoDB ObjectId.
 */
const validateRemoveWishlistItem = [
  param('productId')
    .isMongoId().withMessage('Invalid product ID format')
];

module.exports = {
  validateAddToWishlist,
  validateRemoveWishlistItem
};