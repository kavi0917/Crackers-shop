/* ============================================================
   VENDHAN CRACKERS — Reseller / Referral / Commission Service (Phase 8)
   ============================================================ */

const { User, Order, Commission } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate');
const { getMembershipTier } = require('../utils/membership');
const { COMPLETED_ORDER_STATUS } = require('../utils/secondOrderDiscount');
const {
  RESELLER_STATUS,
  generateUniqueReferralCode,
  resolveActiveResellerByCode,
  isReseller,
  validateAndApplyReferral,
  getCustomerReferral,
  calculateCommission,
  RESELLER_COMMISSION_PERCENT
} = require('../utils/reseller');

/* ---------- Safe customer shape for admin/reseller views ---------- */
function toSafeResellerView(reseller) {
  return {
    id: reseller._id,
    name: reseller.name,
    email: reseller.email,
    phone: reseller.phone,
    customerType: reseller.customerType || 'retail',
    isReseller: !!reseller.isReseller,
    resellerStatus: reseller.resellerStatus || RESELLER_STATUS.INACTIVE,
    referralCode: reseller.referralCode || null,
    status: reseller.status,
    createdAt: reseller.createdAt,
    updatedAt: reseller.updatedAt
  };
}

function toSafeCustomerView(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    customerType: user.customerType || 'retail',
    isReseller: !!user.isReseller,
    resellerStatus: user.resellerStatus || RESELLER_STATUS.INACTIVE,
    referralCode: user.referralCode || null,
    referredBy: user.referredBy || null,
    referralCodeApplied: user.referralCodeApplied || null,
    status: user.status,
    createdAt: user.createdAt
  };
}

/**
 * Admin: List resellers (users with isReseller === true) with pagination.
 */
async function listResellers(query) {
  const { page, limit, skip } = paginate(query, { defaultLimit: 10, maxLimit: 50 });

  const filter = { role: 'customer', isReseller: true };
  if (query.status) {
    if (!['active', 'inactive'].includes(query.status)) {
      throw new ApiError(400, 'Invalid reseller status filter', ['status must be active or inactive']);
    }
    filter.resellerStatus = query.status;
  }
  if (query.search) {
    const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { referralCode: searchRegex }
    ];
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Aggregate commission totals per reseller
  const resellerIds = users.map((u) => u._id);
  const commissionAgg = await Commission.aggregate([
    { $match: { reseller: { $in: resellerIds } } },
    {
      $group: {
        _id: '$reseller',
        totalEarned: {
          $sum: { $cond: [{ $eq: ['$status', 'earned'] }, '$commissionAmount', 0] }
        },
        totalPending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0] }
        },
        commissionCount: { $sum: 1 }
      }
    }
  ]);
  const commissionMap = {};
  commissionAgg.forEach((c) => {
    commissionMap[c._id.toString()] = {
      totalEarned: Math.round(c.totalEarned * 100) / 100,
      totalPending: Math.round(c.totalPending * 100) / 100,
      commissionCount: c.commissionCount
    };
  });

  // Aggregate referred-customer count per reseller (users with referredBy = reseller)
  const referredAgg = resellerIds.length > 0
    ? await User.aggregate([
        { $match: { referredBy: { $in: resellerIds } } },
        { $group: { _id: '$referredBy', count: { $sum: 1 } } }
      ])
    : [];
  const referredMap = {};
  referredAgg.forEach((row) => {
    referredMap[row._id.toString()] = row.count;
  });

  const resellers = users.map((u) => {
    const idStr = u._id.toString();
    const comm = commissionMap[idStr] || { totalEarned: 0, totalPending: 0, commissionCount: 0 };
    return {
      ...toSafeResellerView(u),
      totalEarnedCommission: comm.totalEarned,
      totalPendingCommission: comm.totalPending,
      commissionCount: comm.commissionCount,
      referredCustomerCount: referredMap[idStr] || 0
    };
  });

  return { resellers, total, page, limit };
}

/* ---------- Admin summary + eligible-customer lookup ---------- */

/**
 * Admin: Reseller summary stats for the management page KPI cards.
 * Computed from live data — never hard-coded.
 */
