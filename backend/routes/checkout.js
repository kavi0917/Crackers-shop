/* ============================================================
   VENDHAN CRACKERS — Checkout Routes (Customer)
   ============================================================ */

const express = require('express');
const router = express.Router();

const checkoutController = require('../controllers/checkoutController');
const { authenticateUser } = require('../middleware/auth');
const { validateCheckout, validateCreateOrder } = require('../validators/checkoutValidators');
const validateResult = require('../validators/validateResult');

/* All checkout routes require customer authentication */
router.use(authenticateUser);

/* POST /api/checkout/validate */
router.post('/validate', validateCheckout, validateResult, checkoutController.validateCheckout);

/* POST /api/checkout */
router.post('/', validateCreateOrder, validateResult, checkoutController.createOrder);

module.exports = router;