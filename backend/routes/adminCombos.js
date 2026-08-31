/* ============================================================
   VENDHAN CRACKERS — Admin Combo Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const adminComboController = require('../controllers/adminComboController');
const { authenticateAdmin } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');
const { validateCreateCombo, validateUpdateCombo, validateComboId } = require('../validators/comboValidators');
const validateResult = require('../validators/validateResult');

/**
 * FormData (multipart) sends every field as a string. Rebuild the payload so the
 * existing validators/services keep receiving the same shape as JSON requests:
 * price/discount → numbers, items (JSON string) → array. Image is handled by
 * the controller from req.file (same pattern as Admin Products).
 */
function parseComboPayload(req, res, next) {
  if (!req.body || typeof req.body !== 'object') return next();
  if (typeof req.body.price === 'string' && req.body.price !== '') {
    req.body.price = Number(req.body.price);
  }
  if (typeof req.body.discount === 'string' && req.body.discount !== '') {
    req.body.discount = Number(req.body.discount);
  }
  if (typeof req.body.items === 'string') {
    try {
      req.body.items = JSON.parse(req.body.items);
    } catch (e) {
      // Leave as-is — validators will reject an invalid items payload.
    }
  }
  next();
}

/* All admin combo routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/combos — all combos including inactive */
router.get('/', adminComboController.listCombos);

/* POST /api/admin/combos — multipart/form-data with optional image upload */
router.post('/',
  uploadSingleImage('image'),
  parseComboPayload,
  validateCreateCombo,
  validateResult,
  adminComboController.createCombo);

/* GET /api/admin/combos/:id */
router.get('/:id', validateComboId, validateResult, adminComboController.getCombo);

/* PUT /api/admin/combos/:id — multipart/form-data with optional image upload */
router.put('/:id',
  validateComboId,
  uploadSingleImage('image'),
  parseComboPayload,
  validateUpdateCombo,
  validateResult,
  adminComboController.updateCombo);

/* DELETE /api/admin/combos/:id */
router.delete('/:id', validateComboId, validateResult, adminComboController.deleteCombo);

module.exports = router;