async function getAdminResellerSummary() {
  const [totalResellers, activeResellers, referredCustomers, commissionAgg] = await Promise.all([
    User.countDocuments({ role: 'customer', isReseller: true }),
    User.countDocuments({ role: 'customer', isReseller: true, resellerStatus: RESELLER_STATUS.ACTIVE }),
    User.countDocuments({ referredBy: { $ne: null } }),
    Commission.aggregate([
      { $match: { status: 'earned' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
    ])
  ]);

  const totalEarnedCommission = commissionAgg.length > 0
    ? Math.round(commissionAgg[0].total * 100) / 100
    : 0;

  return {
    totalResellers,
    activeResellers,
    inactiveResellers: Math.max(totalResellers - activeResellers, 0),
    referredCustomers,
    totalEarnedCommission,
    commissionPercent: RESELLER_COMMISSION_PERCENT
  };
}

/**
 * Admin: List customers eligible for reseller activation.
 * Eligibility matches activateReseller rules:
 *  - role customer
 *  - account status === 'active'
 *  - NOT already a reseller (isReseller !== true)
 * Includes server-side search on name/email/phone.
 */
async function listEligibleCustomers(query) {
  const { page, limit, skip } = paginate(query, { defaultLimit: 20, maxLimit: 50 });

  const filter = { role: 'customer', status: 'active', isReseller: { $ne: true } };
  if (query.search) {
    const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex }
    ];
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { customers: users.map(toSafeCustomerView), total, page, limit };
}

/**
 * Admin: Activate a customer as a reseller.
 * - Generates a unique referral code.
 * - Sets isReseller = true and resellerStatus = active.
 */
async function activateReseller(customerId, adminId) {
  const user = await User.findById(customerId);
  if (!user) {
    throw new ApiError(404, 'Customer not found', ['Customer does not exist']);
  }
  if (user.status !== 'active') {
    throw new ApiError(400, 'Only active customers can be activated as resellers.', ['Customer is inactive']);
  }

  // If already an active reseller, return unchanged
  if (user.isReseller && user.resellerStatus === RESELLER_STATUS.ACTIVE && user.referralCode) {
    return toSafeResellerView(user);
  }

  // Generate a unique referral code (backend-authoritative)
  const referralCode = await generateUniqueReferralCode();

  user.isReseller = true;
  user.resellerStatus = RESELLER_STATUS.ACTIVE;
  user.referralCode = referralCode;
  await user.save();

  // Audit: commission records reference the admin that activated (tracked implicitly via user save)
  return toSafeResellerView(user);
}

/**
 * Admin: Deactivate a reseller.
 * - Existing historical orders and commission records remain unchanged.
 * - Future referral usage is disabled (getActiveCustomerReferral returns false).
 * - Existing referred customers are NOT reassigned.
 */
async function deactivateReseller(customerId) {
  const user = await User.findById(customerId);
  if (!user) {
    throw new ApiError(404, 'Customer not found', ['Customer does not exist']);
  }
  if (!user.isReseller) {
    throw new ApiError(400, 'This customer is not a reseller.', ['Not a reseller']);
  }

  user.resellerStatus = RESELLER_STATUS.INACTIVE;
  await user.save();

  return toSafeResellerView(user);
}

/**
 * Admin: View a single reseller detail (including referral + commission stats).
 */
async function getResellerById(resellerId) {
  const user = await User.findById(resellerId);
  if (!user) {
    throw new ApiError(404, 'Reseller not found', ['Reseller does not exist']);
  }
  if (!user.isReseller) {
    throw new ApiError(400, 'This customer is not a reseller.', ['Not a reseller']);
  }

  const commission = await Commission.aggregate([
    { $match: { reseller: user._id } },
    {
      $group: {
        _id: null,
        totalEarned: {
          $sum: { $cond: [{ $eq: ['$status', 'earned'] }, '$commissionAmount', 0] }
        },
        totalPending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0] }
        },
        commissionCount: { $sum: 1 }
      }
    }
  ]);
  const stats = commission.length > 0
    ? {
        totalEarned: Math.round(commission[0].totalEarned * 100) / 100,
        totalPending: Math.round(commission[0].totalPending * 100) / 100,
        commissionCount: commission[0].commissionCount
      }
    : { totalEarned: 0, totalPending: 0, commissionCount: 0 };

  // Referred customer count (other users with referredBy = this reseller)
  const referredCustomerCount = await User.countDocuments({ referredBy: user._id });

  return {
    ...toSafeResellerView(user),
    referredCustomerCount,
    totalEarnedCommission: stats.totalEarned,
    totalPendingCommission: stats.totalPending,
    commissionCount: stats.commissionCount
  };
}

