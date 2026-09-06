/* ============================================================
   VENDHAN CRACKERS — Coupon Controllers (Customer)
   ============================================================ */

const couponService = require('../services/couponService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/coupon/validate
 * Validate a coupon code against an order amount and return the applicable
 * discount. NEVER creates an order and NEVER increments usage.
 */
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;

  const result = await couponService.validateCoupon({ code, amount: subtotal });

  res.json({
    success: true,
    message: 'Coupon is valid',
    data: {
      valid: true,
      coupon: couponService.toPublicCoupon(result.coupon),
      discountAmount: result.discountAmount
    }
  });
});

module.exports = {
  validateCoupon
};