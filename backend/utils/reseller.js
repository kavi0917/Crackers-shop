/* ============================================================
   VENDHAN CRACKERS — Reseller & Referral Helper (Phase 8)
   ============================================================ */

const { User } = require('../models');
const ApiError = require('./ApiError');

/* ---------- Centralized Constants ---------- */
const REFERRAL_DISCOUNT_PERCENT = 3;
const RESELLER_COMMISSION_PERCENT = 5;

/* ---------- Reseller Status ---------- */
const RESELLER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

/**
 * Generate a unique referral code for a reseller.
 * Format: RES###### (e.g., RES001234). Backend-generated only.
 *
 * @returns {string}
 */
function generateReferralCode() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `RES${rand}`;
}

/**
 * Resolve a referral code to an ACTIVE reseller.
 * The backend resolves: referralCode -> reseller -> active reseller verification.
 *
 * @param {string} code - Referral code (case-insensitive on lookup)
 * @returns {Promise<Object|null>} - The active reseller User doc, or null
 */
async function resolveActiveResellerByCode(code) {
  if (!code || typeof code !== 'string') return null;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const reseller = await User.findOne({
    referralCode: normalized,
    isReseller: true,
    resellerStatus: RESELLER_STATUS.ACTIVE,
    status: 'active'
  });

  return reseller || null;
}

/**
 * Generate a unique referral code that does not collide with existing ones.
 *
 * @returns {Promise<string>}
 */
async function generateUniqueReferralCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateReferralCode();
    const exists = await User.findOne({ referralCode: code });
    if (!exists) return code;
  }
  throw new ApiError(500, 'Unable to generate a unique referral code. Please try again.', ['Referral code generation failed']);
}

/**
 * Determine whether a user is an active reseller.
 *
 * @param {Object} user - User document (or plain object with fields)
 * @returns {boolean}
 */
function isActiveReseller(user) {
  return !!(
    user &&
    user.isReseller === true &&
    user.resellerStatus === RESELLER_STATUS.ACTIVE &&
    user.status === 'active'
  );
}

/**
 * Determine whether a user is a reseller (regardless of active status).
 *
 * @param {Object} user - User document
 * @returns {boolean}
 */
function isReseller(user) {
  return !!(user && user.isReseller === true);
}

/**
 * Calculate the referral discount amount.
 *
 * Discount is 3% of the amount AFTER category discount + loyalty discount,
 * i.e. the "pre-referral product amount".
 *
 * @param {number} preReferralAmount - Amount after category + loyalty discounts
 * @returns {{ referralDiscountPercent: number, referralDiscountAmount: number }}
 */
function calculateReferralDiscount(preReferralAmount) {
  const amount = Number(preReferralAmount) || 0;
  const referralDiscountAmount = Math.round((amount * REFERRAL_DISCOUNT_PERCENT) / 100 * 100) / 100;
  return {
    referralDiscountPercent: REFERRAL_DISCOUNT_PERCENT,
    referralDiscountAmount
  };
}

/**
 * Calculate the reseller commission.
 *
 * commissionBaseAmount = FINAL PAID PRODUCT AMOUNT (after all product discounts,
 * including category, loyalty, and referral). Delivery, GST, etc. are excluded.
 *
 * @param {number} finalProductAmount - Final paid product amount
 * @returns {{ commissionPercent: number, commissionBaseAmount: number, commissionAmount: number }}
 */
function calculateCommission(finalProductAmount) {
  const base = Math.round((Number(finalProductAmount) || 0) * 100) / 100;
  const commissionAmount = Math.round((base * RESELLER_COMMISSION_PERCENT) / 100 * 100) / 100;
  return {
    commissionPercent: RESELLER_COMMISSION_PERCENT,
    commissionBaseAmount: base,
    commissionAmount
  };
}

/**
 * Validate and apply a reseller referral code to a retail customer.
 *
 * Security rules enforced here (backend-authoritative):
 *  - Only RETAIL customers may be referred.
 *  - A reseller cannot refer themselves.
 *  - A customer already referred cannot be switched (without admin).
 *  - Invalid / inactive reseller codes are rejected.
 *  - referralCode is resolved FROM the database, never trusted from client.
 *
 * @param {string} userId - Authenticated customer ObjectId
 * @param {string} code - Referral code submitted by the customer
 * @param {Object} [sessionOpt={}] - Optional mongoose transaction session
 * @returns {Promise<{ user: Object, referralCode: string, resellerName: string }>}
 */