/**
 * Admin: List commission records with pagination and filters.
 */
async function listCommissions(query) {
  const { page, limit, skip } = paginate(query, { defaultLimit: 10, maxLimit: 50 });

  const filter = {};
  if (query.status) {
    if (!['pending', 'earned', 'cancelled'].includes(query.status)) {
      throw new ApiError(400, 'Invalid commission status filter', ['status must be pending, earned, or cancelled']);
    }
    filter.status = query.status;
  }
  if (query.resellerId) {
    if (!/^[0-9a-fA-F]{24}$/.test(query.resellerId)) {
      throw new ApiError(400, 'Invalid reseller ID', ['Invalid resellerId']);
    }
    filter.reseller = query.resellerId;
  }

  const total = await Commission.countDocuments(filter);
  const commissions = await Commission.find(filter)
    .populate('reseller', 'name email phone referralCode')
    .populate('customer', 'name email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { commissions, total, page, limit };
}

/**
 * Admin: Get a single commission record.
 */
async function getCommissionById(commissionId) {
  const commission = await Commission.findById(commissionId)
    .populate('reseller', 'name email phone referralCode')
    .populate('customer', 'name email phone')
    .populate('order', 'orderId total status');
  if (!commission) {
    throw new ApiError(404, 'Commission not found', ['Commission does not exist']);
  }
  return commission;
}

/**
 * Customer: Apply/Validate a reseller referral code.
 * Reseller resolved from DB via the code (never trust client resellerId).
 */
async function applyReferral(userId, code) {
  const result = await validateAndApplyReferral(userId, code);
  return {
    referralCode: result.referralCode,
    resellerName: result.resellerName,
    referralDiscountPercent: 3
  };
}

/**
 * Customer: Get current referral status (if any).
 */
async function getMyReferral(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found', ['User does not exist']);
  }
  return getCustomerReferral(user);
}

/* ---------- Reseller Dashboard ---------- */

/**
 * Reseller: Get own dashboard summary.
 * - Reseller status, referral code
 * - Referred customers count
 * - Total referred orders
 * - Total earned commission, pending commission, recent commission records
 */
async function getResellerDashboard(userId) {
  const reseller = await User.findById(userId);
  if (!reseller) {
    throw new ApiError(404, 'User not found', ['User does not exist']);
  }
  if (!reseller.isReseller) {
    throw new ApiError(403, 'You are not a reseller.', ['Not a reseller']);
  }

  // Referred customers (all, regardless of reseller status — customers stay bound)
  const referredCustomers = await User.find({ referredBy: reseller._id }).select('name email phone createdAt');

  // Referred orders: orders placed by referred customers that carry a referral snapshot
  const referredCustomerIds = referredCustomers.map((c) => c._id);
  const referredOrderAgg = referredCustomerIds.length > 0
    ? await Order.find({
        user: { $in: referredCustomerIds },
        'pricing.referredByReseller': reseller._id
      }).select('orderId total status createdAt')
    : [];

  const totalReferredOrders = referredOrderAgg.length;

  // Commission records for this reseller
  const commissions = await Commission.find({ reseller: reseller._id })
    .populate('customer', 'name email phone')
    .sort({ createdAt: -1 })
    .limit(20);

  const commissionAgg = await Commission.aggregate([
    { $match: { reseller: reseller._id } },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$commissionAmount' }
      }
    }
  ]);
  const totals = { earned: 0, pending: 0, cancelled: 0 };
  commissionAgg.forEach((c) => {
    totals[c._id] = Math.round(c.total * 100) / 100;
  });

  // Referred order summary (only delivered orders count toward earned)
  const earnedOrdersCount = referredOrderAgg.filter((o) => o.status === COMPLETED_ORDER_STATUS).length;

  return {
    reseller: toSafeResellerView(reseller),
    referralCode: reseller.referralCode,
    resellerStatus: reseller.resellerStatus,
    referredCustomerCount: referredCustomers.length,
    referredCustomers: referredCustomers.map((c) => ({
      id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      since: c.createdAt
    })),
    totalReferredOrders,
    earnedOrdersCount,
    totalEarnedCommission: totals.earned,
    totalPendingCommission: totals.pending,
    totalCancelledCommission: totals.cancelled,
    recentCommissions: commissions.map((c) => ({
      id: c._id,
      orderId: c.orderId,
      customerName: c.customer ? c.customer.name : 'Unknown',
      commissionPercent: c.commissionPercent,
      commissionBaseAmount: c.commissionBaseAmount,
      commissionAmount: c.commissionAmount,
      status: c.status,
      createdAt: c.createdAt
    }))
  };
}

