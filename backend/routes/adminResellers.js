/* ============================================================
   VENDHAN CRACKERS — Admin Reseller & Commission Routes (Phase 8)
   ============================================================ */

const express = require('express');
const router = express.Router();

const resellerController = require('../controllers/resellerController');
const { authenticateAdmin } = require('../middleware/auth');
const {
  validateResellerId,
  validateCommissionId,
  validateCommissionStatusQuery,
  validateResellerStatusQuery
} = require('../validators/resellerValidators');
const validateResult = require('../validators/validateResult');

/* All admin reseller routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/resellers — list resellers with search/status/pagination */
router.get('/resellers', validateResellerStatusQuery, validateResult, resellerController.listResellers);

/* GET /api/admin/resellers/summary — KPI stats for the reseller management page */
router.get('/resellers/summary', resellerController.getResellerSummary);

/* GET /api/admin/resellers/eligible-customers — customers that can be activated as resellers */
router.get('/resellers/eligible-customers', resellerController.listEligibleCustomers);

/* GET /api/admin/resellers/:id */
router.get('/resellers/:id', validateResellerId, validateResult, resellerController.getReseller);

/* PUT /api/admin/resellers/:id/activate — mark a customer as an active reseller */
router.put('/resellers/:id/activate', validateResellerId, validateResult, resellerController.activateReseller);

/* PUT /api/admin/resellers/:id/deactivate — remove reseller status (future referrals disabled) */
router.put('/resellers/:id/deactivate', validateResellerId, validateResult, resellerController.deactivateReseller);

/* GET /api/admin/commissions — list commission records with filters/pagination */
router.get('/commissions', validateCommissionStatusQuery, validateResult, resellerController.listCommissions);

/* GET /api/admin/commissions/:id */
router.get('/commissions/:id', validateCommissionId, validateResult, resellerController.getCommission);

module.exports = router;