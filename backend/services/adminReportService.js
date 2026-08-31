/* ============================================================
   VENDHAN CRACKERS — Admin Report Service (Phase 9)
   Sales Analytics & Reporting System
   ============================================================ */

const { Order, Product, Category, Commission, User } = require('../models');
const ApiError = require('../utils/ApiError');

/* ---------- Constants ---------- */
const COMPLETED_STATUS = 'delivered';
const VALID_STATUSES = ['pending', 'confirmed', 'packed', 'delivered', 'cancelled'];
const VALID_CUSTOMER_TYPES = ['retail', 'wholesale'];

/* ---------- Date Range Helpers (Phase 9 enhanced) ---------- */

/**
 * Parse and validate report query parameters.
 * Supports: period, from, to, year, category, customerType.
 * Returns { start, end, year, category, customerType }.
 *
 * The optional `year` filter is intersected into the returned start/end
 * range so it affects EVERY report section (KPIs, monthly chart, category,
 * retail/wholesale, top products, order status, discount analysis and
 * reseller report) — not just the monthly chart.
 */
function parseReportQuery(query) {
  const now = new Date();

  // Validate year if provided (must be a 4-digit year)
  let year = null;
  if (query.year !== undefined && query.year !== '') {
    if (!/^\d{4}$/.test(String(query.year))) {
      throw new ApiError(400, 'Invalid year', ['year must be a 4-digit year']);
    }
    year = parseInt(query.year, 10);
  }

  /**
   * Intersect a date range with the selected year.
   * When no range is present, defaults to the full selected year.
   */
  const applyYear = (start, end) => {
    if (!year) return { start, end };
    const yStart = new Date(year, 0, 1);
    const yEnd = new Date(year, 11, 31, 23, 59, 59, 999);
    let s = start || yStart;
    let e = end || yEnd;
    if (s < yStart) s = yStart;
    if (e > yEnd) e = yEnd;
    return { start: s, end: e };
  };

  // Custom date range (from/to)
  if (query.from || query.to) {
    const start = query.from ? new Date(query.from) : null;
    const end = query.to ? new Date(query.to) : null;

    if (start && isNaN(start)) throw new ApiError(400, 'Invalid from date', ['from must be a valid date']);
    if (end && isNaN(end)) throw new ApiError(400, 'Invalid to date', ['to must be a valid date']);
    if (start && end && start > end) {
      throw new ApiError(400, 'from must be before to', ['Invalid date range']);
    }

    // Guard against future dates (allow up to end of today)
    const endSafe = end || new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (endSafe > new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59, 999)) {
      throw new ApiError(400, 'to date cannot be more than 1 year in the future', ['Future date too far']);
    }

    // Guard against extremely large queries (max 5 years)
    const startSafe = start || new Date(0);
    const diffYears = (endSafe - startSafe) / (365.25 * 24 * 60 * 60 * 1000);
    if (diffYears > 5) {
      throw new ApiError(400, 'Date range cannot exceed 5 years', ['Date range too large']);
    }

    const ranged = applyYear(startSafe, endSafe);
    return {
      start: ranged.start,
      end: ranged.end,
      year,
      category: query.category || null,
      customerType: query.customerType || null
    };
  }

  // Preset period
  const start = new Date(now);
  const end = new Date(now);
  const normalized = String(query.period || 'this_month');
  switch (normalized) {
    case 'this_month':
    case 'thisMonth':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_month':
    case 'lastMonth':
      start.setMonth(now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_3_months':
    case 'last3Months':
      start.setMonth(now.getMonth() - 3);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_6_months':
    case 'last6Months':
      start.setMonth(now.getMonth() - 6);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_year':
    case 'thisYear':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_year':
    case 'lastYear':
      start.setFullYear(now.getFullYear() - 1, 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(now.getFullYear() - 1, 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    case 'all':
    default:
      if (year) {
        return {
          start: new Date(year, 0, 1),
          end: new Date(year, 11, 31, 23, 59, 59, 999),
          year,
          category: query.category || null,
          customerType: query.customerType || null
        };
      }
      return {
        start: null,
        end: null,
        year,
        category: query.category || null,
        customerType: query.customerType || null
      };
  }
  const ranged = applyYear(start, end);
  return {
    start: ranged.start,
    end: ranged.end,
    year,
    category: query.category || null,
    customerType: query.customerType || null
  };
}

/**
 * Normalize and validate the optional order status filter.
 * Translates "All Statuses" (empty / 'all') into null (no restriction).
 * Any other value must be one of the existing valid order statuses.
 */
function normalizeReportStatus(rawStatus) {
  if (rawStatus === undefined || rawStatus === null) return null;
  const val = String(rawStatus).trim();
  if (val === '' || val.toLowerCase() === 'all') return null;
  const status = val.toLowerCase();
  if (!VALID_STATUSES.includes(status)) {
    throw new ApiError(400, 'Invalid status', [`status must be one of: ${VALID_STATUSES.join(', ')}`]);
  }
  return status;
}

/**
 * Build a match stage for delivered orders within a date range.
 * Optionally filters by customerType.
 *
 * `status` semantics:
 *  - 'all'  → no status restriction (All Statuses).
 *  - any valid status → filter to that status only.
 *  - null/undefined → default to delivered (preserves existing behaviour for
 *    the products/categories report endpoints).
 */
function buildDeliveredMatch(start, end, customerType = null, status = null) {
  const match = {};
  if (status && status !== 'all') {
    match.status = status;
  } else if (status !== 'all') {
    // No status provided → default to delivered (existing behaviour).
    match.status = COMPLETED_STATUS;
  }
  // When status === 'all' → no status restriction (All Statuses).
  if (start && end) {
    match.createdAt = { $gte: start, $lte: end };
  }
  if (customerType) {
    match['pricing.customerType'] = customerType;
  }
  return match;
}

/**
 * Build a match stage for all orders (any status) within a date range.
 * When a specific `status` is supplied (and not 'all'), only that status is
 * kept; otherwise every valid status is included.
 */
function buildAllStatusMatch(start, end, customerType = null, status = null) {
  const match = {};
  if (status && status !== 'all') {
    match.status = status;
  }
  if (start && end) {
    match.createdAt = { $gte: start, $lte: end };
  }
  if (customerType) {
    match['pricing.customerType'] = customerType;
  }
  return match;
}

/* ---------- KPI Summary ---------- */

/**
 * Calculate summary KPI cards from delivered orders.
 * Uses stored pricing snapshots — never recalculates.
 */
async function getSummaryKPIs(start, end, customerType = null, category = null, status = null) {
  const match = buildDeliveredMatch(start, end, customerType, status || 'all');

  // If category filter is present, restrict to products in that category
  if (category) {
    const products = await Product.find({ category }).select('_id');
    const productIds = products.map((p) => p._id);
    if (productIds.length === 0) {
      return { totalSales: 0, totalOrders: 0, productsSold: 0, averageOrderValue: 0, totalDiscounts: 0, netSales: 0 };
    }
    match['items.product'] = { $in: productIds };
  }

  const [summary] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.total' },
        totalDiscounts: { $sum: '$pricing.discount' },
        productsSold: { $sum: { $sum: '$items.quantity' } },
        netSales: { $sum: { $subtract: ['$pricing.total', '$pricing.gst'] } }
      }
    }
  ]);

  if (!summary) {
    return { totalSales: 0, totalOrders: 0, productsSold: 0, averageOrderValue: 0, totalDiscounts: 0, netSales: 0 };
  }

  const totalSales = Math.round(summary.totalRevenue * 100) / 100;
  const totalOrders = summary.totalOrders;
  const productsSold = summary.productsSold || 0;
  const totalDiscounts = Math.round(summary.totalDiscounts * 100) / 100;
  const netSales = Math.round(summary.netSales * 100) / 100;
  const averageOrderValue = totalOrders > 0 ? Math.round((totalSales / totalOrders) * 100) / 100 : 0;

  return { totalSales, totalOrders, productsSold, averageOrderValue, totalDiscounts, netSales };
}

