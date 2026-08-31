/* ============================================================
   VENDHAN CRACKERS — Customer Referral & Reseller Dashboard Routes (Phase 8)
   ============================================================ */

const express = require('express');
const router = express.Router();

const resellerController = require('../controllers/resellerController');
const { authenticateUser } = require('../middleware/auth');
const { validateReferralCode, validateCommissionStatusQuery } = require('../validators/resellerValidators');
const validateResult = require('../validators/validateResult');

/* All routes here require customer authentication */
router.use(authenticateUser);

/* POST /api/referral/apply — apply a reseller referral code (retail only) */
router.post('/apply', validateReferralCode, validateResult, resellerController.applyReferral);

/* GET /api/referral/me — current referral status */
router.get('/me', resellerController.getMyReferral);

/* GET /api/reseller/dashboard — reseller dashboard summary */
router.get('/dashboard', resellerController.getResellerDashboard);

/* GET /api/reseller/commissions — reseller commission records */
router.get('/commissions', validateCommissionStatusQuery, validateResult, resellerController.listResellerCommissions);

module.exports = router;