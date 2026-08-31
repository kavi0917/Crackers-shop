/* ============================================================
   VENDHAN CRACKERS — Combo Validators
   ============================================================ */

const { body, param } = require('express-validator');

/**
 * Combo ID param validator.
 */
const validateComboId = [
  param('id')
    .isMongoId().withMessage('Invalid combo ID format')
];

/**
 * Create Combo validators.
 * Validates: name, price, description, image, discount, status, items (all required).
 */
const validateCreateCombo = [
  body('name')
    .trim()
    .notEmpty().withMessage('Combo name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Combo name must be between 2 and 100 characters'),

  body('price')
    .notEmpty().withMessage('Combo price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a number greater than or equal to 0'),

  body('description')
    .optional({ nullable: true })
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

  body('image')
    .optional({ nullable: true })
    .isString().withMessage('Image must be a string'),

  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),

  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Status must be either active or inactive'),

  body('items')
    .isArray({ min: 1 }).withMessage('A combo must contain at least one product'),

  body('items.*.product')
    .notEmpty().withMessage('Each combo item must include a product ID')
    .isMongoId().withMessage('Invalid product ID format'),

  body('items.*.quantity')
    .notEmpty().withMessage('Each combo item must include a quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

/**
 * Update Combo validators.
 * All fields optional, but validated when present.
 */
const validateUpdateCombo = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Combo name cannot be empty')
    .isLength({ min: 2, max: 100 }).withMessage('Combo name must be between 2 and 100 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a number greater than or equal to 0'),

  body('description')
    .optional({ nullable: true })
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

  body('image')
    .optional({ nullable: true })
    .isString().withMessage('Image must be a string'),

  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),

  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Status must be either active or inactive'),

  body('items')
    .optional()
    .isArray({ min: 1 }).withMessage('A combo must contain at least one product'),

  body('items.*.product')
    .optional()
    .notEmpty().withMessage('Each combo item must include a product ID')
    .isMongoId().withMessage('Invalid product ID format'),

  body('items.*.quantity')
    .optional()
    .notEmpty().withMessage('Each combo item must include a quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

module.exports = { validateCreateCombo, validateUpdateCombo, validateComboId };