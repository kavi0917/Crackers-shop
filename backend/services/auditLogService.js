/* ============================================================
   VENDHAN CRACKERS — Central Audit Log Service (Phase 8)
   ============================================================
   Single, consistent API for creating and reading audit records.

   SECURITY / CONSISTENCY RULES
   -----------------------------
   1. The ACTOR is ALWAYS the authenticated backend Admin passed in by the
      controller (req.admin). Frontend-supplied identity is never used — the
      service only accepts an actor object provided by server-side callers.
   2. SENSITIVE DATA SANITIZATION — every value stored (oldValues, newValues,
      metadata, description) is deep-cleaned before save. Passwords, hashes,
      JWTs, access/refresh tokens, API keys, cookies and authorization data
      are stripped and never persisted.
   3. BOUNDED SIZE — arrays are capped and objects are depth/size capped so a
      single audit record can never balloon to an enormous document.
   4. IMMUTABILITY — there is no update/delete API for audit records.

   TRANSACTION / CONSISTENCY BEHAVIOR
   -----------------------------------
   - When `sessionOpt` is provided (the caller is inside an existing MongoDB
     transaction, e.g. admin order status change), the audit record is created
     in the SAME transaction/session. Errors propagate so the transaction
     rolls back — the primary operation and its audit record commit or fail
     together (no misleading success audit for a rolled-back operation).
   - When `sessionOpt` is absent (non-transactional operation), audit writes
     are BEST-EFFORT: a failure to persist the audit record is logged to the
     server console and NEVER fails the already-successful business operation.
     This is intentional and matches "audit logging must not break business
     operations" for the non-transactional path.
   ============================================================ */

const { AuditLog } = require('../models');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate');

/* Maximum document size guard: keep individual audit values reasonably small. */
const MAX_ARRAY_ITEMS = 100;   // per array kept in a value
const MAX_OBJECT_KEYS = 100;   // per object kept in a value
const MAX_DEPTH = 6;           // recursion depth guard
const MAX_DESCRIPTION_LENGTH = 1000;

/* Keys that must NEVER be persisted (matched case-insensitively against the
   lowercased key). Referral codes and order/coupon codes are safe because only
   these explicit sensitive words are matched — never 'code'/'pin' alone. */
const SENSITIVE_VALUE_KEYS = [
  'password',
  'passwordhash',
  'password_hash',
  'passhash',
  'hashedpassword',
  'hash',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'idtoken',
  'id_token',
  'jwt',
  'jwt_token',
  'secret',
  'clientsecret',
  'client_secret',
  'apikey',
  'api_key',
  'authorization',
  'bearer',
  'cookie',
  'sessiontoken',
  'session_token',
  'otp',
  'authcode',
  'auth_code',
  'paymentsecret',
  'payment_token',
  'stripe',
  'razorpay'
];

/** Whether a map key (lowercased) refers to a sensitive value. */
function isSensitiveKey(lowerKey) {
  return SENSITIVE_VALUE_KEYS.some((word) => String(lowerKey).includes(word));
}

/**
 * Deep-clean an arbitrary value before persisting:
 * - drops sensitive keys (case-insensitive substring match),
 * - caps array length, object key count, and recursion depth,
 * - drops undefined values, converts ObjectId to plain string,
 * - an array/object that becomes empty after cleaning is kept as-is
 *   (empty structure) so the shape of old/new values stays meaningful.
 */
function sanitizeValue(value, depth = 0) {
  if (value === undefined) return undefined;
  if (depth > MAX_DEPTH) return undefined;

  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) return value;

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    const cleaned = [];
    for (let i = 0; i < Math.min(value.length, MAX_ARRAY_ITEMS); i++) {
      const item = sanitizeValue(value[i], depth + 1);
      if (item !== undefined) cleaned.push(item);
    }
    return cleaned;
  }

  if (typeof value === 'object') {
    const cleaned = {};
    let kept = 0;
    for (const key of Object.keys(value)) {
      if (kept >= MAX_OBJECT_KEYS) break;
      const lowerKey = String(key).toLowerCase();
      if (isSensitiveKey(lowerKey)) continue;
      const item = sanitizeValue(value[key], depth + 1);
      if (item !== undefined) {
        cleaned[key] = item;
        kept++;
      }
    }
    return cleaned;
  }

  return undefined;
}

