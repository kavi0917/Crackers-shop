/* ============================================================
   VENDHAN CRACKERS — Coupon Validators
   ============================================================ */

const { body, param } = require('express-validator');

/**
 * Coupon ID param validator.
 */
const validateCouponId = [
  param('id')
    .isMongoId().withMessage('Invalid coupon ID format')
];

/**
 * POST /api/coupon/validate (customer).
 * `subtotal` is the order amount basis used by the caller (pre-coupon payable).
 */
const validateCouponValidation = [
  body('code')
    .trim()
    .notEmpty().withMessage('Coupon code is required')
    .isLength({ min: 3, max: 30 }).withMessage('Coupon code must be between 3 and 30 characters'),

  body('subtotal')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Subtotal must be a non-negative number')
];

/**
 * Shared validators for coupon fields (create + update).
 */
const couponFieldValidators = [
  body('code')
    .trim()
    .notEmpty().withMessage('Coupon code is required')
    .isLength({ min: 3, max: 30 }).withMessage('Coupon code must be between 3 and 30 characters'),

  body('discountType')
    .notEmpty().withMessage('Discount type is required')
    .isIn(['percentage', 'fixed']).withMessage('Discount type must be percentage or fixed'),

  body('discountValue')
    .notEmpty().withMessage('Discount value is required')
    .isFloat({ min: 0.01 }).withMessage('Discount value must be greater than 0'),

  body('minimumOrderAmount')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Minimum order amount cannot be negative'),

  body('maximumDiscount')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Maximum discount cannot be negative'),

  body('startDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Start date must be a valid date'),

  body('expiryDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Expiry date must be a valid date'),

  body('usageLimit')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 }).withMessage('Usage limit must be a non-negative integer'),

  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Status must be either active or inactive')
];

/**
 * Custom cross-field checks: percentage <= 100 and expiry >= start.
 */
const crossFieldChecks = [
  body('discountValue').custom((value, { req }) => {
    if (req.body.discountType === 'percentage' && Number(value) > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }
    return true;
  }),
  body('expiryDate').custom((value, { req }) => {
    if (value && req.body.startDate && new Date(value).getTime() < new Date(req.body.startDate).getTime()) {
      throw new Error('Expiry date cannot be before the start date');
    }
    return true;
  })
];

/**
 * POST /api/admin/coupons — create.
 */
const validateCreateCoupon = [
  ...couponFieldValidators,
  ...crossFieldChecks
];

/**
 * PUT /api/admin/coupons/:id — update (all fields optional but validated when present).
 */
const validateUpdateCoupon = [
  body('code')
    .optional()
    .trim()
    .notEmpty().withMessage('Coupon code cannot be empty')
    .isLength({ min: 3, max: 30 }).withMessage('Coupon code must be between 3 and 30 characters'),

  body('discountType')
    .optional()
    .isIn(['percentage', 'fixed']).withMessage('Discount type must be percentage or fixed'),

  body('discountValue')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Discount value must be greater than 0'),

  body('minimumOrderAmount')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Minimum order amount cannot be negative'),

  body('maximumDiscount')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 }).withMessage('Maximum discount cannot be negative'),

  body('startDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Start date must be a valid date'),

  body('expiryDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Expiry date must be a valid date'),

  body('usageLimit')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 }).withMessage('Usage limit must be a non-negative integer'),

  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Status must be either active or inactive'),

  ...crossFieldChecks
];

module.exports = {
  validateCouponId,
  validateCouponValidation,
  validateCreateCoupon,
  validateUpdateCoupon
};