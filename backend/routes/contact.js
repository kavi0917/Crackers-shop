/* ============================================================
   VENDHAN CRACKERS — Contact Routes (Public)
   ============================================================ */

const express = require('express');
const router = express.Router();

const contactController = require('../controllers/contactController');
const { validateContactMessage } = require('../validators/contactValidators');
const validateResult = require('../validators/validateResult');

/* POST /api/contact — submit a contact message (public) */
router.post('/', validateContactMessage, validateResult, contactController.submitContactMessage);

module.exports = router;