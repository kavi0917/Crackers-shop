/* ============================================================
   VENDHAN CRACKERS — Admin Dashboard Service
   ============================================================ */

const { Order, Product, User, Category } = require('../models');
const ApiError = require('../utils/ApiError');
const { getLowStockThreshold, buildLowStockFilter } = require('../utils/lowStock');

/* ---------- Date Range Helpers ---------- */

/**
 * Parse and validate a date range from query params.
 * Supports: period=today|week|month|year|all, startDate, endDate.
 * Returns { start, end } Date objects or null for no filter.
 */
function parseDateRange(query) {
  const now = new Date();

  // Custom date range
  if (query.startDate || query.endDate) {
    const start = query.startDate ? new Date(query.startDate) : null;
    const end = query.endDate ? new Date(query.endDate) : null;

    if (start && isNaN(start)) throw new ApiError(400, 'Invalid startDate', ['startDate must be a valid date']);
    if (end && isNaN(end)) throw new ApiError(400, 'Invalid endDate', ['endDate must be a valid date']);
    if (start && end && start > end) {
      throw new ApiError(400, 'startDate must be before endDate', ['Invalid date range']);
    }

    // Guard against extremely large queries (max 5 years)
    const startSafe = start || new Date(0);
    const endSafe = end || new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const diffYears = (endSafe - startSafe) / (365.25 * 24 * 60 * 60 * 1000);
    if (diffYears > 5) {
      throw new ApiError(400, 'Date range cannot exceed 5 years', ['Date range too large']);
    }

    return { start: startSafe, end: endSafe };
  }

  // Preset period
  const start = new Date(now);
  const end = new Date(now);
  switch (query.period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_3_months':
      start.setMonth(now.getMonth() - 3);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_6_months':
      start.setMonth(now.getMonth() - 6);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_year':
      start.setFullYear(now.getFullYear() - 1, 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(now.getFullYear() - 1, 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'all':
    default:
      return { start: null, end: null };
  }
  return { start, end };
}

/**
 * Build a match stage for non-cancelled orders within a date range.
 */
function buildOrderMatch(start, end) {
  const match = { status: { $ne: 'cancelled' } };
  if (start && end) {
    match.createdAt = { $gte: start, $lte: end };
  }
  return match;
}

/* ---------- Dashboard Endpoints ---------- */

/**
 * GET /api/admin/dashboard/summary
 * Returns core dashboard statistics.
 */
async function getSummary() {
  // Low-stock alerts use the GLOBAL threshold from Admin → Settings.
  const lowStockThreshold = await getLowStockThreshold();
  const lowStockFilter = buildLowStockFilter(lowStockThreshold);

  const [totalSalesAgg, totalOrders, totalProducts, totalCustomers, pendingOrders, lowStockCount, outOfStockCount, lowStockProducts] =
    await Promise.all([
      // Total sales: sum of order totals for non-cancelled orders
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ]),
      // Total orders (all)
      Order.countDocuments(),
      // Total active products
      Product.countDocuments({ status: 'active' }),
      // Total active customers
      User.countDocuments({ status: 'active' }),
      // Pending orders
      Order.countDocuments({ status: 'pending' }),
      // Low stock count (stock > 0 AND stock <= global lowStockThreshold) — active products only
      Product.countDocuments({ status: 'active', ...lowStockFilter }),
      // Out of stock count — active products only
      Product.countDocuments({ status: 'active', stock: 0 }),
      // Low stock products list (for dashboard display) — active products only
      Product.find({ status: 'active', ...lowStockFilter })
        .select('name stock reorderLevel')
        .sort({ stock: 1 })
        .limit(5)
    ]);

  return {
    totalSales: totalSalesAgg.length ? totalSalesAgg[0].total : 0,
    totalOrders,
    totalProducts,
    totalCustomers,
    pendingOrders,
    lowStockCount,
    outOfStockCount,
    lowStockPreview: lowStockProducts.map((p) => ({
      id: p._id,
      name: p.name,
      stock: p.stock,
      reorderLevel: p.reorderLevel
    }))
  };
}

/**
 * GET /api/admin/dashboard/sales
 * Sales grouped by day, week, month, or year.
 */
async function getSales(query) {
  const { start, end } = parseDateRange(query);
  const match = buildOrderMatch(start, end);

  // Determine grouping
  let groupId;
  let labelFormat;
  if (query.groupBy === 'day') {
    groupId = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day: { $dayOfMonth: '$createdAt' }
    };
  } else if (query.groupBy === 'week') {
    groupId = {
      year: { $year: '$createdAt' },
      week: { $week: '$createdAt' }
    };
  } else if (query.groupBy === 'year') {
    groupId = { year: { $year: '$createdAt' } };
  } else {
    // Default: month
    groupId = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' }
    };
  }

  const rows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: groupId,
        revenue: { $sum: '$pricing.total' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
  ]);

  const sales = rows.map((r) => ({
    period: r._id,
    revenue: r.revenue,
    orderCount: r.orderCount
  }));

  return { sales, period: query.groupBy || 'month', start, end };
}

