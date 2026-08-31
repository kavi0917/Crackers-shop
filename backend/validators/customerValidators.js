/* ============================================================
   VENDHAN CRACKERS — Admin Customer Validators
   ============================================================ */

const { body, param, query } = require('express-validator');

/**
 * Customer ID param validator.
 */
const validateCustomerId = [
  param('id')
    .isMongoId().withMessage('Invalid customer ID format')
];

/**
 * Update Customer Status validators.
 */
const validateCustomerStatus = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
];

/**
 * Update Customer Type validators.
 */
const validateCustomerType = [
  body('customerType')
    .notEmpty().withMessage('Customer type is required')
    .isIn(['retail', 'wholesale']).withMessage('Customer type must be retail or wholesale')
];

/**
 * Customer Type query validators (GET /api/admin/customers?customerType=...).
 */
const validateCustomerTypeQuery = [
  query('customerType')
    .optional()
    .isIn(['retail', 'wholesale']).withMessage('customerType must be retail or wholesale')
];

module.exports = { validateCustomerId, validateCustomerStatus, validateCustomerType, validateCustomerTypeQuery };