/* ============================================================
   VENDHAN CRACKERS — Coupon Routes (Customer Validation)
   ============================================================ */

const express = require('express');
const router = express.Router();

const couponController = require('../controllers/couponController');
const { authenticateUser } = require('../middleware/auth');
const { validateCouponValidation } = require('../validators/couponValidators');
const validateResult = require('../validators/validateResult');

/* Customer coupon validation requires customer authentication */
router.use(authenticateUser);

/* POST /api/coupon/validate */
router.post('/validate', validateCouponValidation, validateResult, couponController.validateCoupon);

module.exports = router;