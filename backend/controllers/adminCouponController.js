/* ============================================================
   VENDHAN CRACKERS — Admin Coupon Controllers
   ============================================================ */

const couponService = require('../services/couponService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/admin/coupons
 * List all coupons (including inactive). Optional `q` search + `status` filter.
 */
const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await couponService.listCoupons(req.query);

  res.json({
    success: true,
    message: 'Coupons retrieved successfully',
    data: { coupons }
  });
});

/**
 * GET /api/admin/coupons/:id
 * Return a single coupon (including inactive).
 */
const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.getCouponById(req.params.id);

  res.json({
    success: true,
    message: 'Coupon retrieved successfully',
    data: { coupon }
  });
});

/**
 * POST /api/admin/coupons
 * Create a new coupon.
 */
const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.createCoupon(req.body);

  res.status(201).json({
    success: true,
    message: 'Coupon created successfully',
    data: { coupon }
  });
});

/**
 * PUT /api/admin/coupons/:id
 * Update an existing coupon (including activate/deactivate via `status`).
 */
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.updateCoupon(req.params.id, req.body);

  res.json({
    success: true,
    message: 'Coupon updated successfully',
    data: { coupon }
  });
});

/**
 * DELETE /api/admin/coupons/:id
 * Delete a coupon.
 */
const deleteCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.deleteCoupon(req.params.id);

  res.json({
    success: true,
    message: result.message,
    data: result
  });
});

module.exports = {
  listCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon
};