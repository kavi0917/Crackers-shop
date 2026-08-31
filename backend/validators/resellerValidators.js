/* ============================================================
   VENDHAN CRACKERS — Reseller / Referral Validators (Phase 8)
   ============================================================ */

const { body, param, query } = require('express-validator');

/**
 * Customer ID param validator.
 */
const validateResellerId = [
  param('id')
    .isMongoId().withMessage('Invalid reseller ID format')
];

/**
 * Commission ID param validator.
 */
const validateCommissionId = [
  param('id')
    .isMongoId().withMessage('Invalid commission ID format')
];

/**
 * Referral code body validator.
 * The backend normalizes to uppercase before lookup (case-insensitive).
 */
const validateReferralCode = [
  body('referralCode')
    .notEmpty().withMessage('Referral code is required')
    .isString().withMessage('Referral code must be a string')
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('Referral code must be between 3 and 20 characters')
];

/**
 * Commission status query validator (admin + reseller list).
 */
const validateCommissionStatusQuery = [
  query('status')
    .optional()
    .isIn(['pending', 'earned', 'cancelled']).withMessage('status must be pending, earned, or cancelled')
];

/**
 * Reseller status query validator (admin list).
 */
const validateResellerStatusQuery = [
  query('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('status must be active or inactive')
];

module.exports = {
  validateResellerId,
  validateCommissionId,
  validateReferralCode,
  validateCommissionStatusQuery,
  validateResellerStatusQuery
};