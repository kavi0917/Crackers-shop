/* ============================================================
   VENDHAN CRACKERS — Product Validators
   ============================================================ */

const { body, param } = require('express-validator');

/**
 * Create / Update Product validators.
 * Validates: name, slug, description, category, price, originalPrice,
 * discount, stock, reorderLevel, status.
 */
const validateProduct = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 2, max: 150 }).withMessage('Product name must be between 2 and 150 characters'),

  body('slug')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 }).withMessage('Slug cannot exceed 200 characters')
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Slug must be lowercase alphanumeric with hyphens'),

  body('description')
    .optional({ nullable: true })
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isMongoId().withMessage('Invalid category ID format'),

  // The admin enters the Original Price. It is stored as `originalPrice`.
  body('originalPrice')
    .notEmpty().withMessage('Original Price is required')
    .isFloat({ gt: 0 }).withMessage('Original Price must be a number greater than 0'),

  // The Selling Price is derived server-side from Original Price × (100 − category discount)/100.
  // It is never accepted from the client.
  body('price')
    .custom((value, { req }) => {
      if (req.body.price !== undefined) {
        throw new Error('Selling price is auto-calculated from Original Price and category discount');
      }
      return true;
    })
    .withMessage('Selling price is auto-calculated and cannot be set manually'),

  // Selling price is NEVER accepted from the client. It is always derived
  // server-side from the Original Price + authoritative category discount.
  // Reject any attempt to submit a selling price so a tampered value cannot
  // override the authoritative calculation. (Only runs when the field is present.)
  body('sellingPrice')
    .custom((value, { req }) => {
      if (req.body.sellingPrice !== undefined) {
        throw new Error('Selling price is auto-calculated from Original Price and category discount');
      }
      return true;
    })
    .withMessage('Selling price is auto-calculated and cannot be set manually'),

  body('finalPrice')
    .custom((value, { req }) => {
      if (req.body.finalPrice !== undefined) {
        throw new Error('Selling price is auto-calculated from Original Price and category discount');
      }
      return true;
    })
    .withMessage('Selling price is auto-calculated and cannot be set manually'),

  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),

  body('images')
    .optional()
    .isArray().withMessage('Images must be an array'),

  body('images.*')
    .optional()
    .isString().withMessage('Each image must be a string'),

  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be an integer greater than or equal to 0'),

  body('reorderLevel')
    .optional()
    .isInt({ min: 0 }).withMessage('Reorder level must be an integer greater than or equal to 0'),

  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Status must be either active or inactive'),

  body('isFeatured')
    .optional()
    .isBoolean().withMessage('isFeatured must be a boolean')
];

/**
 * Product ID param validator.
 */
const validateProductId = [
  param('id')
    .isMongoId().withMessage('Invalid product ID format')
];

module.exports = { validateProduct, validateProductId };