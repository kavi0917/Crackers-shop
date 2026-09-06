/* ============================================================
   VENDHAN CRACKERS — Admin Customer Management Service
   ============================================================ */

const { User, Order } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate');
const { getMembershipTier } = require('../utils/membership');
const { COMPLETED_ORDER_STATUS } = require('../utils/secondOrderDiscount');
const auditLogService = require('./auditLogService');

/**
 * Build a safe customer response object.
 * Never exposes password or sensitive authentication fields.
 */
function toSafeCustomer(user, orderStats = {}) {
  const completedOrders = orderStats.completedOrders || 0;
  const { tier, discountPercent } = getMembershipTier(completedOrders);

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    customerType: user.customerType || 'retail',
    status: user.status,
    isReseller: !!user.isReseller,
    resellerStatus: user.resellerStatus || 'inactive',
    referralCode: user.referralCode || null,
    referredBy: user.referredBy || null,
    referralCodeApplied: user.referralCodeApplied || null,
    address: user.address,
    city: user.city,
    state: user.state,
    pincode: user.pincode,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    orderCount: orderStats.orderCount || 0,
    totalSpent: orderStats.totalSpent || 0,
    completedOrders,
    membershipTier: tier,
    membershipDiscountPercent: discountPercent
  };
}

/**
 * Admin: List customers with search, status filter, sorting, and pagination.
 */
async function listCustomers(query) {
  const { page, limit, skip } = paginate(query, { defaultLimit: 10, maxLimit: 50 });

  const filter = { role: 'customer' };
  if (query.search) {
    const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex }
    ];
  }
  if (query.status) {
    if (!['active', 'inactive'].includes(query.status)) {
      throw new ApiError(400, 'Invalid status filter', ['status must be active or inactive']);
    }
    filter.status = query.status;
  }
  if (query.customerType) {
    if (!['retail', 'wholesale'].includes(query.customerType)) {
      throw new ApiError(400, 'Invalid customer type filter', ['customerType must be retail or wholesale']);
    }
    filter.customerType = query.customerType;
  }

  // Allowed sort fields to prevent injection
  const allowedSorts = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    name_asc: { name: 1 },
    name_desc: { name: -1 },
    email_asc: { email: 1 },
    email_desc: { email: -1 }
  };
  const sort = allowedSorts[query.sort] || allowedSorts.newest;

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  // Aggregate non-cancelled order stats for all customers in one query
  const userIds = users.map((u) => u._id);
  const orderStatsAgg = await Order.aggregate([
    { $match: { user: { $in: userIds }, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: '$user',
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$pricing.total' }
      }
    }
  ]);
  const statsMap = {};
  orderStatsAgg.forEach((s) => {
    statsMap[s._id.toString()] = { orderCount: s.orderCount, totalSpent: Math.round(s.totalSpent * 100) / 100 };
  });

  // Aggregate completed (delivered) order count per customer for membership
  const completedAgg = await Order.aggregate([
    { $match: { user: { $in: userIds }, status: COMPLETED_ORDER_STATUS } },
    {
      $group: {
        _id: '$user',
        completedOrders: { $sum: 1 }
      }
    }
  ]);
  const completedMap = {};
  completedAgg.forEach((s) => {
    completedMap[s._id.toString()] = s.completedOrders;
  });

  const mapped = users.map((u) => {
    const idStr = u._id.toString();
    const stats = statsMap[idStr] || { orderCount: 0, totalSpent: 0 };
    return toSafeCustomer(u, {
      ...stats,
      completedOrders: completedMap[idStr] || 0
    });
  });

  return { customers: mapped, total, page, limit };
}

/**
 * Admin: Get a single customer by id with order stats.
 */
async function getCustomerById(customerId) {
  const user = await User.findById(customerId);
  if (!user) {
    throw new ApiError(404, 'Customer not found', ['Customer does not exist']);
  }

  const orderStats = await Order.aggregate([
    { $match: { user: user._id, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: null,
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$pricing.total' }
      }
    }
  ]);
  const stats = orderStats.length > 0
    ? { orderCount: orderStats[0].orderCount, totalSpent: Math.round(orderStats[0].totalSpent * 100) / 100 }
    : { orderCount: 0, totalSpent: 0 };

  const completedOrders = await Order.countDocuments({
    user: user._id,
    status: COMPLETED_ORDER_STATUS
  });

  return toSafeCustomer(user, { ...stats, completedOrders });
}

/**
 * Admin: List a customer's orders with pagination.
 */
async function listCustomerOrders(customerId, query) {
  // Verify customer exists
  const user = await User.findById(customerId);
  if (!user) {
    throw new ApiError(404, 'Customer not found', ['Customer does not exist']);
  }

  const { page, limit, skip } = paginate(query, { defaultLimit: 10, maxLimit: 50 });

  const filter = { user: customerId };
  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const mapped = orders.map((o) => ({
    id: o._id,
    orderId: o.orderId,
    createdAt: o.createdAt,
    itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
    total: o.pricing.total,
    status: o.status,
    paymentStatus: o.payment.status
  }));

  return { orders: mapped, total, page, limit };
}

/**
 * Admin: Update a customer's account status (active/inactive).
 */
async function updateCustomerStatus(customerId, status, auditCtx = {}) {
  if (!['active', 'inactive'].includes(status)) {
    throw new ApiError(400, 'Invalid status', ['status must be active or inactive']);
  }

  const user = await User.findById(customerId);
  if (!user) {
    throw new ApiError(404, 'Customer not found', ['Customer does not exist']);
  }

  const oldStatus = user.status;
  user.status = status;
  await user.save();

  // Phase 8 — audit record (best-effort; only after the update succeeded).
  await auditLogService.createAuditLog({
    actor: auditCtx.actor,
    action: 'STATUS_CHANGE',
    module: 'CUSTOMER',
    targetId: user._id,
    targetType: 'User',
    description: `Customer "${user.name}" ${status === 'active' ? 'activated' : 'deactivated'}`,
    oldValues: { status: oldStatus },
    newValues: { status: user.status },
    ipAddress: auditCtx.ipAddress,
    userAgent: auditCtx.userAgent
  });

  return toSafeCustomer(user);
}

/**
 * Admin: Update a customer's customer type (retail/wholesale).
 * This does NOT modify historical orders — they remain immutable pricing snapshots.
 */
async function updateCustomerType(customerId, customerType, auditCtx = {}) {
  if (!['retail', 'wholesale'].includes(customerType)) {
    throw new ApiError(400, 'Invalid customer type', ['customerType must be retail or wholesale']);
  }

  const user = await User.findById(customerId);
  if (!user) {
    throw new ApiError(404, 'Customer not found', ['Customer does not exist']);
  }

  const oldType = user.customerType || 'retail';
  user.customerType = customerType;
  await user.save();

  // Phase 8 — audit record (best-effort; only after the update succeeded).
  await auditLogService.createAuditLog({
    actor: auditCtx.actor,
    action: 'UPDATE',
    module: 'CUSTOMER',
    targetId: user._id,
    targetType: 'User',
    description: `Customer "${user.name}" type changed from ${oldType} to ${customerType}`,
    oldValues: { customerType: oldType },
    newValues: { customerType: user.customerType },
    ipAddress: auditCtx.ipAddress,
    userAgent: auditCtx.userAgent
  });

  return toSafeCustomer(user);
}

module.exports = {
  listCustomers,
  getCustomerById,
  listCustomerOrders,
  updateCustomerStatus,
  updateCustomerType
};
