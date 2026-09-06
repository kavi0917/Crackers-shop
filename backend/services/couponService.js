/* ============================================================
   VENDHAN CRACKERS — Coupon Service
   ============================================================
   SINGLE SOURCE OF TRUTH for coupon validation, discount math,
   and usage tracking. Order creation re-validates through this
   service — the backend never trusts frontend coupon calculations.
   ============================================================ */

const { Coupon } = require('../models');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLogService');

/**
 * Compact coupon snapshot used in audit records.
 */
function couponAuditSnapshot(coupon) {
  return {
    id: coupon._id ? coupon._id.toString() : null,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumOrderAmount: coupon.minimumOrderAmount,
    maximumDiscount: coupon.maximumDiscount,
    startDate: coupon.startDate,
    expiryDate: coupon.expiryDate,
    usageLimit: coupon.usageLimit,
    status: coupon.status
  };
}

/**
 * Normalize a coupon code for storage/lookup: trimmed + UPPERCASE.
 * @param {string} code
 * @returns {string}
 */
function normalizeCouponCode(code) {
  if (code === undefined || code === null) return '';
  return String(code).trim().toUpperCase();
}

/**
 * Calculate the coupon discount amount for a given order amount.
 *
 * - percentage: `amount * discountValue / 100`, capped at maximumDiscount (when set).
 * - fixed:      `discountValue`, but never more than the payable amount so the
 *               order total can never go negative.
 *
 * This is the ONLY place coupon discount is calculated.
 *
 * @param {number} amount - The pre-coupon payable (amount the coupon applies to).
 * @param {Object} coupon - Coupon document.
 * @returns {number} Discount amount, rounded to 2 decimals.
 */
function calculateCouponDiscount(amount, coupon) {
  const safeAmount = Math.max(0, Number(amount) || 0);
  let discount = 0;

  if (coupon.discountType === 'percentage') {
    discount = (safeAmount * (Number(coupon.discountValue) || 0)) / 100;
    const maxDisc = coupon.maximumDiscount;
    if (maxDisc !== null && maxDisc !== undefined && Number(maxDisc) > 0) {
      discount = Math.min(discount, Number(maxDisc));
    }
  } else if (coupon.discountType === 'fixed') {
    discount = Math.min(Number(coupon.discountValue) || 0, safeAmount);
  }

  return Math.round(discount * 100) / 100;
}

/**
 * Public coupon snapshot — never expose internal fields.
 * @param {Object} coupon - Coupon document.
 * @returns {Object}
 */
function toPublicCoupon(coupon) {
  return {
    id: coupon._id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumOrderAmount: coupon.minimumOrderAmount,
    maximumDiscount: coupon.maximumDiscount
  };
}

/**
 * Validate a coupon for an order amount.
 * Performs: code normalization, existence, active status, start/expiry date,
 * usage limit, and minimum order amount. NEVER increments usage.
 *
 * @param {{ code: string, amount: number }} input
 * @param {Object} [sessionOpt={}] - Optional mongoose transaction session.
 * @returns {Promise<{ coupon: Object, discountAmount: number }>}
 * @throws {ApiError} 400/404 with a friendly customer-facing message.
 */
async function validateCoupon({ code, amount }, sessionOpt = {}) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) {
    throw new ApiError(400, 'Coupon code is required', ['Coupon code is required']);
  }

  const coupon = await Coupon.findOne({ code: normalized }, null, sessionOpt);
  if (!coupon) {
    throw new ApiError(404, 'Invalid coupon code', ['Coupon not found']);
  }

  if (coupon.status !== 'active') {
    throw new ApiError(400, 'This coupon is no longer active', ['Coupon is inactive']);
  }

  const now = new Date();

  if (coupon.startDate && new Date(coupon.startDate).getTime() > now.getTime()) {
    throw new ApiError(400, 'This coupon is not yet active', ['Coupon not yet started']);
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < now.getTime()) {
    throw new ApiError(400, 'This coupon has expired', ['Coupon has expired']);
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    Number(coupon.usageLimit) >= 0 &&
    Number(coupon.usedCount) >= Number(coupon.usageLimit)
  ) {
    throw new ApiError(400, 'This coupon has reached its usage limit', ['Coupon usage limit reached']);
  }

  const safeAmount = Math.max(0, Number(amount) || 0);
  if (safeAmount < (Number(coupon.minimumOrderAmount) || 0)) {
    throw new ApiError(
      400,
      `This coupon requires a minimum order value of ₹${Number(coupon.minimumOrderAmount).toLocaleString('en-IN')}`,
      ['Coupon minimum order not met']
    );
  }

  const discountAmount = calculateCouponDiscount(safeAmount, coupon);

  return { coupon, discountAmount };
}

