/* ============================================================
   VENDHAN CRACKERS — Auth Validators
   ============================================================ */

const { body } = require('express-validator');

/**
 * Customer Registration validators.
 * Validates: name, email, phone, password strength.
 */
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\d{10}$/).withMessage('Phone number must be exactly 10 digits'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least 1 letter and 1 number'),

  body('customerType')
    .optional()
    .isIn(['retail', 'wholesale']).withMessage('Customer type must be retail or wholesale')
];

/**
 * Customer Login validators.
 * Accepts email and password.
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
];

/**
 * Admin Login validators.
 */
const validateAdminLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
];

module.exports = {
  validateRegister,
  validateLogin,
  validateAdminLogin
};