/**
 * GET /api/admin/dashboard/orders
 * Order counts grouped by status.
 * Optional { start, end } date range filters the counts to that window
 * (existing callers without a range keep the original all-time behaviour).
 */
async function getOrderStats({ start = null, end = null } = {}) {
  const match = {};
  if (start && end) match.createdAt = { $gte: start, $lte: end };

  const rows = await Order.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const statusOrder = ['pending', 'confirmed', 'packed', 'delivered', 'cancelled'];
  const countMap = { pending: 0, confirmed: 0, packed: 0, delivered: 0, cancelled: 0 };
  rows.forEach((r) => {
    if (countMap[r._id] !== undefined) countMap[r._id] = r.count;
  });

  // Canonical: byStatus as an array of { status, count } objects
  const byStatus = statusOrder.map((status) => ({
    status,
    count: countMap[status]
  }));

  // Also include a total
  const total = byStatus.reduce((sum, st) => sum + st.count, 0);

  return { byStatus, total };
}

/**
 * GET /api/admin/dashboard/top-products
 * Best-selling products by actual order data (excludes cancelled).
 */
async function getTopProducts(query) {
  const { start, end } = parseDateRange(query);
  const match = buildOrderMatch(start, end);
  const limit = Math.min(parseInt(query.limit, 10) || 5, 20);

  const rows = await Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        productName: { $first: '$items.productName' },
        quantitySold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' }
      }
    },
    { $sort: { quantitySold: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } }
  ]);

  return rows.map((r) => ({
    productId: r._id,
    productName: r.productName,
    quantitySold: r.quantitySold,
    revenue: r.revenue,
    mainImage: r.product && r.product.images && r.product.images.length > 0 ? r.product.images[0] : null
  }));
}

/**
 * GET /api/admin/dashboard/category-sales
 * Category-wise sales using Mongo aggregation.
 */
async function getCategorySales(query) {
  const { start, end } = parseDateRange(query);
  const match = buildOrderMatch(start, end);

  const rows = await Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'categories',
        localField: 'product.category',
        foreignField: '_id',
        as: 'category'
      }
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$category.name', 'Unknown'] },
        quantitySold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { revenue: -1 } }
  ]);

  return rows.map((r) => ({
    category: r._id,
    quantitySold: r.quantitySold,
    revenue: r.revenue,
    orderCount: r.orderCount
  }));
}

/**
 * GET /api/admin/dashboard/recent-orders
 * Latest orders with a reasonable limit.
 */
async function getRecentOrders(query) {
  const limit = Math.min(parseInt(query.limit, 10) || 5, 20);

  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(limit);

  return orders.map((o) => ({
    id: o._id,
    orderId: o.orderId,
    customer: o.customer,
    itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
    total: o.pricing.total,
    status: o.status,
    paymentStatus: o.payment.status,
    createdAt: o.createdAt
  }));
}

/* ============================================================
   Phase 5 — Consolidated Real-time Dashboard Analytics
   ============================================================ */

// Allowed period presets for the consolidated analytics endpoint.
// 'week' = last 7 days, 'month' = last ~30 days (see parseDateRange).
const ANALYTICS_PERIODS = ['today', 'week', 'month', 'this_year', 'all'];

/**
 * Sales trend (non-cancelled orders only — the existing dashboard sales
 * definition) bucketed by a granularity chosen from the requested range:
 * hourly for a single day, daily for short ranges, monthly otherwise.
 * Uses the STORED order total (pricing.total); pricing is never recomputed.
 */
async function getSalesTrend(start, end) {
  const match = buildOrderMatch(start, end);

  let granularity = 'month';
  if (start && end) {
    const spanDays = Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)));
    if (spanDays <= 1) granularity = 'hour';
    else if (spanDays <= 45) granularity = 'day';
  }

  let groupId;
  if (granularity === 'hour') {
    groupId = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day: { $dayOfMonth: '$createdAt' },
      hour: { $hour: '$createdAt' }
    };
  } else if (granularity === 'day') {
    groupId = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' },
      day: { $dayOfMonth: '$createdAt' }
    };
  } else {
    groupId = {
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' }
    };
  }

  const rows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: groupId,
        revenue: { $sum: '$pricing.total' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
  ]);

  return {
    granularity,
    sales: rows.map((r) => ({ period: r._id, revenue: r.revenue, orderCount: r.orderCount }))
  };
}

/**
 * Active customer breakdown. customerType uses the exact schema values
 * (retail | wholesale). `newCustomers` are active customers who registered
 * within the selected period (User.createdAt) — a documented dashboard
 * convention; customer records are never modified.
 */
async function getCustomerAnalytics(start, end) {
  const rangeMatch = start && end ? { createdAt: { $gte: start, $lte: end } } : {};

  const [result] = await User.aggregate([
    { $match: { status: 'active' } },
    {
      $facet: {
        total: [{ $count: 'count' }],
        retail: [{ $match: { customerType: 'retail' } }, { $count: 'count' }],
        wholesale: [{ $match: { customerType: 'wholesale' } }, { $count: 'count' }],
        newCustomers: [{ $match: rangeMatch }, { $count: 'count' }]
      }
    }
  ]);

  const count = (arr) => (Array.isArray(arr) && arr.length ? arr[0].count : 0);

  return {
    total: count(result && result.total),
    retail: count(result && result.retail),
    wholesale: count(result && result.wholesale),
    newCustomers: count(result && result.newCustomers)
  };
}

