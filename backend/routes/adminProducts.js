/* ============================================================
   VENDHAN CRACKERS — Admin Product Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const { authenticateAdmin } = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/upload');
const { validateProduct, validateProductId } = require('../validators/productValidators');
const validateResult = require('../validators/validateResult');

/* All admin product routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/products — all products including inactive */
router.get('/', productController.getAllProductsAdmin);

/* POST /api/admin/products — multipart/form-data with optional image upload */
router.post('/', uploadSingleImage('image'), validateProduct, validateResult, productController.createProduct);

/* GET /api/admin/products/:id */
router.get('/:id', validateProductId, validateResult, productController.getProductAdmin);

/* PUT /api/admin/products/:id — multipart/form-data with optional image upload */
router.put('/:id', validateProductId, uploadSingleImage('image'), validateProduct, validateResult, productController.updateProduct);

/* DELETE /api/admin/products/:id — hard-delete the Product document ONLY.
   Historical/business records (orders, items, pricing snapshots, reports,
   commissions, referrals, reseller history) are NEVER cascade-deleted. */
router.delete('/:id', validateProductId, validateResult, productController.deleteProduct);

module.exports = router;