async function validateAndApplyReferral(userId, code, sessionOpt = {}) {
  if (!code || typeof code !== 'string') {
    throw new ApiError(400, 'Referral code is required', ['Referral code is required']);
  }

  const user = await User.findById(userId, null, sessionOpt);
  if (!user) {
    throw new ApiError(404, 'User not found', ['User does not exist']);
  }

  if (user.status !== 'active') {
    throw new ApiError(403, 'Your account is inactive. Please contact support.', ['Account is inactive']);
  }

  // Only retail customers may use a reseller referral.
  if (user.customerType !== 'retail') {
    throw new ApiError(400, 'Reseller referral discounts are only available to retail customers.', ['Wholesale customers cannot use referral codes']);
  }

  // Resellers cannot refer themselves.
  if (isReseller(user)) {
    throw new ApiError(400, 'Resellers cannot apply their own or any reseller referral code.', ['Reseller cannot use referral code']);
  }

  // Stable binding — a customer can be referred by exactly one reseller.
  if (user.referredBy) {
    throw new ApiError(409, 'You have already been referred by a reseller and the referral cannot be changed.', ['Referral already exists']);
  }

  const reseller = await resolveActiveResellerByCode(code);
  if (!reseller) {
    throw new ApiError(400, 'Invalid or inactive reseller referral code.', ['Invalid referral code']);
  }

  // Self-referral protection (reseller cannot refer themselves).
  if (reseller._id.toString() === userId.toString()) {
    throw new ApiError(400, 'You cannot use your own referral code.', ['Self-referral not allowed']);
  }

  // Bind the referral (stable).
  user.referredBy = reseller._id;
  user.referralCodeApplied = reseller.referralCode;
  await user.save(sessionOpt);

  return {
    user,
    referralCode: reseller.referralCode,
    resellerName: reseller.name
  };
}

/**
 * Load the referral information for a logged-in customer.
 * Returns null if no referral exists.
 *
 * @param {Object} user - Authenticated user document
 * @returns {Promise<Object|null>}
 */
async function getCustomerReferral(user) {
  if (!user || !user.referredBy) return null;

  const reseller = await User.findById(user.referredBy);
  if (!reseller) return null;

  return {
    referralCode: reseller.referralCode,
    resellerName: reseller.name,
    referralDiscountPercent: REFERRAL_DISCOUNT_PERCENT
  };
}

/**
 * Determine whether a customer currently has an ACTIVE referral relationship.
 *
 * Referral pricing/commission eligibility requires:
 *  - The customer has been referred (referredBy set)
 *  - The referring reseller is still an ACTIVE reseller
 *
 * If the reseller is deactivated, future referral usage is disabled.
 *
 * @param {Object} user - Customer User document
 * @param {Object} [sessionOpt={}] - Optional mongoose transaction session
 * @returns {Promise<{ eligible: boolean, resellerId: Object|null, referralCode: string|null }>}
 */
async function getActiveCustomerReferral(user, sessionOpt = {}) {
  if (!user || !user.referredBy) {
    return { eligible: false, resellerId: null, referralCode: null };
  }

  const reseller = await User.findById(user.referredBy, null, sessionOpt);
  if (!reseller || !isActiveReseller(reseller)) {
    return { eligible: false, resellerId: null, referralCode: null };
  }

  return {
    eligible: true,
    resellerId: reseller._id,
    referralCode: reseller.referralCode || user.referralCodeApplied
  };
}

module.exports = {
  REFERRAL_DISCOUNT_PERCENT,
  RESELLER_COMMISSION_PERCENT,
  RESELLER_STATUS,
  generateReferralCode,
  generateUniqueReferralCode,
  resolveActiveResellerByCode,
  isActiveReseller,
  isReseller,
  calculateReferralDiscount,
  calculateCommission,
  validateAndApplyReferral,
  getCustomerReferral,
  getActiveCustomerReferral
};