/* ---------- Monthly Sales Chart ---------- */

/**
 * Monthly completed sales/revenue for the chart.
 * Uses delivered orders only.
 * The year filter is already intersected into start/end by parseReportQuery,
 * so this function does NOT re-apply a separate year override (doing so
 * would widen period+year queries back to the full year).
 */
async function getMonthlySales(start, end, customerType = null, category = null, status = null) {
  const match = buildDeliveredMatch(start, end, customerType, status || 'all');

  if (category) {
    const products = await Product.find({ category }).select('_id');
    const productIds = products.map((p) => p._id);
    if (productIds.length === 0) return [];
    match['items.product'] = { $in: productIds };
  }

  const rows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        revenue: { $sum: '$pricing.total' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  return rows.map((r) => ({
    year: r._id.year,
    month: r._id.month,
    revenue: Math.round(r.revenue * 100) / 100,
    orderCount: r.orderCount
  }));
}

/* ---------- Sales by Category ---------- */

/**
 * Category-wise sales aggregation.
 * Uses historical order item snapshots and product-category lookup.
 */
async function getCategorySales(start, end, customerType = null, category = null, status = null) {
  const match = buildDeliveredMatch(start, end, customerType, status || 'all');

  const pipeline = [
    { $match: match },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } }
  ];

  if (category) {
    pipeline.push({ $match: { 'category._id': category } });
  }

  pipeline.push(
    {
      $group: {
        _id: { $ifNull: ['$category.name', 'Unknown'] },
        productsSold: { $sum: '$items.quantity' },
        orderCount: { $sum: 1 },
        sales: { $sum: '$items.subtotal' },
        discount: {
          $sum: {
            $add: [
              { $multiply: ['$items.discountAmount', '$items.quantity'] },
              { $multiply: ['$items.secondOrderDiscountAmount', '$items.quantity'] },
              { $multiply: ['$items.membershipDiscountAmount', '$items.quantity'] },
              { $multiply: ['$items.wholesaleDiscountAmount', '$items.quantity'] },
              { $multiply: ['$items.referralDiscountAmount', '$items.quantity'] }
            ]
          }
        }
      }
    },
    { $sort: { sales: -1 } }
  );

  const rows = await Order.aggregate(pipeline);

  return rows.map((r) => ({
    category: r._id,
    productsSold: r.productsSold,
    orderCount: r.orderCount,
    sales: Math.round(r.sales * 100) / 100,
    discount: Math.round(r.discount * 100) / 100
  }));
}

