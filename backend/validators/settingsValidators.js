/* ============================================================
   VENDHAN CRACKERS — Settings Validators
   ============================================================ */

const { body } = require('express-validator');

/**
 * Update Settings validators.
 * Validates: shopName, phone, email, address, deliveryCharge,
 * freeDeliveryThreshold, gst, lowStockThreshold, openingHours.
 */
const validateSettingsUpdate = [
  body('shopName')
    .optional()
    .trim()
    .notEmpty().withMessage('Shop name cannot be empty')
    .isLength({ max: 100 }).withMessage('Shop name cannot exceed 100 characters'),

  body('phone')
    .optional()
    .trim()
    .notEmpty().withMessage('Phone cannot be empty'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please enter a valid email address'),

  body('address')
    .optional()
    .trim()
    .notEmpty().withMessage('Address cannot be empty'),

  body('deliveryCharge')
    .optional()
    .isFloat({ min: 0 }).withMessage('Delivery charge must be a non-negative number'),

  body('freeDeliveryThreshold')
    .optional()
    .isFloat({ min: 0 }).withMessage('Free delivery threshold must be a non-negative number'),

  body('minimumOrderAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum order amount must be a non-negative number'),

  body('gst')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('GST must be between 0 and 100'),

  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),

  body('openingHours')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Opening hours cannot exceed 100 characters'),

  body('trustedSinceYear')
    .optional()
    .isInt({ min: 1900, max: 2100 }).withMessage('Trusted since year must be between 1900 and 2100'),

  body('customerCount')
    .optional()
    .isInt({ min: 0 }).withMessage('Customer count must be a non-negative integer'),

  /* ============ Contact Details fields ============ */
  body('companyName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Company name cannot exceed 100 characters'),

  body('phone2')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Secondary phone cannot exceed 30 characters'),

  body('email2')
    .optional()
    .trim()
    .isEmail().withMessage('Please enter a valid secondary email address')
    .isLength({ max: 120 }).withMessage('Secondary email cannot exceed 120 characters'),

  body('mondaySaturdayHours')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Monday–Saturday hours cannot exceed 100 characters'),

  body('sundayHours')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Sunday hours cannot exceed 100 characters'),

  body('festivalSeasonHours')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Festival season hours cannot exceed 100 characters'),

  body('whatsappUrl')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('WhatsApp link cannot exceed 500 characters'),

  body('facebookUrl')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Facebook link cannot exceed 500 characters'),

  body('instagramUrl')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Instagram link cannot exceed 500 characters'),

  body('twitterUrl')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Twitter/X link cannot exceed 500 characters'),

  body('mapEmbedUrl')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Map embed URL cannot exceed 2000 characters')
];

module.exports = { validateSettingsUpdate };