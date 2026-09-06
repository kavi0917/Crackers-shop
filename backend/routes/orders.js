/* ============================================================
   VENDHAN CRACKERS — Customer Order Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const { authenticateUser } = require('../middleware/auth');
const { validateOrderId } = require('../validators/orderValidators');
const validateResult = require('../validators/validateResult');

/* All customer order routes require authentication */
router.use(authenticateUser);

/* GET /api/orders — list my orders (paginated) */
router.get('/', orderController.listMyOrders);

/* GET /api/orders/:id/track — must be defined before /:id */
router.get('/:id/track', validateOrderId, validateResult, orderController.trackOrder);

/* GET /api/orders/:id/invoice — must be defined before /:id */
router.get('/:id/invoice', validateOrderId, validateResult, orderController.downloadInvoice);

/* GET /api/orders/:id */
router.get('/:id', validateOrderId, validateResult, orderController.getOrder);

/* POST /api/orders/:id/cancel */
router.post('/:id/cancel', validateOrderId, validateResult, orderController.cancelOrder);

module.exports = router;