/* ---------- Retail vs Wholesale ---------- */

/**
 * Retail vs Wholesale sales analysis.
 * Uses the customerType captured in the historical order pricing snapshot.
 */
async function getRetailWholesale(start, end, customerType = null, status = null) {
  const match = buildDeliveredMatch(start, end, customerType, status || 'all');

  const rows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$pricing.customerType',
        orderCount: { $sum: 1 },
        productsSold: { $sum: { $sum: '$items.quantity' } },
        sales: { $sum: '$pricing.total' },
        discounts: { $sum: '$pricing.discount' }
      }
    }
  ]);

  const result = {
    retail: { orderCount: 0, productsSold: 0, sales: 0, discounts: 0 },
    wholesale: { orderCount: 0, productsSold: 0, sales: 0, discounts: 0 }
  };

  rows.forEach((r) => {
    const type = r._id === 'wholesale' ? 'wholesale' : 'retail';
    result[type] = {
      orderCount: r.orderCount,
      productsSold: r.productsSold || 0,
      sales: Math.round(r.sales * 100) / 100,
      discounts: Math.round(r.discounts * 100) / 100
    };
  });

  return result;
}

/* ---------- Reseller / Referral Performance ---------- */

/**
 * Reseller/referral performance reporting.
 * Uses stored Commission records and order referral snapshots.
 * Accepts customerType so the Retail/Wholesale filter also applies here.
 */
