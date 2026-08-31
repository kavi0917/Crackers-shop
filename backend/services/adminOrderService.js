/* ============================================================
   VENDHAN CRACKERS — Admin Order Service
   ============================================================ */

const { Order, Product, InventoryTransaction } = require('../models');
const ApiError = require('../utils/ApiError');
const { canTransition } = require('./checkoutService');
const { withTransaction } = require('../utils/withTransaction');
const { handleCommissionForOrderStatus } = require('./resellerService');

/**
 * List all orders with filters, search, and pagination.
 */
async function listOrders(query, { page, limit, skip }) {
  const filter = {};

  // Status filter
  if (query.status) {
    const validStatuses = ['pending', 'confirmed', 'packed', 'delivered', 'cancelled'];
    if (!validStatuses.includes(query.status)) {
      throw new ApiError(400, 'Invalid status filter', ['status must be one of: pending, confirmed, packed, delivered, cancelled']);
    }
    filter.status = query.status;
  }

  // Search by orderId, customer name, phone, email
  if (query.q) {
    const searchRegex = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { orderId: searchRegex },
      { 'customer.name': searchRegex },
      { 'customer.phone': searchRegex },
      { 'customer.email': searchRegex }
    ];
  }

  // Date range filter
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      if (isNaN(start)) throw new ApiError(400, 'Invalid startDate', ['startDate must be a valid date']);
      filter.createdAt.$gte = start;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      if (isNaN(end)) throw new ApiError(400, 'Invalid endDate', ['endDate must be a valid date']);
      filter.createdAt.$lte = end;
    }
  }

  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const mapped = orders.map((o) => ({
    id: o._id,
    orderId: o.orderId,
    customer: o.customer,
    itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
    total: o.pricing.total,
    status: o.status,
    paymentStatus: o.payment.status,
    paymentMethod: o.payment.method,
    createdAt: o.createdAt
  }));

  return { orders: mapped, total };
}

/**
 * Get a single order by ID (admin).
 */
async function getOrderById(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found', ['Order does not exist']);
  }
  return order;
}

/**
 * Update an order's status with transition validation.
 * When cancelling, restores stock exactly once.
 */
async function updateOrderStatus(orderId, newStatus, adminId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found', ['Order does not exist']);
  }

  // No-op if same status
  if (order.status === newStatus) {
    return order;
  }

  // Validate transition
  if (!canTransition(order.status, newStatus)) {
    throw new ApiError(400, `Cannot change order status from '${order.status}' to '${newStatus}'`, ['Invalid status transition']);
  }

  return withTransaction(async (session) => {
    const sessionOpt = session ? { session } : {};

    // Re-fetch order within transaction
    const lockedOrder = await Order.findById(orderId, null, sessionOpt);
    if (!lockedOrder) {
      throw new ApiError(404, 'Order not found', ['Order does not exist']);
    }
    if (lockedOrder.status === newStatus) {
      return lockedOrder;
    }
    if (!canTransition(lockedOrder.status, newStatus)) {
      throw new ApiError(400, `Cannot change order status from '${lockedOrder.status}' to '${newStatus}'`, ['Invalid status transition']);
    }

    // If cancelling, restore stock exactly once
    if (newStatus === 'cancelled' && lockedOrder.status !== 'cancelled') {
      for (const item of lockedOrder.items) {
        const product = await Product.findById(item.product, null, sessionOpt);
        if (product) {
          const previousStock = product.stock;
          const newStock = previousStock + item.quantity;

          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity } },
            { new: true, ...sessionOpt }
          );

          await InventoryTransaction.create(
            [
              {
                product: item.product,
                previousStock,
                newStock,
                changeAmount: item.quantity,
                reason: 'ORDER_CANCELLED',
                referenceOrder: lockedOrder._id,
                changedBy: adminId,
                changedByModel: 'Admin',
                note: `Order ${lockedOrder.orderId} cancelled by admin`
              }
            ],
            sessionOpt
          );
        }
      }
    }

    // Update status and history
    lockedOrder.status = newStatus;
    lockedOrder.statusHistory.push({
      status: newStatus,
      changedAt: new Date(),
      note: newStatus === 'cancelled' ? 'Cancelled by admin' : null
    });
    await lockedOrder.save(sessionOpt);

    // Phase 8: Create/cancel reseller commission based on the order status.
    // Only `delivered` creates an earned commission; `cancelled` reverses any
    // previously earned commission (without altering historical amounts).
    await handleCommissionForOrderStatus(lockedOrder._id, newStatus, sessionOpt);

    return lockedOrder;
  });
}

module.exports = {
  listOrders,
  getOrderById,
  updateOrderStatus
};