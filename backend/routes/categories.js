/* ============================================================
   VENDHAN CRACKERS — Category Routes (Public)
   ============================================================ */

const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const { validateCategoryId } = require('../validators/categoryValidators');
const validateResult = require('../validators/validateResult');

/* GET /api/categories */
router.get('/', categoryController.getCategories);

/* GET /api/categories/:id */
router.get('/:id', validateCategoryId, validateResult, categoryController.getCategory);

/* GET /api/categories/:id/products */
router.get('/:id/products', validateCategoryId, validateResult, categoryController.getCategoryProducts);

module.exports = router;