async function getResellerPerformance(start, end, customerType = null, status = null) {
  const commissionMatch = {};
  if (start && end) {
    commissionMatch.createdAt = { $gte: start, $lte: end };
  }

  const commissionAgg = await Commission.aggregate([
    { $match: commissionMatch },
    { $group: { _id: '$status', total: { $sum: '$commissionAmount' }, count: { $sum: 1 } } }
  ]);

  const commissionTotals = { earned: 0, pending: 0, cancelled: 0 };
  const commissionCounts = { earned: 0, pending: 0, cancelled: 0 };
  commissionAgg.forEach((c) => {
    commissionTotals[c._id] = Math.round(c.total * 100) / 100;
    commissionCounts[c._id] = c.count;
  });

  // Referred orders with referral snapshot, matching the active status filter.
  // customerType is also applied here so the filter affects this section.
  const referredMatch = buildDeliveredMatch(start, end, customerType, status || 'all');
  referredMatch['pricing.referredByReseller'] = { $ne: null };

  const referredAgg = await Order.aggregate([
    { $match: referredMatch },
    {
      $group: {
        _id: null,
        referredOrders: { $sum: 1 },
        referredSales: { $sum: '$pricing.total' },
        referralDiscounts: { $sum: '$pricing.referralDiscountAmount' }
      }
    }
  ]);

  const referred = referredAgg.length > 0
    ? {
        referredOrders: referredAgg[0].referredOrders,
        referredSales: Math.round(referredAgg[0].referredSales * 100) / 100,
        referralDiscounts: Math.round(referredAgg[0].referralDiscounts * 100) / 100
      }
    : { referredOrders: 0, referredSales: 0, referralDiscounts: 0 };

  // Reseller-level performance (top resellers by commission)
  const resellerAgg = await Commission.aggregate([
    { $match: commissionMatch },
    {
      $group: {
        _id: '$reseller',
        totalCommission: { $sum: '$commissionAmount' },
        earnedCommission: { $sum: { $cond: [{ $eq: ['$status', 'earned'] }, '$commissionAmount', 0] } },
        pendingCommission: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$commissionAmount', 0] } },
        cancelledCommission: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, '$commissionAmount', 0] } },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { totalCommission: -1 } },
    { $limit: 10 }
  ]);

  // Fetch reseller names
  const resellerIds = resellerAgg.map((r) => r._id);
  const resellers = await User.find({ _id: { $in: resellerIds } }).select('name email referralCode');
  const resellerMap = {};
  resellers.forEach((u) => {
    resellerMap[u._id.toString()] = u;
  });

  const resellerPerformance = resellerAgg.map((r) => {
    const user = resellerMap[r._id.toString()];
    return {
      resellerId: r._id,
      resellerName: user ? user.name : 'Unknown',
      resellerEmail: user ? user.email : null,
      referralCode: user ? user.referralCode : null,
      orderCount: r.orderCount,
      totalCommission: Math.round(r.totalCommission * 100) / 100,
      earnedCommission: Math.round(r.earnedCommission * 100) / 100,
      pendingCommission: Math.round(r.pendingCommission * 100) / 100,
      cancelledCommission: Math.round(r.cancelledCommission * 100) / 100
    };
  });

  return {
    referredOrders: referred.referredOrders,
    referredSales: referred.referredSales,
    referralDiscounts: referred.referralDiscounts,
    totalCommission: Math.round((commissionTotals.earned + commissionTotals.pending) * 100) / 100,
    earnedCommission: commissionTotals.earned,
    pendingCommission: commissionTotals.pending,
    cancelledCommission: commissionTotals.cancelled,
    commissionCounts,
    resellers: resellerPerformance
  };
}

/* ---------- Top Selling Products ---------- */

/**
 * Top selling products by quantity sold (delivered orders only).
 * Uses historical order item snapshots.
 */
async function getTopProducts(start, end, customerType = null, category = null, status = null, limit = 10) {
  const match = buildDeliveredMatch(start, end, customerType, status || 'all');
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 20);

  if (category) {
    const products = await Product.find({ category }).select('_id');
    const productIds = products.map((p) => p._id);
    if (productIds.length === 0) return [];
    match['items.product'] = { $in: productIds };
  }

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
    { $sort: { quantitySold: -1, revenue: -1 } },
    { $limit: safeLimit }
  ]);

  return rows.map((r) => ({
    productId: r._id,
    productName: r.productName,
    quantitySold: r.quantitySold,
    revenue: Math.round(r.revenue * 100) / 100
  }));
}

/* ---------- Order Status Summary ---------- */

