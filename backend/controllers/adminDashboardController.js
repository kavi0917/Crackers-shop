/* ============================================================
   VENDHAN CRACKERS — Admin Dashboard Controllers
   ============================================================ */

const adminDashboardService = require('../services/adminDashboardService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/admin/dashboard/summary
 */
const getSummary = asyncHandler(async (req, res) => {
  const summary = await adminDashboardService.getSummary();

  res.json({
    success: true,
    message: 'Dashboard summary retrieved successfully',
    data: summary
  });
});

/**
 * GET /api/admin/dashboard/sales
 */
const getSales = asyncHandler(async (req, res) => {
  const data = await adminDashboardService.getSales(req.query);

  res.json({
    success: true,
    message: 'Sales overview retrieved successfully',
    data
  });
});

/**
 * GET /api/admin/dashboard/orders
 */
const getOrderStats = asyncHandler(async (req, res) => {
  const data = await adminDashboardService.getOrderStats();

  res.json({
    success: true,
    message: 'Order statistics retrieved successfully',
    data
  });
});

/**
 * GET /api/admin/dashboard/top-products
 */
const getTopProducts = asyncHandler(async (req, res) => {
  const products = await adminDashboardService.getTopProducts(req.query);

  res.json({
    success: true,
    message: 'Top products retrieved successfully',
    data: { products }
  });
});

/**
 * GET /api/admin/dashboard/category-sales
 */
const getCategorySales = asyncHandler(async (req, res) => {
  const categories = await adminDashboardService.getCategorySales(req.query);

  res.json({
    success: true,
    message: 'Category sales retrieved successfully',
    data: { categories }
  });
});

/**
 * GET /api/admin/dashboard/recent-orders
 */
const getRecentOrders = asyncHandler(async (req, res) => {
  const orders = await adminDashboardService.getRecentOrders(req.query);

  res.json({
    success: true,
    message: 'Recent orders retrieved successfully',
    data: { orders }
  });
});

/**
 * GET /api/admin/dashboard/low-stock
 */
const getLowStock = asyncHandler(async (req, res) => {
  const products = await adminDashboardService.getLowStock();

  res.json({
    success: true,
    message: 'Low stock products retrieved successfully',
    data: { products }
  });
});

/**
 * GET /api/admin/dashboard/analytics
 * Consolidated Phase 5 dashboard analytics payload (single request).
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const data = await adminDashboardService.getAnalytics(req.query);

  res.json({
    success: true,
    message: 'Dashboard analytics retrieved successfully',
    data
  });
});

module.exports = {
  getSummary,
  getSales,
  getOrderStats,
  getTopProducts,
  getCategorySales,
  getRecentOrders,
  getLowStock,
  getAnalytics
};