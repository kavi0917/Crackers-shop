/* ============================================================
   VENDHAN CRACKERS — Order Validators
   ============================================================ */

const { param, body } = require('express-validator');

/**
 * Order ID param validator.
 */
const validateOrderId = [
  param('id')
    .isMongoId().withMessage('Invalid order ID format')
];

/**
 * Admin order status update validator.
 */
const validateOrderStatus = [
  param('id')
    .isMongoId().withMessage('Invalid order ID format'),

  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'confirmed', 'packed', 'delivered', 'cancelled'])
    .withMessage('Status must be one of: pending, confirmed, packed, delivered, cancelled')
];

module.exports = {
  validateOrderId,
  validateOrderStatus
};