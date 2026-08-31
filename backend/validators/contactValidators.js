/* ============================================================
   VENDHAN CRACKERS — Contact Validators
   ============================================================ */

const { body, param } = require('express-validator');

/**
 * Submit Contact Message validators.
 * Validates: name, email, phone, subject, message.
 */
const validateContactMessage = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address'),

  body('phone')
    .optional({ nullable: true })
    .matches(/^\d{10}$/).withMessage('Phone number must be exactly 10 digits'),

  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required')
    .isLength({ min: 3, max: 150 }).withMessage('Subject must be between 3 and 150 characters'),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Message must be between 10 and 2000 characters')
];

/**
 * Contact message ID param validator.
 */
const validateContactMessageId = [
  param('id')
    .isMongoId().withMessage('Invalid contact message ID format')
];

/**
 * Update Contact Message Status validators.
 */
const validateContactMessageStatus = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['new', 'read', 'replied', 'closed']).withMessage('Status must be new, read, replied, or closed')
];

module.exports = {
  validateContactMessage,
  validateContactMessageId,
  validateContactMessageStatus
};