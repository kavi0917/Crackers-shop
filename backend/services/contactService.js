/* ============================================================
   VENDHAN CRACKERS — Contact Message Service
   ============================================================ */

const { ContactMessage } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate');

/**
 * Public: Submit a contact message.
 * Initial status is 'new'.
 */
async function submitContactMessage({ name, email, phone, subject, message }) {
  const contactMessage = await ContactMessage.create({
    name,
    email: email.toLowerCase().trim(),
    phone: phone || null,
    subject,
    message,
    status: 'new'
  });

  return contactMessage;
}

/**
 * Admin: List contact messages with search, status filter, and pagination.
 */
async function listContactMessages(query) {
  const { page, limit, skip } = paginate(query, { defaultLimit: 10, maxLimit: 50 });

  const filter = {};
  if (query.status) {
    if (!['new', 'read', 'replied', 'closed'].includes(query.status)) {
      throw new ApiError(400, 'Invalid status filter', ['status must be new, read, replied, or closed']);
    }
    filter.status = query.status;
  }
  if (query.search) {
    const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { subject: searchRegex }
    ];
  }

  const total = await ContactMessage.countDocuments(filter);
  const messages = await ContactMessage.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { messages, total, page, limit };
}

/**
 * Admin: Get a single contact message by id.
 */
async function getContactMessage(messageId) {
  const message = await ContactMessage.findById(messageId);
  if (!message) {
    throw new ApiError(404, 'Contact message not found', ['Message does not exist']);
  }
  return message;
}

/**
 * Admin: Update a contact message status.
 */
async function updateContactMessageStatus(messageId, status) {
  if (!['new', 'read', 'replied', 'closed'].includes(status)) {
    throw new ApiError(400, 'Invalid status', ['status must be new, read, replied, or closed']);
  }

  const message = await ContactMessage.findById(messageId);
  if (!message) {
    throw new ApiError(404, 'Contact message not found', ['Message does not exist']);
  }

  message.status = status;
  await message.save();
  return message;
}

/**
 * Admin: Delete a contact message.
 */
async function deleteContactMessage(messageId) {
  const message = await ContactMessage.findById(messageId);
  if (!message) {
    throw new ApiError(404, 'Contact message not found', ['Message does not exist']);
  }

  await message.deleteOne();
  return { message: 'Contact message deleted successfully' };
}

module.exports = {
  submitContactMessage,
  listContactMessages,
  getContactMessage,
  updateContactMessageStatus,
  deleteContactMessage
};