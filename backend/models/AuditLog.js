/* ============================================================
   VENDHAN CRACKERS — Audit Log Model (Phase 8)
   Immutable historical record of meaningful admin actions.
   ============================================================
   SECURITY RULES (enforced at write time in services/auditLogService.js):
   - Passwords, hashes, JWTs, tokens, API keys and payment secrets are
     NEVER stored here. The service sanitizes every value before save.
   - The actor is always derived from the authenticated backend Admin
     (req.admin), never from frontend-supplied values.
   - Once created, audit records are read-only: no update/delete API exists.
   ============================================================ */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    /* ---------- Actor (authoritative backend identity) ---------- */
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'actorModel',
      default: null
    },
    actorModel: {
      type: String,
      enum: ['Admin', 'User'],
      default: 'Admin'
    },
    // Snapshots for historical readability even if the actor is later removed.
    actorEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null
    },
    actorName: {
      type: String,
      trim: true,
      default: null
    },

    /* ---------- Action & module classification ---------- */
    action: {
      type: String,
      enum: {
        values: ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN', 'LOGOUT', 'ACTIVATE', 'DEACTIVATE', 'OTHER'],
        message: 'Action must be a known audit action'
      },
      required: [true, 'Action is required']
    },
    module: {
      type: String,
      enum: {
        values: [
          'PRODUCT', 'CATEGORY', 'ORDER', 'CUSTOMER', 'COUPON', 'INVENTORY',
          'SETTINGS', 'RESELLER', 'AUTH', 'ADMIN_USER', 'OTHER'
        ],
        message: 'Module must be a known audit module'
      },
      required: [true, 'Module is required']
    },

    /* ---------- Target ---------- */
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    targetType: {
      type: String,
      trim: true,
      default: null
    },

    /* ---------- Description & change snapshots ---------- */
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    // Sanitized (sensitive keys stripped) before write by the audit service.
    oldValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    /* ---------- Request context (best-effort, when reliably available) ---------- */
    ipAddress: {
      type: String,
      trim: true,
      default: null
    },
    userAgent: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: true
  }
);

/* ---------- Indexes ----------
   Chosen for the actual queries of the Admin Audit Log page:
   - default sort  createdAt DESC
   - common filters module / action / actor combined with the
     createdAt sort order, plus indexed lookups by targetId. */
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);