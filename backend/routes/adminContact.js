/* ============================================================
   VENDHAN CRACKERS — Admin Contact Message Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const adminContactController = require('../controllers/adminContactController');
const { authenticateAdmin } = require('../middleware/auth');
const {
  validateContactMessageId,
  validateContactMessageStatus
} = require('../validators/contactValidators');
const validateResult = require('../validators/validateResult');

/* All admin contact routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/contact-messages — list with search, status filter, pagination */
router.get('/', adminContactController.listContactMessages);

/* GET /api/admin/contact-messages/:id */
router.get('/:id', validateContactMessageId, validateResult, adminContactController.getContactMessage);

/* PUT /api/admin/contact-messages/:id — update status */
router.put(
  '/:id',
  validateContactMessageId,
  validateContactMessageStatus,
  validateResult,
  adminContactController.updateContactMessage
);

/* DELETE /api/admin/contact-messages/:id */
router.delete('/:id', validateContactMessageId, validateResult, adminContactController.deleteContactMessage);

module.exports = router;