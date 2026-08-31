/* ============================================================
   VENDHAN CRACKERS — Reseller / Referral / Commission Controllers (Phase 8)
   ============================================================ */

const asyncHandler = require('../utils/asyncHandler');
const { paginationMeta } = require('../utils/paginate');
const resellerService = require('../services/resellerService');

/* ============ ADMIN: RESELLER MANAGEMENT ============ */

/**
 * GET /api/admin/resellers
 */
const listResellers = asyncHandler(async (req, res) => {
  const { resellers, total, page, limit } = await resellerService.listResellers(req.query);

  res.json({
    success: true,
    message: 'Resellers retrieved successfully',
    data: {
      resellers,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * GET /api/admin/resellers/:id
 */
const getReseller = asyncHandler(async (req, res) => {
  const reseller = await resellerService.getResellerById(req.params.id);

  res.json({
    success: true,
    message: 'Reseller retrieved successfully',
    data: { reseller }
  });
});

/**
 * PUT /api/admin/resellers/:id/activate
 */
const activateReseller = asyncHandler(async (req, res) => {
  const reseller = await resellerService.activateReseller(req.params.id, req.admin._id);

  res.json({
    success: true,
    message: 'Reseller activated successfully',
    data: { reseller }
  });
});

/**
 * PUT /api/admin/resellers/:id/deactivate
 */
const deactivateReseller = asyncHandler(async (req, res) => {
  const reseller = await resellerService.deactivateReseller(req.params.id);

  res.json({
    success: true,
    message: 'Reseller deactivated successfully',
    data: { reseller }
  });
});

/**
 * GET /api/admin/resellers/summary
 */
const getResellerSummary = asyncHandler(async (req, res) => {
  const summary = await resellerService.getAdminResellerSummary();

  res.json({
    success: true,
    message: 'Reseller summary retrieved successfully',
    data: summary
  });
});

/**
 * GET /api/admin/resellers/eligible-customers
 */
const listEligibleCustomers = asyncHandler(async (req, res) => {
  const { customers, total, page, limit } = await resellerService.listEligibleCustomers(req.query);

  res.json({
    success: true,
    message: 'Eligible customers retrieved successfully',
    data: {
      customers,
      commissionPercent: resellerService.RESELLER_COMMISSION_PERCENT,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/* ==================== ADMIN: COMMISSION MANAGEMENT ==================== */

/**
 * GET /api/admin/commissions
 */
const listCommissions = asyncHandler(async (req, res) => {
  const { commissions, total, page, limit } = await resellerService.listCommissions(req.query);

  res.json({
    success: true,
    message: 'Commissions retrieved successfully',
    data: {
      commissions,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * GET /api/admin/commissions/:id
 */
const getCommission = asyncHandler(async (req, res) => {
  const commission = await resellerService.getCommissionById(req.params.id);

  res.json({
    success: true,
    message: 'Commission retrieved successfully',
    data: { commission }
  });
});

/* ==================== CUSTOMER: REFERRAL ==================== */

/**
 * POST /api/referral/apply
 * Apply a reseller referral code (retail customers only).
 */
const applyReferral = asyncHandler(async (req, res) => {
  const result = await resellerService.applyReferral(req.user._id, req.body.referralCode);

  res.json({
    success: true,
    message: 'Referral code applied successfully',
    data: result
  });
});

/**
 * GET /api/referral/me
 * View current referral status.
 */
const getMyReferral = asyncHandler(async (req, res) => {
  const referral = await resellerService.getMyReferral(req.user._id);

  res.json({
    success: true,
    message: referral ? 'Referral retrieved successfully' : 'No referral found',
    data: { referral }
  });
});

/* ==================== RESELLER: DASHBOARD ==================== */

/**
 * GET /api/reseller/dashboard
 */
const getResellerDashboard = asyncHandler(async (req, res) => {
  const data = await resellerService.getResellerDashboard(req.user._id);

  res.json({
    success: true,
    message: 'Reseller dashboard retrieved successfully',
    data
  });
});

/**
 * GET /api/reseller/commissions
 */
const listResellerCommissions = asyncHandler(async (req, res) => {
  const { commissions, total, page, limit } = await resellerService.listResellerCommissions(req.user._id, req.query);

  res.json({
    success: true,
    message: 'Commission records retrieved successfully',
    data: {
      commissions,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

module.exports = {
  listResellers,
  getReseller,
  activateReseller,
  deactivateReseller,
  getResellerSummary,
  listEligibleCustomers,
  listCommissions,
  getCommission,
  applyReferral,
  getMyReferral,
  getResellerDashboard,
  listResellerCommissions
};