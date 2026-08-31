/* ============================================================
   VENDHAN CRACKERS — Admin Order Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const adminOrderController = require('../controllers/adminOrderController');
const { authenticateAdmin } = require('../middleware/auth');
const { validateOrderId, validateOrderStatus } = require('../validators/orderValidators');
const validateResult = require('../validators/validateResult');

/* All admin order routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/orders — list all orders with filters */
router.get('/', adminOrderController.listOrders);

/* GET /api/admin/orders/:id */
router.get('/:id', validateOrderId, validateResult, adminOrderController.getOrder);

/* PUT /api/admin/orders/:id/status */
router.put('/:id/status', validateOrderStatus, validateResult, adminOrderController.updateOrderStatus);

module.exports = router;