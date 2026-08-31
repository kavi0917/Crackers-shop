/* ============================================================
   VENDHAN CRACKERS — Admin Contact Controllers
   ============================================================ */

const contactService = require('../services/contactService');
const asyncHandler = require('../utils/asyncHandler');
const { paginationMeta } = require('../utils/paginate');

/**
 * GET /api/admin/contact-messages
 * List contact messages with search, status filter, and pagination.
 */
const listContactMessages = asyncHandler(async (req, res) => {
  const { messages, total, page, limit } = await contactService.listContactMessages(req.query);

  res.json({
    success: true,
    message: 'Contact messages retrieved successfully',
    data: {
      messages,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * GET /api/admin/contact-messages/:id
 * Return a single contact message.
 */
const getContactMessage = asyncHandler(async (req, res) => {
  const message = await contactService.getContactMessage(req.params.id);

  res.json({
    success: true,
    message: 'Contact message retrieved successfully',
    data: { message }
  });
});

/**
 * PUT /api/admin/contact-messages/:id
 * Update a contact message status.
 */
const updateContactMessage = asyncHandler(async (req, res) => {
  const message = await contactService.updateContactMessageStatus(req.params.id, req.body.status);

  res.json({
    success: true,
    message: 'Contact message updated successfully',
    data: { message }
  });
});

/**
 * DELETE /api/admin/contact-messages/:id
 * Delete a contact message.
 */
const deleteContactMessage = asyncHandler(async (req, res) => {
  const result = await contactService.deleteContactMessage(req.params.id);

  res.json({
    success: true,
    message: result.message,
    data: result
  });
});

module.exports = {
  listContactMessages,
  getContactMessage,
  updateContactMessage,
  deleteContactMessage
};