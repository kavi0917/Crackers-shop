/* ============================================================
   VENDHAN CRACKERS — Admin Coupon Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const adminCouponController = require('../controllers/adminCouponController');
const { authenticateAdmin } = require('../middleware/auth');
const {
  validateCouponId,
  validateCreateCoupon,
  validateUpdateCoupon
} = require('../validators/couponValidators');
const validateResult = require('../validators/validateResult');

/* All admin coupon routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/coupons — all coupons including inactive */
router.get('/', adminCouponController.listCoupons);

/* GET /api/admin/coupons/:id */
router.get('/:id', validateCouponId, validateResult, adminCouponController.getCoupon);

/* POST /api/admin/coupons */
router.post('/', validateCreateCoupon, validateResult, adminCouponController.createCoupon);

/* PUT /api/admin/coupons/:id */
router.put('/:id', validateCouponId, validateUpdateCoupon, validateResult, adminCouponController.updateCoupon);

/* DELETE /api/admin/coupons/:id */
router.delete('/:id', validateCouponId, validateResult, adminCouponController.deleteCoupon);

module.exports = router;