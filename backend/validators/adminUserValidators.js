/* ============================================================
   VENDHAN CRACKERS — Admin User Management Validators
   ============================================================ */

const { body, param } = require('express-validator');

/**
 * Create Admin User validators.
 */
const validateCreateAdmin = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),

  body('role')
    .optional()
    .isIn(['super_admin', 'manager']).withMessage('Role must be super_admin or manager'),

  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
];

/**
 * Admin user ID param validator.
 */
const validateAdminId = [
  param('id')
    .isMongoId().withMessage('Invalid admin user ID format')
];

/**
 * Update Admin User Status validators.
 */
const validateAdminStatus = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
];

module.exports = {
  validateCreateAdmin,
  validateAdminId,
  validateAdminStatus
};