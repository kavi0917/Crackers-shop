/* ============================================================
   VENDHAN CRACKERS — Admin Audit Log Controllers (Phase 8)
   ============================================================ */

const auditLogService = require('../services/auditLogService');
const asyncHandler = require('../utils/asyncHandler');
const { paginationMeta } = require('../utils/paginate');

/**
 * GET /api/admin/audit-logs
 * List audit records with search/filter/pagination.
 * Admin-only. Newest first by default.
 */
const listAuditLogs = asyncHandler(async (req, res) => {
  const { logs, total, page, limit } = await auditLogService.listAuditLogs(req.query);

  res.json({
    success: true,
    message: 'Audit logs retrieved successfully',
    data: {
      auditLogs: logs,
      pagination: paginationMeta(total, page, limit)
    }
  });
});

/**
 * GET /api/admin/audit-logs/:id
 * Return a single audit record. Admin-only.
 */
const getAuditLog = asyncHandler(async (req, res) => {
  const auditLog = await auditLogService.getAuditLogById(req.params.id);

  res.json({
    success: true,
    message: 'Audit log retrieved successfully',
    data: { auditLog }
  });
});

module.exports = {
  listAuditLogs,
  getAuditLog
};