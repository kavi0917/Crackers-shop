/* ============================================================
   VENDHAN CRACKERS — Admin Dashboard Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const adminDashboardController = require('../controllers/adminDashboardController');
const { authenticateAdmin } = require('../middleware/auth');

/* All admin dashboard routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/dashboard/summary */
router.get('/summary', adminDashboardController.getSummary);

/* GET /api/admin/dashboard/sales */
router.get('/sales', adminDashboardController.getSales);

/* GET /api/admin/dashboard/orders */
router.get('/orders', adminDashboardController.getOrderStats);

/* GET /api/admin/dashboard/top-products */
router.get('/top-products', adminDashboardController.getTopProducts);

/* GET /api/admin/dashboard/category-sales */
router.get('/category-sales', adminDashboardController.getCategorySales);

/* GET /api/admin/dashboard/recent-orders */
router.get('/recent-orders', adminDashboardController.getRecentOrders);

/* GET /api/admin/dashboard/low-stock */
router.get('/low-stock', adminDashboardController.getLowStock);

/* GET /api/admin/dashboard/analytics */
router.get('/analytics', adminDashboardController.getAnalytics);

module.exports = router;