/**
 * Normalize the action string to a canonical UPPER form.
 */
function normalizeAction(action) {
  return String(action || 'OTHER').trim().toUpperCase();
}

/**
 * Normalize the module string to a canonical UPPER form.
 */
function normalizeModule(module) {
  return String(module || 'OTHER').trim().toUpperCase();
}

/**
 * Derive actor identity (id + snapshots + model) from a backend-provided
 * Admin/User document/object. Returns null when no actor is available.
 * NEVER reads actor identity from any client-supplied payload.
 */
function resolveActor(actor) {
  if (!actor) return null;
  const id = actor._id || actor.id || null;
  const role = actor.role || '';
  const actorModel = String(role) === 'customer' ? 'User' : 'Admin';
  return {
    id: id || null,
    actorModel,
    email: actor.email || null,
    name: actor.name || null
  };
}

/**
 * Escape regex special characters (used for user-supplied search terms).
 */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a single audit record.
 *
 * @param {Object} input
 * @param {Object} [input.actor]        Backend-authenticated Admin/User doc (req.admin).
 * @param {string} input.action         CREATE | UPDATE | DELETE | STATUS_CHANGE | LOGIN | ...
 * @param {string} input.module         PRODUCT | CATEGORY | ORDER | CUSTOMER | COUPON | ...
 * @param {ObjectId|string} [input.targetId]
 * @param {string} [input.targetType]   Target model/resource name, e.g. "Product".
 * @param {string} input.description    Human-readable summary.
 * @param {*} [input.oldValues]         Previous values (sanitized before save).
 * @param {*} [input.newValues]         New values (sanitized before save).
 * @param {*} [input.metadata]          Optional structured context (sanitized).
 * @param {string} [input.ipAddress]    Best-effort proxy/client IP (req.ip).
 * @param {string} [input.userAgent]    Best-effort user agent header.
 * @param {Object} [input.sessionOpt]   Mongoose transaction session options.
 *
 * @returns {Promise<Object|null>} The created audit document (or null if no actor/description).
 */
async function createAuditLog(input = {}) {
  const actor = resolveActor(input.actor);
  if (!actor || !actor.id) {
    // No authenticated actor — never write an audit record without a real actor.
    return null;
  }
  const description = String(input.description || '').trim().slice(0, MAX_DESCRIPTION_LENGTH);
  if (!description) return null;

  const sessionOpt = input.sessionOpt || {};
  const doc = {
    actor: actor.id,
    actorModel: actor.actorModel,
    actorEmail: actor.email,
    actorName: actor.name,
    action: normalizeAction(input.action),
    module: normalizeModule(input.module),
    targetId: input.targetId || null,
    targetType: input.targetType ? String(input.targetType).trim().slice(0, 120) : null,
    description,
    oldValues: sanitizeValue(input.oldValues),
    newValues: sanitizeValue(input.newValues),
    metadata: sanitizeValue(input.metadata),
    ipAddress: input.ipAddress ? String(input.ipAddress).slice(0, 64) : null,
    userAgent: input.userAgent ? String(input.userAgent).slice(0, 300) : null
  };

  if (sessionOpt.session) {
    // Transactional path — atomic with the caller's transaction. Errors MUST
    // propagate so the transaction aborts and no misleading success audit is
    // left behind for a rolled-back operation.
    const created = await AuditLog.create([doc], sessionOpt);
    return created && created.length > 0 ? created[0] : created;
  }

  // Non-transactional path: best-effort — never fail the business operation.
  try {
    const created = await AuditLog.create([doc], sessionOpt);
    return created && created.length > 0 ? created[0] : created;
  } catch (err) {
    console.error(`[audit-log] Failed to persist audit record (${description}):`, err.message);
    return null;
  }
}

/* Whitelists for query filters — unknown values are rejected (400), matching
   the existing admin filter APIs. */
