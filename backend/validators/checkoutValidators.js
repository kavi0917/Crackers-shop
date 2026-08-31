/* ============================================================
   VENDHAN CRACKERS — Checkout Validators
   ============================================================ */

const { body } = require('express-validator');

/**
 * Shared delivery/customer info validators.
 * Used by both validate and checkout endpoints.
 */
const validateDeliveryInfo = [
  body('name')
    .trim()
    .notEmpty().withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\d{10}$/).withMessage('Phone number must be exactly 10 digits'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address'),

  body('address')
    .trim()
    .notEmpty().withMessage('Delivery address is required')
    .isLength({ max: 500 }).withMessage('Address cannot exceed 500 characters'),

  body('city')
    .trim()
    .notEmpty().withMessage('City is required')
    .isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),

  body('state')
    .trim()
    .notEmpty().withMessage('State is required')
    .isLength({ max: 100 }).withMessage('State cannot exceed 100 characters'),

  body('pincode')
    .trim()
    .notEmpty().withMessage('Pincode is required')
    .matches(/^\d{6}$/).withMessage('Pincode must be exactly 6 digits')
];

/**
 * POST /api/checkout/validate
 */
const validateCheckout = [
  ...validateDeliveryInfo
];

/**
 * POST /api/checkout
 */
const validateCreateOrder = [
  ...validateDeliveryInfo,
  body('paymentMethod')
    .optional()
    .isIn(['cod', 'upi', 'card']).withMessage('Payment method must be cod, upi, or card')
];

module.exports = {
  validateCheckout,
  validateCreateOrder
};