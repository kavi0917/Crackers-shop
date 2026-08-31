/* ============================================================
   VENDHAN CRACKERS — Admin Inventory Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const adminInventoryController = require('../controllers/adminInventoryController');
const { authenticateAdmin } = require('../middleware/auth');
const { validateInventoryProductId, validateUpdateStock } = require('../validators/inventoryValidators');
const validateResult = require('../validators/validateResult');

/* All admin inventory routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/inventory — list with search/filter/pagination */
router.get('/', adminInventoryController.listInventory);

/* GET /api/admin/inventory/low-stock */
router.get('/low-stock', adminInventoryController.listLowStock);

/* GET /api/admin/inventory/out-of-stock */
router.get('/out-of-stock', adminInventoryController.listOutOfStock);

/* GET /api/admin/inventory/:productId/history — must be before /:productId */
router.get('/:productId/history', validateInventoryProductId, validateResult, adminInventoryController.getInventoryHistory);

/* PUT /api/admin/inventory/:productId — update stock */
router.put('/:productId', validateUpdateStock, validateResult, adminInventoryController.updateStock);

module.exports = router;