/**
 * Order status counts within the selected date range.
 * All statuses shown separately; only delivered contributes to sales.
 */
async function getOrderStatusSummary(start, end, customerType = null, status = null) {
  const match = buildAllStatusMatch(start, end, customerType, status);

  const rows = await Order.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const countMap = {};
  VALID_STATUSES.forEach((s) => { countMap[s] = 0; });
  rows.forEach((r) => {
    if (countMap[r._id] !== undefined) countMap[r._id] = r.count;
  });

  return VALID_STATUSES.map((status) => ({ status, count: countMap[status] }));
}

/* ---------- Discount Analysis ---------- */

/**
 * Discount analysis from stored order item snapshots.
 * Distinguishes: Category, Second-Order, Membership, Wholesale, Referral, Total.
 */
async function getDiscountAnalysis(start, end, customerType = null, category = null, status = null) {
  const match = buildDeliveredMatch(start, end, customerType, status || 'all');

  if (category) {
    const products = await Product.find({ category }).select('_id');
    const productIds = products.map((p) => p._id);
    if (productIds.length === 0) {
      return { categoryDiscount: 0, secondOrderDiscount: 0, membershipDiscount: 0, wholesaleDiscount: 0, referralDiscount: 0, totalDiscount: 0 };
    }
    match['items.product'] = { $in: productIds };
  }

  const [result] = await Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: null,
        categoryDiscount: { $sum: { $multiply: ['$items.discountAmount', '$items.quantity'] } },
        secondOrderDiscount: { $sum: { $multiply: ['$items.secondOrderDiscountAmount', '$items.quantity'] } },
        membershipDiscount: { $sum: { $multiply: ['$items.membershipDiscountAmount', '$items.quantity'] } },
        wholesaleDiscount: { $sum: { $multiply: ['$items.wholesaleDiscountAmount', '$items.quantity'] } },
        referralDiscount: { $sum: { $multiply: ['$items.referralDiscountAmount', '$items.quantity'] } }
      }
    }
  ]);

  if (!result) {
    return { categoryDiscount: 0, secondOrderDiscount: 0, membershipDiscount: 0, wholesaleDiscount: 0, referralDiscount: 0, totalDiscount: 0 };
  }

  const categoryDiscount = Math.round(result.categoryDiscount * 100) / 100;
  const secondOrderDiscount = Math.round(result.secondOrderDiscount * 100) / 100;
  const membershipDiscount = Math.round(result.membershipDiscount * 100) / 100;
  const wholesaleDiscount = Math.round(result.wholesaleDiscount * 100) / 100;
  const referralDiscount = Math.round(result.referralDiscount * 100) / 100;
  const totalDiscount = Math.round((categoryDiscount + secondOrderDiscount + membershipDiscount + wholesaleDiscount + referralDiscount) * 100) / 100;

  return { categoryDiscount, secondOrderDiscount, membershipDiscount, wholesaleDiscount, referralDiscount, totalDiscount };
}

/* ---------- Main Report ---------- */

/**
 * GET /api/admin/reports/sales
 * Comprehensive sales analytics dashboard report.
 */
async function getSalesReport(query) {
  const { start, end, year, category, customerType } = parseReportQuery(query);

  if (customerType && !VALID_CUSTOMER_TYPES.includes(customerType)) {
    throw new ApiError(400, 'Invalid customerType', ['customerType must be retail or wholesale']);
  }

  if (category && !/^[0-9a-fA-F]{24}$/.test(category)) {
    throw new ApiError(400, 'Invalid category ID', ['category must be a valid ObjectId']);
  }

  // Order status filter ('all'/empty → no restriction).
  const status = normalizeReportStatus(query.status);

  const [summary, monthly, categories, retailWholesale, resellerPerformance, topProducts, orderStatus, discountAnalysis] =
    await Promise.all([
      getSummaryKPIs(start, end, customerType, category, status),
      getMonthlySales(start, end, customerType, category, status),
      getCategorySales(start, end, customerType, category, status),
      getRetailWholesale(start, end, customerType, status),
      getResellerPerformance(start, end, customerType, status),
      getTopProducts(start, end, customerType, category, status, 10),
      getOrderStatusSummary(start, end, customerType, status),
      getDiscountAnalysis(start, end, customerType, category, status)
    ]);

  return {
    start,
    end,
    year,
    category,
    customerType,
    status,
    statuses: VALID_STATUSES,
    summary: summary,
    monthly,
    categories,
    retailWholesale,
    reseller: resellerPerformance,
    topProducts,
    orderStatus,
    discountAnalysis
  };
}

