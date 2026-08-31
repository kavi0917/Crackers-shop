/* ============================================================
   VENDHAN CRACKERS — Admin Report Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const adminReportController = require('../controllers/adminReportController');
const { authenticateAdmin } = require('../middleware/auth');

/* All admin report routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/reports/sales */
router.get('/sales', adminReportController.getSalesReport);

/* GET /api/admin/reports/products */
router.get('/products', adminReportController.getProductsReport);

/* GET /api/admin/reports/categories */
router.get('/categories', adminReportController.getCategoriesReport);

/* GET /api/admin/reports/export/csv */
router.get('/export/csv', adminReportController.exportCsv);

/* GET /api/admin/reports/export/pdf */
router.get('/export/pdf', adminReportController.exportPdf);

module.exports = router;
