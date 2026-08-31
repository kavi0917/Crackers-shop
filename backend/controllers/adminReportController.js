/* ============================================================
   VENDHAN CRACKERS — Admin Report Controllers (Phase 9)
   ============================================================ */

const adminReportService = require('../services/adminReportService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/admin/reports/sales
 * Comprehensive sales analytics dashboard report.
 */
const getSalesReport = asyncHandler(async (req, res) => {
  const data = await adminReportService.getSalesReport(req.query);

  res.json({
    success: true,
    message: 'Sales analytics report retrieved successfully',
    data
  });
});

/**
 * GET /api/admin/reports/products
 * Product report: quantity sold and revenue per product.
 */
const getProductsReport = asyncHandler(async (req, res) => {
  const data = await adminReportService.getProductsReport(req.query);

  res.json({
    success: true,
    message: 'Product report retrieved successfully',
    data
  });
});

/**
 * GET /api/admin/reports/categories
 * Category report: quantity sold and revenue per category.
 */
const getCategoriesReport = asyncHandler(async (req, res) => {
  const data = await adminReportService.getCategoriesReport(req.query);

  res.json({
    success: true,
    message: 'Category report retrieved successfully',
    data
  });
});

/**
 * GET /api/admin/reports/export/csv
 * Export the current report as CSV.
 */
const exportCsv = asyncHandler(async (req, res) => {
  const csv = await adminReportService.generateCsv(req.query);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="sales-report.csv"');
  res.send(csv);
});

/**
 * GET /api/admin/reports/export/pdf
 * Export the current report as a professional PDF.
 */
const exportPdf = asyncHandler(async (req, res) => {
  const pdfBuffer = await adminReportService.generatePdf(req.query);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');
  res.send(pdfBuffer);
});

module.exports = {
  getSalesReport,
  getProductsReport,
  getCategoriesReport,
  exportCsv,
  exportPdf
};