/**
 * GET /api/admin/reports/products
 * Product report: quantity sold and revenue per product.
 */
async function getProductsReport(query) {
  const { start, end, customerType } = parseReportQuery(query);
  const match = buildDeliveredMatch(start, end, customerType);

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
    { $sort: { quantitySold: -1 } }
  ]);

  return {
    start,
    end,
    products: rows.map((r) => ({
      productId: r._id,
      productName: r.productName,
      quantitySold: r.quantitySold,
      revenue: Math.round(r.revenue * 100) / 100
    }))
  };
}

/**
 * GET /api/admin/reports/categories
 * Category report: quantity sold and revenue per category.
 */
async function getCategoriesReport(query) {
  const { start, end, customerType } = parseReportQuery(query);
  const match = buildDeliveredMatch(start, end, customerType);

  const rows = await Order.aggregate([
    { $match: match },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$category.name', 'Unknown'] },
        quantitySold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' }
      }
    },
    { $sort: { revenue: -1 } }
  ]);

  return {
    start,
    end,
    categories: rows.map((r) => ({
      category: r._id,
      quantitySold: r.quantitySold,
      revenue: Math.round(r.revenue * 100) / 100
    }))
  };
}

/* ---------- CSV Export ---------- */

/**
 * Generate a CSV report from the current report data.
 */
