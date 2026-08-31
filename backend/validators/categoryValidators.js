/* ============================================================
   VENDHAN CRACKERS — Category Validators
   ============================================================ */

const { body, param } = require('express-validator');

/**
 * Create / Update Category validators.
 */
const validateCategory = [
  body('name')
    .trim()
    .notEmpty().withMessage('Category name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Category name must be between 2 and 100 characters'),

  body('description')
    .optional({ nullable: true })
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  body('image')
    .optional({ nullable: true })
    .isString().withMessage('Image must be a string'),

  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Status must be either active or inactive'),

  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100')
];

/**
 * Category ID param validator.
 */
const validateCategoryId = [
  param('id')
    .isMongoId().withMessage('Invalid category ID format')
];

module.exports = { validateCategory, validateCategoryId };