/**
 * Increment coupon usage count AFTER a successful order creation.
 * Race-safe: when a usageLimit is set, the atomic update only matches while
 * `usedCount < usageLimit`, so it can never exceed the configured limit.
 *
 * @param {string|ObjectId} couponId
 * @param {Object} [sessionOpt={}] - Optional mongoose transaction session.
 * @returns {Promise<Object>} Updated coupon.
 * @throws {ApiError} 409 if the coupon reached its limit concurrently.
 */
async function incrementCouponUsage(couponId, sessionOpt = {}) {
  const coupon = await Coupon.findById(couponId, null, sessionOpt);
  if (!coupon) {
    throw new ApiError(500, 'Coupon no longer exists', ['Coupon was removed during checkout']);
  }

  const filter = { _id: couponId };
  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
    filter.usedCount = { $lt: Number(coupon.usageLimit) };
  }

  const updated = await Coupon.findOneAndUpdate(
    filter,
    { $inc: { usedCount: 1 } },
    { new: true, ...sessionOpt }
  );

  if (!updated) {
    throw new ApiError(409, 'This coupon has reached its usage limit', ['Coupon usage limit reached']);
  }

  return updated;
}
/* ============================================================
   ADMIN — Coupon Management (all admin-only)
   ============================================================ */

/**
 * Admin: list coupons (including inactive).
 * Supports optional `q` search (code contains, case-insensitive) and `status`.
 */
async function listCoupons(query = {}) {
  const filter = {};
  const q = query.q ? String(query.q).trim() : '';
  if (q) {
    filter.code = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  if (query.status === 'active' || query.status === 'inactive') {
    filter.status = query.status;
  }
  return Coupon.find(filter).sort({ createdAt: -1 });
}

/**
 * Admin: get a single coupon.
 */
async function getCouponById(id) {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found', ['Coupon does not exist']);
  }
  return coupon;
}

/**
 * Cross-field validation for coupon payloads (expiry >= start).
 * @throws {ApiError} 400
 */
function assertValidDates(startDate, expiryDate) {
  const start = startDate ? new Date(startDate) : null;
  const expiry = expiryDate ? new Date(expiryDate) : null;
  if (start && Number.isNaN(start.getTime())) {
    throw new ApiError(400, 'Invalid start date', ['Start date is invalid']);
  }
  if (expiry && Number.isNaN(expiry.getTime())) {
    throw new ApiError(400, 'Invalid expiry date', ['Expiry date is invalid']);
  }
  if (start && expiry && start.getTime() > expiry.getTime()) {
    throw new ApiError(400, 'Expiry date cannot be before the start date', ['Expiry date before start date']);
  }
}

/**
 * Admin: create a coupon from validated fields.
 */
async function createCoupon(data, auditCtx = {}) {
  const code = normalizeCouponCode(data.code);
  if (!code) {
    throw new ApiError(400, 'Coupon code is required', ['Coupon code is required']);
  }

  assertValidDates(data.startDate, data.expiryDate);

  const existing = await Coupon.findOne({ code });
  if (existing) {
    throw new ApiError(409, 'A coupon with this code already exists', ['Duplicate coupon code']);
  }

  const coupon = await Coupon.create({
    code,
    discountType: data.discountType,
    discountValue: data.discountValue,
    minimumOrderAmount: data.minimumOrderAmount !== undefined && data.minimumOrderAmount !== null
      ? Number(data.minimumOrderAmount)
      : 0,
    maximumDiscount: data.maximumDiscount !== undefined && data.maximumDiscount !== null && data.maximumDiscount !== ''
      ? Number(data.maximumDiscount)
      : null,
    startDate: data.startDate || null,
    expiryDate: data.expiryDate || null,
    usageLimit: data.usageLimit !== undefined && data.usageLimit !== null && data.usageLimit !== ''
      ? Number(data.usageLimit)
      : null,
    status: data.status || 'active'
  });

  // Phase 8 — audit record (best-effort; only after the create succeeded).
  await auditLogService.createAuditLog({
    actor: auditCtx.actor,
    action: 'CREATE',
    module: 'COUPON',
    targetId: coupon._id,
    targetType: 'Coupon',
    description: `Coupon "${coupon.code}" created`,
    newValues: couponAuditSnapshot(coupon),
    ipAddress: auditCtx.ipAddress,
    userAgent: auditCtx.userAgent
  });

  return coupon;
}

