/* ============================================================
   VENDHAN CRACKERS — Inventory Validators
   ============================================================ */

const { param, body } = require('express-validator');

/**
 * Product ID param validator for inventory routes.
 */
const validateInventoryProductId = [
  param('productId')
    .isMongoId().withMessage('Invalid product ID format')
];

/**
 * Update stock body validator.
 */
const validateUpdateStock = [
  param('productId')
    .isMongoId().withMessage('Invalid product ID format'),

  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be an integer greater than or equal to 0'),

  body('reorderLevel')
    .optional()
    .isInt({ min: 0 }).withMessage('Reorder level must be an integer greater than or equal to 0'),

  body()
    .custom((value) => {
      if (value.stock === undefined && value.reorderLevel === undefined) {
        throw new Error('Provide stock or reorderLevel to update');
      }
      return true;
    })
];

module.exports = {
  validateInventoryProductId,
  validateUpdateStock
};