async function generateCsv(query) {
  const report = await getSalesReport(query);

  const rows = [];
  const push = (cells) => rows.push(cells.map((c) => {
    const s = String(c === undefined || c === null ? '' : c);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(','));

  push(['VENDHAN CRACKERS — SALES REPORT']);
  push(['Generated', new Date().toLocaleString('en-IN')]);
  push(['Period', report.start && report.end
    ? `${report.start.toLocaleDateString('en-IN')} to ${report.end.toLocaleDateString('en-IN')}`
    : 'All Time']);
  push([]);

  push(['SUMMARY']);
  push(['Total Sales', report.summary.totalSales]);
  push(['Total Orders', report.summary.totalOrders]);
  push(['Products Sold', report.summary.productsSold]);
  push(['Average Order Value', report.summary.averageOrderValue]);
  push(['Total Discounts', report.summary.totalDiscounts]);
  push(['Net Sales', report.summary.netSales]);
  push([]);

  push(['SALES BY CATEGORY']);
  push(['Category', 'Products Sold', 'Orders', 'Sales', 'Discount']);
  report.categories.forEach((c) => push([c.category, c.productsSold, c.orderCount, c.sales, c.discount]));
  push([]);

  push(['RETAIL VS WHOLESALE']);
  push(['Type', 'Orders', 'Products Sold', 'Sales', 'Discounts']);
  push(['Retail', report.retailWholesale.retail.orderCount, report.retailWholesale.retail.productsSold, report.retailWholesale.retail.sales, report.retailWholesale.retail.discounts]);
  push(['Wholesale', report.retailWholesale.wholesale.orderCount, report.retailWholesale.wholesale.productsSold, report.retailWholesale.wholesale.sales, report.retailWholesale.wholesale.discounts]);
  push([]);

  push(['TOP SELLING PRODUCTS']);
  push(['Rank', 'Product', 'Quantity Sold', 'Revenue']);
  report.topProducts.forEach((p, i) => push([i + 1, p.productName, p.quantitySold, p.revenue]));
  push([]);

  push(['ORDER STATUS SUMMARY']);
  push(['Status', 'Count']);
  report.orderStatus.forEach((s) => push([s.status, s.count]));
  push([]);

  push(['DISCOUNT ANALYSIS']);
  push(['Category Discount', report.discountAnalysis.categoryDiscount]);
  push(['Second Order Discount', report.discountAnalysis.secondOrderDiscount]);
  push(['Membership Discount', report.discountAnalysis.membershipDiscount]);
  push(['Wholesale Discount', report.discountAnalysis.wholesaleDiscount]);
  push(['Referral Discount', report.discountAnalysis.referralDiscount]);
  push(['Total Discount', report.discountAnalysis.totalDiscount]);
  push([]);

  push(['RESELLER / REFERRAL PERFORMANCE']);
  push(['Referred Orders', report.reseller.referredOrders]);
  push(['Referred Sales', report.reseller.referredSales]);
  push(['Referral Discounts', report.reseller.referralDiscounts]);
  push(['Total Commission', report.reseller.totalCommission]);
  push(['Earned Commission', report.reseller.earnedCommission]);
  push(['Pending Commission', report.reseller.pendingCommission]);
  push(['Cancelled Commission', report.reseller.cancelledCommission]);
  push([]);
  push(['Reseller', 'Orders', 'Total Commission', 'Earned', 'Pending', 'Cancelled']);
  report.reseller.resellers.forEach((r) => push([r.resellerName, r.orderCount, r.totalCommission, r.earnedCommission, r.pendingCommission, r.cancelledCommission]));

  return rows.join('\n');
}

/* ---------- PDF Export ---------- */

/**
 * Generate a professional PDF sales report.
 * Uses pdfmake for server-side PDF generation.
 */
async function generatePdf(query) {
  const report = await getSalesReport(query);

  const pdfmake = require('pdfmake');
  const vfsFonts = require('pdfmake/build/vfs_fonts');

  // Register fonts in the virtual file system (decode base64 to Buffer)
  Object.keys(vfsFonts).forEach((fontName) => {
    pdfmake.virtualfs.storage[fontName] = Buffer.from(vfsFonts[fontName], 'base64');
  });

  // Configure fonts
  pdfmake.setFonts({
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  });

  // Set URL access policy to allow font loading
  pdfmake.setUrlAccessPolicy(() => true);
  pdfmake.setLocalAccessPolicy(() => true);

  const periodLabel = report.start && report.end
    ? `${report.start.toLocaleDateString('en-IN')} to ${report.end.toLocaleDateString('en-IN')}`
    : 'All Time';

  const content = [
    { text: 'VENDHAN CRACKERS', style: 'header' },
    { text: 'Sales Analytics Report', style: 'subheader' },
    { text: `Generated: ${new Date().toLocaleString('en-IN')}`, style: 'meta' },
    { text: `Period: ${periodLabel}`, style: 'meta' },
    { text: ' ', style: 'spacer' },

    { text: 'Summary', style: 'sectionHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['*', '*'],
        body: [
          ['Metric', 'Value'],
          ['Total Sales', `₹${report.summary.totalSales.toLocaleString('en-IN')}`],
          ['Total Orders', report.summary.totalOrders],
          ['Products Sold', report.summary.productsSold],
          ['Average Order Value', `₹${report.summary.averageOrderValue.toLocaleString('en-IN')}`],
          ['Total Discounts', `₹${report.summary.totalDiscounts.toLocaleString('en-IN')}`],
          ['Net Sales', `₹${report.summary.netSales.toLocaleString('en-IN')}`]
        ]
      },
      layout: 'lightHorizontalLines'
    },
    { text: ' ', style: 'spacer' },

    { text: 'Sales by Category', style: 'sectionHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['*', '*', '*', '*', '*'],
        body: [
          ['Category', 'Products Sold', 'Orders', 'Sales', 'Discount'],
          ...report.categories.map((c) => [c.category, c.productsSold, c.orderCount, `₹${c.sales.toLocaleString('en-IN')}`, `₹${c.discount.toLocaleString('en-IN')}`])
        ]
      },
      style: 'table'
    },
    { text: ' ', style: 'spacer' },

    { text: 'Retail vs Wholesale', style: 'sectionHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', '*', '*'],
        body: [
          ['Type', 'Orders', 'Products Sold', 'Sales', 'Discounts'],
          ['Retail', report.retailWholesale.retail.orderCount, report.retailWholesale.retail.productsSold, `₹${report.retailWholesale.retail.sales.toLocaleString('en-IN')}`, `₹${report.retailWholesale.retail.discounts.toLocaleString('en-IN')}`],
          ['Wholesale', report.retailWholesale.wholesale.orderCount, report.retailWholesale.wholesale.productsSold, `₹${report.retailWholesale.wholesale.sales.toLocaleString('en-IN')}`, `₹${report.retailWholesale.wholesale.discounts.toLocaleString('en-IN')}`]
        ]
      },
      style: 'table'
    },
    { text: ' ', style: 'spacer' },

    { text: 'Top Selling Products', style: 'sectionHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', '*'],
        body: [
          ['Rank', 'Product', 'Quantity Sold', 'Revenue'],
          ...report.topProducts.map((p, i) => [i + 1, p.productName, p.quantitySold, `₹${p.revenue.toLocaleString('en-IN')}`])
        ]
      },
      style: 'table'
    },
    { text: ' ', style: 'spacer' },

    { text: 'Order Status Summary', style: 'sectionHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['*', '*'],
        body: [
          ['Status', 'Count'],
          ...report.orderStatus.map((s) => [s.status, s.count])
        ]
      },
      style: 'table'
    },
    { text: ' ', style: 'spacer' },

    { text: 'Discount Analysis', style: 'sectionHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['*', '*'],
        body: [
          ['Discount Type', 'Amount'],
          ['Category Discount', `₹${report.discountAnalysis.categoryDiscount.toLocaleString('en-IN')}`],
          ['Second Order Discount', `₹${report.discountAnalysis.secondOrderDiscount.toLocaleString('en-IN')}`],
          ['Membership Discount', `₹${report.discountAnalysis.membershipDiscount.toLocaleString('en-IN')}`],
          ['Wholesale Discount', `₹${report.discountAnalysis.wholesaleDiscount.toLocaleString('en-IN')}`],
          ['Referral Discount', `₹${report.discountAnalysis.referralDiscount.toLocaleString('en-IN')}`],
          ['Total Discount', `₹${report.discountAnalysis.totalDiscount.toLocaleString('en-IN')}`]
        ]
      },
      style: 'table'
    },
    { text: ' ', style: 'spacer' },

    { text: 'Reseller / Referral Performance', style: 'sectionHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['*', '*'],
        body: [
          ['Metric', 'Value'],
          ['Referred Orders', report.reseller.referredOrders],
          ['Referred Sales', `₹${report.reseller.referredSales.toLocaleString('en-IN')}`],
          ['Referral Discounts', `₹${report.reseller.referralDiscounts.toLocaleString('en-IN')}`],
          ['Total Commission', `₹${report.reseller.totalCommission.toLocaleString('en-IN')}`],
          ['Earned Commission', `₹${report.reseller.earnedCommission.toLocaleString('en-IN')}`],
          ['Pending Commission', `₹${report.reseller.pendingCommission.toLocaleString('en-IN')}`],
          ['Cancelled Commission', `₹${report.reseller.cancelledCommission.toLocaleString('en-IN')}`]
        ]
      },
      style: 'table'
    }
  ];

  const docDefinition = {
    content,
    styles: {
      header: { fontSize: 22, bold: true, alignment: 'center', color: '#b45309' },
      subheader: { fontSize: 16, alignment: 'center', color: '#333333' },
      meta: { fontSize: 9, alignment: 'center', color: '#666666' },
      spacer: { fontSize: 6 },
      sectionHeader: { fontSize: 14, bold: true, color: '#b45309', margin: [0, 10, 0, 5] },
      table: { fontSize: 9, margin: [0, 5, 0, 10] }
    },
    defaultStyle: { fontSize: 10, color: '#333333' }
  };

  const doc = pdfmake.createPdf(docDefinition);
  return doc.getBuffer();
}

module.exports = {
  getSalesReport,
  getProductsReport,
  getCategoriesReport,
  generateCsv,
  generatePdf,
  parseReportQuery,
  buildDeliveredMatch,
  buildAllStatusMatch,
  getSummaryKPIs,
  getMonthlySales,
  getCategorySales,
  getRetailWholesale,
  getResellerPerformance,
  getTopProducts,
  getOrderStatusSummary,
  getDiscountAnalysis
};