/**
 * Reseller: List own commission records with pagination.
 */
async function listResellerCommissions(userId, query) {
  const { page, limit, skip } = paginate(query, { defaultLimit: 10, maxLimit: 50 });

  const filter = { reseller: userId };
  if (query.status) {
    if (!['pending', 'earned', 'cancelled'].includes(query.status)) {
      throw new ApiError(400, 'Invalid commission status filter', ['status must be pending, earned, or cancelled']);
    }
    filter.status = query.status;
  }

  const total = await Commission.countDocuments(filter);
  const commissions = await Commission.find(filter)
    .populate('customer', 'name email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { commissions, total, page, limit };
}

/* ---------- Commission lifecycle (used by admin order status updates) ---------- */

/**
 * Create / update a commission record for an order based on its status.
 *
 * Rules:
 *  - Commission is only created when the referring customer's order reaches `delivered`.
 *  - Only eligible referred RETAIL orders generate a commission (referral snapshot present).
 *  - One eligible order generates at most ONE commission (unique order field).
 *  - Cancelled orders never create a commission; if a previously earned commission
 *    needs reversal, its status is set to `cancelled` (historical amounts unchanged).
 *
 * @param {string} orderId - Order ObjectId
 * @param {string} newStatus - New order status
 * @param {Object} [sessionOpt={}] - Transaction session
 */
async function handleCommissionForOrderStatus(orderId, newStatus, sessionOpt = {}) {
  const order = await Order.findById(orderId, null, sessionOpt);
  if (!order) return;

  // Authoritative referral snapshot from the order
  const referralSnapshot = order.pricing && order.pricing.referralCode && order.pricing.referredByReseller
    ? {
        referralCode: order.pricing.referralCode,
        referredByReseller: order.pricing.referredByReseller
      }
    : null;

  // Find existing commission for this order (dedupe)
  const existing = await Commission.findOne({ order: order._id }, null, sessionOpt);

  if (newStatus === 'delivered') {
    // Only create commission if this order has a valid referral snapshot
    if (!referralSnapshot) {
      // If existing commission exists but referral is somehow gone, do not create a new one.
      return;
    }

    // Final paid product amount = sum of order item subtotals (after all product discounts)
    const finalProductAmount = Math.round(
      order.items.reduce((sum, item) => sum + (item.subtotal || 0), 0) * 100
    ) / 100;
    const commissionCalc = calculateCommission(finalProductAmount);

    if (existing) {
      // Idempotent — never duplicate; do not recalculate history if already earned
      return;
    }

    await Commission.create(
      [
        {
          reseller: referralSnapshot.referredByReseller,
          customer: order.user,
          order: order._id,
          orderId: order.orderId,
          referralCode: referralSnapshot.referralCode,
          commissionPercent: commissionCalc.commissionPercent,
          commissionBaseAmount: commissionCalc.commissionBaseAmount,
          commissionAmount: commissionCalc.commissionAmount,
          status: 'earned',
          referralDiscountPercent: order.pricing.referralDiscountPercent || 0,
          referralDiscountAmount: order.pricing.referralDiscountAmount || 0
        }
      ],
      sessionOpt
    );
    return;
  }

  // Cancelled order: if a commission exists, mark it cancelled (historical amount unchanged).
  if (newStatus === 'cancelled' && existing && existing.status === 'earned') {
    existing.status = 'cancelled';
    await existing.save(sessionOpt);
  }
}

module.exports = {
  listResellers,
  activateReseller,
  deactivateReseller,
  getResellerById,
  getAdminResellerSummary,
  listEligibleCustomers,
  listCommissions,
  getCommissionById,
  applyReferral,
  getMyReferral,
  getResellerDashboard,
  listResellerCommissions,
  handleCommissionForOrderStatus,
  RESELLER_COMMISSION_PERCENT
};