/* ============================================================
   VENDHAN CRACKERS — Admin Customer Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const adminCustomerController = require('../controllers/adminCustomerController');
const { authenticateAdmin } = require('../middleware/auth');
const { validateCustomerId, validateCustomerStatus, validateCustomerType, validateCustomerTypeQuery } = require('../validators/customerValidators');
const validateResult = require('../validators/validateResult');

/* All admin customer routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/customers — list with search, status filter, customerType filter, sorting, pagination */
router.get('/', validateCustomerTypeQuery, validateResult, adminCustomerController.listCustomers);

/* GET /api/admin/customers/:id */
router.get('/:id', validateCustomerId, validateResult, adminCustomerController.getCustomer);

/* GET /api/admin/customers/:id/orders */
router.get('/:id/orders', validateCustomerId, validateResult, adminCustomerController.listCustomerOrders);

/* PUT /api/admin/customers/:id/status */
router.put(
  '/:id/status',
  validateCustomerId,
  validateCustomerStatus,
  validateResult,
  adminCustomerController.updateCustomerStatus
);

/* PUT /api/admin/customers/:id/type */
router.put(
  '/:id/type',
  validateCustomerId,
  validateCustomerType,
  validateResult,
  adminCustomerController.updateCustomerType
);

module.exports = router;