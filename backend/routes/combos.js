/* ============================================================
   VENDHAN CRACKERS — Combo Routes (Public)
   ============================================================ */

const express = require('express');
const router = express.Router();

const comboController = require('../controllers/comboController');
const { authenticateUser } = require('../middleware/auth');
const { validateComboId } = require('../validators/comboValidators');
const validateResult = require('../validators/validateResult');

/* GET /api/combos — list active combos */
router.get('/', comboController.listCombos);

/* GET /api/combos/:id — combo details */
router.get('/:id', validateComboId, validateResult, comboController.getCombo);

/* POST /api/combos/:id/add-to-cart — authenticated customer only */
router.post(
  '/:id/add-to-cart',
  authenticateUser,
  validateComboId,
  validateResult,
  comboController.addComboToCart
);

module.exports = router;