/**
 * Admin: update an existing coupon.
 * Fields are updated only when explicitly present in the payload.
 */
async function updateCoupon(id, data, auditCtx = {}) {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found', ['Coupon does not exist']);
  }
  const oldSnapshot = couponAuditSnapshot(coupon);

  if (data.code !== undefined && data.code !== null) {
    const code = normalizeCouponCode(data.code);
    if (!code) {
      throw new ApiError(400, 'Coupon code is required', ['Coupon code is required']);
    }
    if (code !== coupon.code) {
      const existing = await Coupon.findOne({ code, _id: { $ne: id } });
      if (existing) {
        throw new ApiError(409, 'A coupon with this code already exists', ['Duplicate coupon code']);
      }
    }
    coupon.code = code;
  }

  assertValidDates(
    data.startDate !== undefined ? data.startDate : coupon.startDate,
    data.expiryDate !== undefined ? data.expiryDate : coupon.expiryDate
  );

  if (data.discountType !== undefined) coupon.discountType = data.discountType;
  if (data.discountValue !== undefined && data.discountValue !== null) coupon.discountValue = Number(data.discountValue);
  if (data.minimumOrderAmount !== undefined && data.minimumOrderAmount !== null) coupon.minimumOrderAmount = Number(data.minimumOrderAmount);
  if (data.maximumDiscount !== undefined && data.maximumDiscount !== null && data.maximumDiscount !== '') {
    coupon.maximumDiscount = Number(data.maximumDiscount);
  }
  if ((data.maximumDiscount === null || data.maximumDiscount === '') && data.maximumDiscount !== undefined) {
    coupon.maximumDiscount = null;
  }
  if (data.startDate !== undefined) coupon.startDate = data.startDate || null;
  if (data.expiryDate !== undefined) coupon.expiryDate = data.expiryDate || null;
  if (data.usageLimit !== undefined && data.usageLimit !== null && data.usageLimit !== '') {
    coupon.usageLimit = Number(data.usageLimit);
  }
  if ((data.usageLimit === null || data.usageLimit === '') && data.usageLimit !== undefined) {
    coupon.usageLimit = null;
  }
  if (data.status !== undefined) coupon.status = data.status;

  await coupon.save();

  // Phase 8 — audit record for UPDATE (best-effort; only after the update succeeded).
  // Covers regular edits and activate/deactivate (status) toggles alike.
  const newSnapshot = couponAuditSnapshot(coupon);
  if (JSON.stringify({ ...oldSnapshot, id: null }) !== JSON.stringify({ ...newSnapshot, id: null })) {
    const statusChanged = oldSnapshot.status !== newSnapshot.status;
    await auditLogService.createAuditLog({
      actor: auditCtx.actor,
      action: statusChanged ? 'STATUS_CHANGE' : 'UPDATE',
      module: 'COUPON',
      targetId: coupon._id,
      targetType: 'Coupon',
      description: statusChanged
        ? `Coupon "${coupon.code}" ${newSnapshot.status === 'active' ? 'activated' : 'deactivated'}`
        : `Coupon "${coupon.code}" updated`,
      oldValues: oldSnapshot,
      newValues: newSnapshot,
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent
    });
  }

  return coupon;
}

/**
 * Admin: delete a coupon.
 * Safe to hard-delete: historical orders snapshot the coupon code string on the
 * Order document, so deleting a coupon cannot alter past orders.
 */
async function deleteCoupon(id, auditCtx = {}) {
  const coupon = await getCouponById(id);
  const oldSnapshot = couponAuditSnapshot(coupon);
  await Coupon.findByIdAndDelete(id);

  // Phase 8 — audit record for DELETE (best-effort; only after the delete succeeded).
  await auditLogService.createAuditLog({
    actor: auditCtx.actor,
    action: 'DELETE',
    module: 'COUPON',
    targetId: coupon._id,
    targetType: 'Coupon',
    description: `Coupon "${coupon.code}" deleted`,
    oldValues: oldSnapshot,
    ipAddress: auditCtx.ipAddress,
    userAgent: auditCtx.userAgent
  });

  return { deleted: true, message: 'Coupon deleted successfully' };
}

module.exports = {
  normalizeCouponCode,
  calculateCouponDiscount,
  toPublicCoupon,
  validateCoupon,
  incrementCouponUsage,
  listCoupons,
  getCouponById,
  assertValidDates,
  createCoupon,
  updateCoupon,
  deleteCoupon
};