/**
 * Retail vs wholesale sales split (non-cancelled orders) using the customer
 * type snapshot stored on each order (pricing.customerType). Legacy orders
 * that predate that snapshot default to the project default: retail.
 * Uses the stored order total — wholesale/retail discounts are NEVER
 * recalculated.
 */
async function getCustomerTypeSales(start, end) {
  const match = buildOrderMatch(start, end);

  const rows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$pricing.customerType',
        sales: { $sum: '$pricing.total' },
        orderCount: { $sum: 1 }
      }
    }
  ]);

  const result = {
    retail: { sales: 0, orderCount: 0 },
    wholesale: { sales: 0, orderCount: 0 }
  };

  rows.forEach((r) => {
    const type = r._id === 'wholesale' ? 'wholesale' : 'retail';
    result[type].sales += r.sales || 0;
    result[type].orderCount += r.orderCount || 0;
  });

  return result;
}

/**
 * GET /api/admin/dashboard/analytics
 * One consolidated payload for the Admin Dashboard so the whole page loads
 * with a single admin-authenticated request. Reuses the existing dashboard
 * queries/aggregations (order match definition, top products, category
 * sales, low-stock threshold + filter, recent orders, order stats).
 */
async function getAnalytics(query) {
  const raw = query && query.period ? String(query.period).trim() : 'all';
  const period = raw || 'all';
  if (!ANALYTICS_PERIODS.includes(period)) {
    throw new ApiError(400, 'Invalid period', [`period must be one of: ${ANALYTICS_PERIODS.join(', ')}`]);
  }

  const { start, end } = parseDateRange({ period });

  const lowStockThreshold = await getLowStockThreshold();
  const lowStockFilter = buildLowStockFilter(lowStockThreshold);

  const [
    salesAgg,
    orderStats,
    bestSellingProducts,
    bestSellingCategories,
    salesTrend,
    customers,
    customerTypeSales,
    totalProducts,
    totalCustomers,
    lowStockCount,
    outOfStockCount,
    lowStockProducts,
    recentOrders
  ] = await Promise.all([
    // Total sales: sum of the STORED order totals for non-cancelled orders.
    Order.aggregate([
      { $match: buildOrderMatch(start, end) },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } }
    ]),
    getOrderStats({ start, end }),
    getTopProducts({ period, limit: 5 }),
    getCategorySales({ period }),
    getSalesTrend(start, end),
    getCustomerAnalytics(start, end),
    getCustomerTypeSales(start, end),
    Product.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'active' }),
    Product.countDocuments({ status: 'active', ...lowStockFilter }),
    Product.countDocuments({ status: 'active', stock: 0 }),
    getLowStock(),
    getRecentOrders({ limit: 5 })
  ]);

  const byStatus = {};
  orderStats.byStatus.forEach((s) => { byStatus[s.status] = s.count; });

  return {
    period: { value: period, start, end },
    summary: {
      totalSales: salesAgg.length ? salesAgg[0].total : 0,
      totalOrders: orderStats.total,
      totalProducts,
      totalCustomers,
      pendingOrders: byStatus.pending || 0,
      deliveredOrders: byStatus.delivered || 0,
      lowStockCount,
      outOfStockCount
    },
    salesTrend,
    orderStatus: orderStats,
    customers,
    customerTypeSales,
    bestSellingProducts,
    bestSellingCategories,
    lowStockProducts,
    recentOrders
  };
}

/**
 * GET /api/admin/dashboard/low-stock
 * Products currently requiring attention (low-stock alerts).
 */
async function getLowStock() {
  // Low-stock alerts use the GLOBAL threshold from Admin → Settings.
  const lowStockThreshold = await getLowStockThreshold();

  // Only active products should appear in low-stock alerts —
  // inactive products are removed from the product catalogue.
  const products = await Product.find({
    status: 'active',
    ...buildLowStockFilter(lowStockThreshold)
  })
    .populate('category', 'name')
    .sort({ stock: 1 })
    .limit(20);

  return products.map((p) => ({
    id: p._id,
    productId: p._id,
    name: p.name,
    category: p.category ? p.category.name : null,
    stock: p.stock,
    reorderLevel: p.reorderLevel,
    status: 'low_stock',
    mainImage: p.images && p.images.length > 0 ? p.images[0] : null
  }));
}

module.exports = {
  parseDateRange,
  buildOrderMatch,
  getSummary,
  getSales,
  getOrderStats,
  getTopProducts,
  getCategorySales,
  getRecentOrders,
  getLowStock,
  getAnalytics,
  getSalesTrend,
  getCustomerAnalytics,
  getCustomerTypeSales
};