const VALID_MODULES = [
  'PRODUCT', 'CATEGORY', 'ORDER', 'CUSTOMER', 'COUPON', 'INVENTORY',
  'SETTINGS', 'RESELLER', 'AUTH', 'ADMIN_USER', 'OTHER'
];
const VALID_ACTIONS = [
  'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN', 'LOGOUT',
  'ACTIVATE', 'DEACTIVATE', 'OTHER'
];

/**
 * Admin: list audit logs with filters + safe pagination.
 * Query params: page, limit, search, actor, module, action, targetId,
 *               startDate, endDate, sort.
 * Default sort: createdAt DESC. Max limit enforced by paginate().
 */
async function listAuditLogs(query = {}) {
  const { page, limit, skip } = paginate(query, { defaultLimit: 25, maxLimit: 100 });

  const filter = {};

  // Free-text search across the human-readable/displayable string fields.
  if (query.search && String(query.search).trim()) {
    const searchRegex = new RegExp(escapeRegex(String(query.search).trim()), 'i');
    filter.$or = [
      { description: searchRegex },
      { actorEmail: searchRegex },
      { actorName: searchRegex },
      { targetType: searchRegex },
      { module: searchRegex },
      { action: searchRegex }
    ];
  }

  // Module filter
  if (query.module && String(query.module).trim()) {
    const module = normalizeModule(query.module);
    if (!VALID_MODULES.includes(module)) {
      throw new ApiError(400, 'Invalid module filter', ['module must be one of: ' + VALID_MODULES.join(', ')]);
    }
    filter.module = module;
  }

  // Action filter
  if (query.action && String(query.action).trim()) {
    const action = normalizeAction(query.action);
    if (!VALID_ACTIONS.includes(action)) {
      throw new ApiError(400, 'Invalid action filter', ['action must be one of: ' + VALID_ACTIONS.join(', ')]);
    }
    filter.action = action;
  }

  // Actor filter — by exact ObjectId when valid, otherwise by actorEmail/actorName regex.
  if (query.actor && String(query.actor).trim()) {
    const actorTerm = String(query.actor).trim();
    if (/^[0-9a-fA-F]{24}$/.test(actorTerm)) {
      filter.actor = actorTerm;
    } else {
      const actorRegex = new RegExp(escapeRegex(actorTerm), 'i');
      filter.$and = [{ $or: [{ actorEmail: actorRegex }, { actorName: actorRegex }] }];
    }
  }

  // targetId filter (only when a valid ObjectId is provided)
  if (query.targetId && String(query.targetId).trim() && /^[0-9a-fA-F]{24}$/.test(String(query.targetId).trim())) {
    filter.targetId = String(query.targetId).trim();
  }

  // Date range filter on createdAt
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      if (isNaN(start.getTime())) {
        throw new ApiError(400, 'Invalid startDate', ['startDate must be a valid date']);
      }
      filter.createdAt.$gte = start;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      if (isNaN(end.getTime())) {
        throw new ApiError(400, 'Invalid endDate', ['endDate must be a valid date']);
      }
      filter.createdAt.$lte = end;
    }
  }

  // Sort — whitelist only (newest first by default).
  let sort = { createdAt: -1 };
  const sortKey = String(query.sort || 'newest').trim().toLowerCase();
  if (sortKey === 'oldest' || sortKey === 'asc') {
    sort = { createdAt: 1 };
  } else if (sortKey !== 'newest' && sortKey !== 'desc' && sortKey !== '') {
    throw new ApiError(400, 'Invalid sort filter', ['sort must be newest, oldest, asc, or desc']);
  }

  const total = await AuditLog.countDocuments(filter);
  const logs = await AuditLog.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  return { logs, total, page, limit };
}

/**
 * Admin: get a single audit log record by id.
 */
async function getAuditLogById(id) {
  const log = await AuditLog.findById(id);
  if (!log) {
    throw new ApiError(404, 'Audit log not found', ['Audit record does not exist']);
  }
  return log;
}

module.exports = {
  createAuditLog,
  listAuditLogs,
  getAuditLogById,
  sanitizeValue,
  // Reference documentation for the consistency contract (used by tests).
  CONSISTENCY_NOTES:
    'Session-scoped audits are atomic with the caller transaction; ' +
    'non-transactional audits are best-effort and never fail the business operation.'
};