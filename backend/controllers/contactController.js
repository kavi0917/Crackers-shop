/* ============================================================
   VENDHAN CRACKERS — Contact Controllers (Public)
   ============================================================ */

const contactService = require('../services/contactService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/contact
 * Submit a contact message (public endpoint).
 */
const submitContactMessage = asyncHandler(async (req, res) => {
  const message = await contactService.submitContactMessage(req.body);

  res.status(201).json({
    success: true,
    message: 'Your message has been sent successfully. We will get back to you soon.',
    data: { messageId: message._id }
  });
});

module.exports = {
  submitContactMessage
};