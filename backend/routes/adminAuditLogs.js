/* ============================================================
   VENDHAN CRACKERS — Admin Audit Log Routes (Phase 8)
   ============================================================
   READ-ONLY by design:
   - Audit records are immutable historical records. There is NO
     PUT/DELETE endpoint (and no create endpoint — writes happen only
     through the central audit service during real admin operations). */

const express = require('express');
const router = express.Router();

const adminAuditLogController = require('../controllers/adminAuditLogController');
const { authenticateAdmin } = require('../middleware/auth');
const { param } = require('express-validator');
const validateResult = require('../validators/validateResult');

/* Audit log id param validator. */
const validateAuditLogId = [
  param('id')
    .isMongoId().withMessage('Invalid audit log ID format')
];

/* All admin audit-log routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/audit-logs — list with filters + pagination */
router.get('/', adminAuditLogController.listAuditLogs);

/* GET /api/admin/audit-logs/:id — single audit record */
router.get('/:id', validateAuditLogId, validateResult, adminAuditLogController.getAuditLog);

module.exports = router;