/* ============================================================
   VENDHAN CRACKERS — Cart Validators
   ============================================================ */

const { body, param } = require('express-validator');

/**
 * Add to Cart validators.
 */
const validateAddToCart = [
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID format'),

  body('quantity')
    .optional()
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

/**
 * Update Cart Item validators.
 */
const validateUpdateCartItem = [
  param('productId')
    .isMongoId().withMessage('Invalid product ID format'),

  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

/**
 * Remove Cart Item param validator.
 */
const validateRemoveCartItem = [
  param('productId')
    .isMongoId().withMessage('Invalid product ID format')
];

module.exports = {
  validateAddToCart,
  validateUpdateCartItem,
  validateRemoveCartItem
};