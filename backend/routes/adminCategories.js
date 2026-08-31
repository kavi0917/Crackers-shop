/* ============================================================
   VENDHAN CRACKERS — Admin Category Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const { authenticateAdmin } = require('../middleware/auth');
const { validateCategory, validateCategoryId } = require('../validators/categoryValidators');
const validateResult = require('../validators/validateResult');

/* All admin category routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/categories — all categories including inactive */
router.get('/', categoryController.getAllCategoriesAdmin);

/* POST /api/admin/categories */
router.post('/', validateCategory, validateResult, categoryController.createCategory);

/* PUT /api/admin/categories/:id */
router.put('/:id', validateCategoryId, validateCategory, validateResult, categoryController.updateCategory);

/* DELETE /api/admin/categories/:id */
router.delete('/:id', validateCategoryId, validateResult, categoryController.deleteCategory);

module.exports = router;