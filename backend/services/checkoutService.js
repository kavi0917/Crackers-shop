/* ============================================================
   VENDHAN CRACKERS — Checkout & Order Service
   ============================================================ */

const { Cart, Product, Order, Setting, InventoryTransaction, Combo, Category, User } = require('../models');
const ApiError = require('../utils/ApiError');
const calculatePricing = require('../utils/calculatePricing');
const calculateProductPricing = require('../utils/calculateProductPricing');
const generateOrderNumber = require('../utils/generateOrderNumber');
const { withTransaction } = require('../utils/withTransaction');
const { getLoyaltyDiscount } = require('../utils/loyaltyDiscount');
const { MINIMUM_ONLINE_ORDER_AMOUNT, isMinimumOnlineOrderMet } = require('../utils/minimumOrder');
const {
  CUSTOMER_TYPES,
  WHOLESALE_MIN_ORDER_AMOUNT,
  isWholesaleMinimumOrderMet,
  getWholesaleMinimumOrderMessage,
  calculateWholesaleDiscount
} = require('../utils/wholesale');
const {
  REFERRAL_DISCOUNT_PERCENT,
  RESELLER_COMMISSION_PERCENT,
  getActiveCustomerReferral,
  calculateCommission
} = require('../utils/reseller');

/* ---------- Order Status Transitions ---------- */
const ORDER_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['delivered'],
  delivered: [],
  cancelled: []
};

/**
 * Validate that a status transition is allowed.
 */
function canTransition(from, to) {
  if (!ORDER_STATUS_TRANSITIONS[from]) return false;
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Expand a combo cart item into individual product line items.
 * Validates the combo and all its products (exists, active, stock).
 * Returns { orderItems, comboDiscount } where comboDiscount is the
 * difference between the sum of product prices and the combo price paid.
 */
async function expandComboItem(cartItem, sessionOpt = {}) {
  const combo = await Combo.findById(cartItem.combo, null, sessionOpt);
  if (!combo) {
    throw new ApiError(400, 'A combo in your cart is no longer available. Please remove it and try again.', ['Combo no longer exists']);
  }
  if (combo.status !== 'active') {
    throw new ApiError(400, `${combo.name} is currently unavailable. Please remove it from your cart.`, ['Combo is inactive']);
  }
  if (combo.items.length === 0) {
    throw new ApiError(400, `${combo.name} has no products. Please remove it from your cart.`, ['Combo is empty']);
  }

  const comboQty = cartItem.quantity;
  if (!Number.isInteger(comboQty) || comboQty < 1) {
    throw new ApiError(400, `Invalid quantity for ${combo.name}`, ['Invalid quantity']);
  }

  // Use the customer's customized snapshot when present (slot count and
  // per-slot quantities are admin-controlled; only the chosen product can
  // differ). Fall back to the combo defaults for non-customized combos.
  const comboSlots =
    cartItem.comboItems && cartItem.comboItems.length > 0 ? cartItem.comboItems : combo.items;

  const productIds = comboSlots.map((ci) => ci.product);
  const products = await Product.find({ _id: { $in: productIds } }, null, sessionOpt);
  const productMap = {};
  products.forEach((p) => {
    productMap[p._id.toString()] = p;
  });

  const orderItems = [];
  let productTotal = 0;

  for (const comboItem of comboSlots) {
    const product = productMap[comboItem.product.toString()];

    if (!product) {
      throw new ApiError(400, `A product in ${combo.name} is no longer available. Please remove it from your cart.`, ['Product no longer exists']);
    }
    if (product.status !== 'active') {
      throw new ApiError(400, `${product.name} is currently unavailable. Please remove it from your cart.`, ['Product is inactive']);
    }

    const qty = comboItem.quantity * comboQty;
    if (product.stock === 0) {
      throw new ApiError(409, `${product.name} is out of stock. Please remove it from your cart.`, ['Out of stock']);
    }
    if (qty > product.stock) {
      throw new ApiError(409, `Only ${product.stock} units of ${product.name} are available in stock. Please reduce the quantity.`, ['Insufficient stock']);
    }
    if (typeof product.price !== 'number' || product.price < 0) {
      throw new ApiError(400, `Invalid price for ${product.name}`, ['Invalid product price']);
    }

    const subtotal = Math.round(product.price * qty * 100) / 100;
    productTotal += subtotal;

    orderItems.push({
      product: product._id,
      productName: product.name,
      price: product.price,
      quantity: qty,
      subtotal
    });
  }

  // Combo price paid (with discount applied) from DB
  const discountAmount = Math.round((combo.price * combo.discount) / 100 * 100) / 100;
  const comboFinalPrice = Math.round((combo.price - discountAmount) * 100) / 100;
  const comboPaid = Math.round(comboFinalPrice * comboQty * 100) / 100;

  // The combo discount = sum of product prices - combo price paid
  const comboDiscount = Math.round((productTotal - comboPaid) * 100) / 100;

  return { orderItems, comboDiscount };
}

/**
 * Load the user's cart with authoritative product data.
 * Returns { cart, items, comboDiscount, loyalty, referral } where items are
 * enriched with current product data and combo items are expanded into product lines.
 * Throws ApiError if cart is empty or products are invalid.
 */
async function loadCartForCheckout(userId) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, 'Your cart is empty. Add items before checkout.', ['Cart is empty']);
  }

  // Determine customer type from the authenticated user's DB record (authoritative)
  const user = await User.findById(userId);
  const customerType = user && user.customerType === CUSTOMER_TYPES.WHOLESALE
    ? CUSTOMER_TYPES.WHOLESALE
    : CUSTOMER_TYPES.RETAIL;

  // Determine loyalty discount (second-order OR membership — mutually exclusive, authoritative from backend)
  // Wholesale customers NEVER receive retail loyalty discounts.
  let secondOrderDiscountPercent = 0;
  let membershipDiscountPercent = 0;
  let membershipTier = 'none';

  if (customerType === CUSTOMER_TYPES.RETAIL) {
    const loyalty = await getLoyaltyDiscount(userId);
    secondOrderDiscountPercent = loyalty.secondOrderDiscountPercent;
    membershipDiscountPercent = loyalty.membershipDiscountPercent;
    membershipTier = loyalty.membershipTier;
  }

  // Determine active reseller referral (retail only). Referral discount is 3%
  // applied AFTER category + loyalty. Wholesale customers never get it.
  let referralDiscountPercent = 0;
  let referralCode = null;
  let referredByReseller = null;
  if (customerType === CUSTOMER_TYPES.RETAIL) {
    const referral = await getActiveCustomerReferral(user);
    if (referral.eligible) {
      referralDiscountPercent = REFERRAL_DISCOUNT_PERCENT;
      referralCode = referral.referralCode || null;
      referredByReseller = referral.resellerId ? referral.resellerId.toString() : null;
    }
  }

  const productItems = cart.items.filter((item) => item.itemType !== 'COMBO');
  const comboItems = cart.items.filter((item) => item.itemType === 'COMBO');

  const productIds = productItems.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = {};
  products.forEach((p) => {
    productMap[p._id.toString()] = p;
  });

  // Fetch categories for product items to get category-level discounts
  const categoryIds = products.map((p) => p.category).filter(Boolean);
  const categories = await Category.find({ _id: { $in: categoryIds } });
  const categoryMap = {};
  categories.forEach((c) => {
    categoryMap[c._id.toString()] = c;
  });

  const items = [];
  let comboDiscount = 0;

  // --- Product items ---
  for (const cartItem of productItems) {
    const product = productMap[cartItem.product.toString()];

    // Product deleted or no longer exists
    if (!product) {
      throw new ApiError(400, 'A product in your cart is no longer available. Please remove it and try again.', ['Product no longer exists']);
    }

    // Product inactive
    if (product.status !== 'active') {
      throw new ApiError(400, `${product.name} is currently unavailable. Please remove it from your cart.`, ['Product is inactive']);
    }

    // Quantity valid
    const qty = cartItem.quantity;
    if (!Number.isInteger(qty) || qty < 1) {
      throw new ApiError(400, `Invalid quantity for ${product.name}`, ['Invalid quantity']);
    }

    // Stock check
    if (product.stock === 0) {
      throw new ApiError(409, `${product.name} is out of stock. Please remove it from your cart.`, ['Out of stock']);
    }
    if (qty > product.stock) {
      throw new ApiError(409, `Only ${product.stock} units of ${product.name} are available in stock. Please reduce the quantity.`, ['Insufficient stock']);
    }

    // Price check — authoritative from DB
    if (typeof product.price !== 'number' || product.price < 0) {
      throw new ApiError(400, `Invalid price for ${product.name}`, ['Invalid product price']);
    }

    // Apply category-level discount (authoritative from DB).
    // Stored model: originalPrice = admin-entered original, price = selling,
    // discount = category discount. Use originalPrice as the pricing base so the
    // derived selling price matches the stored selling price (no double discount).
    const category = categoryMap[product.category ? product.category.toString() : ''];
    const categoryDiscount = category ? (category.discount || 0) : 0;
    const storedOriginal = (typeof product.originalPrice === 'number' && !Number.isNaN(product.originalPrice) && product.originalPrice > 0)
      ? product.originalPrice
      : product.price;
    const pricing = calculateProductPricing(storedOriginal, categoryDiscount, secondOrderDiscountPercent, membershipDiscountPercent, referralDiscountPercent);

    // Unit price AFTER the per-product category discount but BEFORE any order-level
    // discount — the Subtotal basis (order-level discounts are applied on top).
    const priceAfterCategory = Math.round((pricing.originalPrice - pricing.discountAmount) * 100) / 100;

    items.push({
      product: product._id,
      productName: product.name,
      price: pricing.finalPrice,
      afterCategoryPrice: priceAfterCategory,
      afterCategorySubtotal: Math.round(priceAfterCategory * qty * 100) / 100,
      originalPrice: pricing.originalPrice,
      discountPercent: pricing.discountPercent,
      discountAmount: pricing.discountAmount,
      secondOrderDiscountPercent: pricing.secondOrderDiscountPercent,
      secondOrderDiscountAmount: pricing.secondOrderDiscountAmount,
      membershipTier,
      membershipDiscountPercent: pricing.membershipDiscountPercent,
      membershipDiscountAmount: pricing.membershipDiscountAmount,
      referralDiscountPercent: pricing.referralDiscountPercent,
      referralDiscountAmount: pricing.referralDiscountAmount,
      quantity: qty,
      subtotal: Math.round(pricing.finalPrice * qty * 100) / 100
    });
  }

  // --- Combo items (expanded into product lines) ---
  for (const cartItem of comboItems) {
    const { orderItems, comboDiscount: cd } = await expandComboItem(cartItem);
    items.push(...orderItems);
    comboDiscount += cd;
  }

  return {
    cart,
    items,
    comboDiscount,
    customerType,
    secondOrderDiscountPercent,
    membershipTier,
    membershipDiscountPercent,
    referralCode,
    referredByReseller,
    referralDiscountPercent
  };
}

/**
 * Load shop settings for pricing.
 */
async function loadShopSettings() {
  const settings = await Setting.getSettings();
  return {
    deliveryCharge: settings.deliveryCharge || 0,
    freeDeliveryThreshold: settings.freeDeliveryThreshold || 1000,
    minimumOrderAmount: settings.minimumOrderAmount != null ? settings.minimumOrderAmount : 2000,
    gstPercent: settings.gst || 0
  };
}

/**
 * Validate delivery information.
 */
function validateDeliveryInfo({ name, phone, email, address, city, state, pincode }) {
  if (!name || !name.trim()) {
    throw new ApiError(400, 'Customer name is required', ['Name is required']);
  }
  if (!phone || !/^\d{10}$/.test(phone)) {
    throw new ApiError(400, 'Phone number must be exactly 10 digits', ['Invalid phone number']);
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'Please enter a valid email address', ['Invalid email']);
  }
  if (!address || !address.trim()) {
    throw new ApiError(400, 'Delivery address is required', ['Address is required']);
  }
  if (!city || !city.trim()) {
    throw new ApiError(400, 'City is required', ['City is required']);
  }
  if (!state || !state.trim()) {
    throw new ApiError(400, 'State is required', ['State is required']);
  }
  if (!pincode || !/^\d{6}$/.test(pincode)) {
    throw new ApiError(400, 'Pincode must be exactly 6 digits', ['Invalid pincode']);
  }
}

/**
 * Calculate the total order amount AFTER category discounts have been applied
 * but BEFORE any second-order (3%), membership (Silver 4% / Gold 7% / Platinum 10%),
 * or referral (3%) discount is applied.
 *
 * Product items carry `originalPrice` and `discountAmount` (the category discount),
 * so the after-category unit price is `originalPrice - discountAmount`.
 * Combo-expanded items carry the base product price only (no category discount).
 *
 * @param {Array} items - Checkout/order line items.
 * @returns {number} - Total amount after category discount, rounded to 2 decimals.
 */
function calculateAmountAfterCategoryDiscount(items) {
  return Math.round(
    items.reduce((sum, item) => {
      const perUnit = item.originalPrice != null && item.discountAmount != null
        ? item.originalPrice - item.discountAmount
        : item.price;
      return sum + perUnit * item.quantity;
    }, 0) * 100
  ) / 100;
}

/**
 * Calculate the FINAL PAID PRODUCT AMOUNT.
 *
 * This is the sum of item subtotals — each item subtotal already reflects the
 * final unit price after category + loyalty + referral discounts.
 *
 * Delivery charge, GST, and combos discounts are NOT part of this amount.
 *
 * @param {Array} items - Checkout/order line items.
 * @returns {number} - Final paid product amount, rounded to 2 decimals.
 */
function calculateFinalProductAmount(items) {
  return Math.round(
    items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 100
  ) / 100;
}

/**
 * Enforce the minimum online order value.
 * The check runs on the amount AFTER category discount and BEFORE
 * second-order/membership/referral discounts, so the final payable amount
 * may be below ₹2,000.
 *
 * The enforced minimum comes from Shop Settings (Setting.minimumOrderAmount).
 * When not passed, the util fallback (MINIMUM_ONLINE_ORDER_AMOUNT — the existing
 * business rule) is used.
 *
 * @param {Array} items - Checkout/order line items.
 * @param {number} [minimumOrderAmount] - Minimum order amount from Shop Settings.
 * @returns {number} - The amount after category discount that passed the check.
 */
function enforceMinimumOrder(items, minimumOrderAmount) {
  const amountAfterCategoryDiscount = calculateAmountAfterCategoryDiscount(items);
  const min = minimumOrderAmount !== undefined && minimumOrderAmount !== null
    ? Number(minimumOrderAmount)
    : MINIMUM_ONLINE_ORDER_AMOUNT;
  if (!isMinimumOnlineOrderMet(amountAfterCategoryDiscount, min)) {
    throw new ApiError(
      400,
      `Minimum order value is ₹${min} after category discount. Please add more items to your cart.`,
      ['Below minimum order value']
    );
  }
  return amountAfterCategoryDiscount;
}

/**
 * Build the checkout summary from authoritative data.
 * Used by both validate and checkout endpoints.
 */
async function buildCheckoutSummary(userId, deliveryInfo) {
  // Validate delivery info
  validateDeliveryInfo(deliveryInfo);

  // Load cart with authoritative product data (combos expanded into product lines)
  const {
    items,
    comboDiscount,
    customerType,
    secondOrderDiscountPercent,
    membershipTier,
    membershipDiscountPercent,
    referralCode,
    referredByReseller,
    referralDiscountPercent
  } = await loadCartForCheckout(userId);

  // Load settings
  const settings = await loadShopSettings();

  // Calculate pricing — combo discount is the only discount applied
  const pricing = calculatePricing(items, settings, { comboDiscount });

  // Aggregate second-order discount amount for display
  const secondOrderDiscountAmount = Math.round(
    items.reduce((sum, item) => sum + (item.secondOrderDiscountAmount || 0) * item.quantity, 0) * 100
  ) / 100;

  // Aggregate membership discount amount for display
  const membershipDiscountAmount = Math.round(
    items.reduce((sum, item) => sum + (item.membershipDiscountAmount || 0) * item.quantity, 0) * 100
  ) / 100;

  // Aggregate referral discount amount for display (referred retail customers only)
  const referralDiscountAmount = Math.round(
    items.reduce((sum, item) => sum + (item.referralDiscountAmount || 0) * item.quantity, 0) * 100
  ) / 100;

  // Enforce the minimum ORDER AMOUNT — customer-type specific, on the amount after
  // category discount (before loyalty/referral discounts).
  //   Retail    -> ₹2,000  from Shop Settings (Setting.minimumOrderAmount)
  //   Wholesale -> ₹50,000 from WHOLESALE_MIN_ORDER_AMOUNT (single constant)
  const amountAfterCategoryDiscount = customerType === CUSTOMER_TYPES.WHOLESALE
    ? calculateAmountAfterCategoryDiscount(items)
    : enforceMinimumOrder(items, settings.minimumOrderAmount);

  // --- Wholesale pricing ---
  let wholesaleTier = null;
  let wholesaleDiscountPercent = 0;
  let wholesaleDiscountAmount = 0;
  let wholesaleMinAmountMet = false;

  if (customerType === CUSTOMER_TYPES.WHOLESALE) {
    // Wholesale eligibility is based on the order/cart AMOUNT (amount after
    // category discount — the same basis used for the wholesale tier), NOT on
    // total product quantity.
    if (!isWholesaleMinimumOrderMet(amountAfterCategoryDiscount)) {
      throw new ApiError(
        400,
        getWholesaleMinimumOrderMessage(),
        ['Wholesale minimum order amount not met']
      );
    }
    wholesaleMinAmountMet = true;

    // Wholesale tier is determined from the amount AFTER category discount
    const wholesale = calculateWholesaleDiscount(amountAfterCategoryDiscount);
    wholesaleTier = wholesale.tier;
    wholesaleDiscountPercent = wholesale.discountPercent;
    wholesaleDiscountAmount = wholesale.discountAmount;
  }

  // Wholesale / retail order-level discount snapshot fields on the pricing object.
  pricing.wholesaleTier = wholesaleTier;
  pricing.wholesaleDiscountPercent = wholesaleDiscountPercent;
  pricing.wholesaleDiscountAmount = wholesaleDiscountAmount;

  // Order-level discounts applied ON TOP of the after-category Subtotal:
  //   * Retail    -> loyalty (second-order OR membership, mutually exclusive) + referral.
  //   * Wholesale -> the wholesale tier discount (retail loyalty/referral never apply).
  // Pricing.subtotal is the amount AFTER category discount (the SAME basis the
  // customer-type specific minimum-order checks use). Rebuilding the summary here
  // guarantees subtotal / discount / deliveryCharge / total carry the SAME values
  // that the Cart API returns and the created Order persists — the frontend must
  // display these values, not recalculate them.
  const retailOrderLevelDiscount = customerType === CUSTOMER_TYPES.WHOLESALE
    ? 0
    : Math.round((secondOrderDiscountAmount + membershipDiscountAmount + referralDiscountAmount) * 100) / 100;

  const freeDeliveryThreshold = Number(settings.freeDeliveryThreshold) || 1000;
  pricing.subtotal = amountAfterCategoryDiscount;
  pricing.deliveryCharge = pricing.subtotal >= freeDeliveryThreshold ? 0 : (Number(settings.deliveryCharge) || 0);
  pricing.discount = Math.round((comboDiscount + retailOrderLevelDiscount + wholesaleDiscountAmount) * 100) / 100;
  pricing.total = Math.round((pricing.subtotal - pricing.discount + pricing.deliveryCharge) * 100) / 100;

  // Expected commission is only relevant for eligible referred retail orders.
  const finalProductAmount = calculateFinalProductAmount(items);
  const commission = calculateCommission(finalProductAmount);

  return {
    items,
    pricing,
    amountAfterCategoryDiscount,
    minimumOrderAmount: customerType === CUSTOMER_TYPES.WHOLESALE
      ? WHOLESALE_MIN_ORDER_AMOUNT
      : settings.minimumOrderAmount,
    customerType,
    secondOrderDiscountPercent,
    secondOrderDiscountAmount,
    membershipTier,
    membershipDiscountPercent,
    membershipDiscountAmount,
    referralCode,
    referredByReseller,
    referralDiscountPercent,
    referralDiscountAmount,
    finalProductAmount,
    expectedCommission: {
      commissionPercent: commission.commissionPercent,
      commissionBaseAmount: commission.commissionBaseAmount,
      commissionAmount: commission.commissionAmount
    },
    wholesaleTier,
    wholesaleDiscountPercent,
    wholesaleDiscountAmount,
    wholesaleMinAmountMet,
    wholesaleMinAmount: WHOLESALE_MIN_ORDER_AMOUNT,
    settings: {
      deliveryCharge: settings.deliveryCharge,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
      minimumOrderAmount: settings.minimumOrderAmount,
      gstPercent: settings.gstPercent
    }
  };
}

/**
 * POST /api/checkout/validate
 * Validate the cart and return a calculated checkout summary.
 */
async function validateCheckout(userId, deliveryInfo) {
  const summary = await buildCheckoutSummary(userId, deliveryInfo);
  return summary;
}

/**
 * POST /api/checkout
 * Create an order from the user's cart using a MongoDB transaction.
 * Reduces stock, clears cart, and records inventory transactions atomically.
 */
async function createOrder(userId, deliveryInfo, paymentMethod = 'cod') {
  // Validate payment method
  if (!['cod', 'upi', 'card'].includes(paymentMethod)) {
    throw new ApiError(400, 'Invalid payment method', ['Payment method must be cod, upi, or card']);
  }

  // Build summary (validates everything upfront)
  await buildCheckoutSummary(userId, deliveryInfo);

  return withTransaction(async (session) => {
    const sessionOpt = session ? { session } : {};

    // Re-fetch cart within the transaction to avoid race conditions
    const cart = await Cart.findOne({ user: userId }, null, sessionOpt);
    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Your cart is empty. Add items before checkout.', ['Cart is empty']);
    }

    // Separate product and combo items
    const productItems = cart.items.filter((item) => item.itemType !== 'COMBO');
    const comboItems = cart.items.filter((item) => item.itemType === 'COMBO');

    // Re-fetch products within the transaction and re-validate stock atomically
    const productIds = productItems.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } }, null, sessionOpt);
    const productMap = {};
    products.forEach((p) => {
      productMap[p._id.toString()] = p;
    });

    // Fetch categories for product items to get category-level discounts
    const categoryIds = products.map((p) => p.category).filter(Boolean);
    const categories = await Category.find({ _id: { $in: categoryIds } }, null, sessionOpt);
    const categoryMap = {};
    categories.forEach((c) => {
      categoryMap[c._id.toString()] = c;
    });

    // Determine customer type from the authenticated user's DB record (authoritative)
    const user = await User.findById(userId, null, sessionOpt);
    const customerType = user && user.customerType === CUSTOMER_TYPES.WHOLESALE
      ? CUSTOMER_TYPES.WHOLESALE
      : CUSTOMER_TYPES.RETAIL;

    // Determine loyalty discount (second-order OR membership — mutually exclusive, authoritative from backend)
    // Wholesale customers NEVER receive retail loyalty discounts.
    let secondOrderDiscountPercent = 0;
    let membershipDiscountPercent = 0;
    let membershipTier = 'none';

    if (customerType === CUSTOMER_TYPES.RETAIL) {
      const loyalty = await getLoyaltyDiscount(userId);
      secondOrderDiscountPercent = loyalty.secondOrderDiscountPercent;
      membershipDiscountPercent = loyalty.membershipDiscountPercent;
      membershipTier = loyalty.membershipTier;
    }

    // Determine active reseller referral (retail only) — authoritative from DB.
    let referralDiscountPercent = 0;
    let referralCode = null;
    let referredByReseller = null;
    if (customerType === CUSTOMER_TYPES.RETAIL) {
      const referral = await getActiveCustomerReferral(user, sessionOpt);
      if (referral.eligible) {
        referralDiscountPercent = REFERRAL_DISCOUNT_PERCENT;
        referralCode = referral.referralCode || null;
        referredByReseller = referral.resellerId ? referral.resellerId.toString() : null;
      }
    }

    const orderItems = [];
    let comboDiscount = 0;

    // --- Product items ---
    for (const cartItem of productItems) {
      const product = productMap[cartItem.product.toString()];
      if (!product) {
        throw new ApiError(400, 'A product in your cart is no longer available.', ['Product no longer exists']);
      }
      if (product.status !== 'active') {
        throw new ApiError(400, `${product.name} is currently unavailable.`, ['Product is inactive']);
      }
      if (cartItem.quantity > product.stock) {
        throw new ApiError(409, `Only ${product.stock} units of ${product.name} are available in stock.`, ['Insufficient stock']);
      }

      // Apply category-level discount (authoritative from DB)
      const category = categoryMap[product.category ? product.category.toString() : ''];
      const categoryDiscount = category ? (category.discount || 0) : 0;
      const pricing = calculateProductPricing(product.price, categoryDiscount, secondOrderDiscountPercent, membershipDiscountPercent, referralDiscountPercent);

      orderItems.push({
        product: product._id,
        productName: product.name,
        price: pricing.finalPrice,
        originalPrice: pricing.originalPrice,
        discountPercent: pricing.discountPercent,
        discountAmount: pricing.discountAmount,
        secondOrderDiscountPercent: pricing.secondOrderDiscountPercent,
        secondOrderDiscountAmount: pricing.secondOrderDiscountAmount,
        membershipTier,
        membershipDiscountPercent: pricing.membershipDiscountPercent,
        membershipDiscountAmount: pricing.membershipDiscountAmount,
        referralDiscountPercent: pricing.referralDiscountPercent,
        referralDiscountAmount: pricing.referralDiscountAmount,
        quantity: cartItem.quantity,
        subtotal: Math.round(pricing.finalPrice * cartItem.quantity * 100) / 100
      });
    }

    // --- Combo items (expanded into product lines within the transaction) ---
    for (const cartItem of comboItems) {
      const { orderItems: comboOrderItems, comboDiscount: cd } = await expandComboItem(cartItem, sessionOpt);
      orderItems.push(...comboOrderItems);
      comboDiscount += cd;
    }

    // Recalculate pricing from authoritative data
    const settings = await loadShopSettings();

    // Amount AFTER per-product category discount — the Subtotal basis (the same
    // basis the customer-type specific minimum-order checks use below).
    const amountAfterCategoryDiscount = calculateAmountAfterCategoryDiscount(orderItems);

    // Aggregate second-order discount amount for the order snapshot
    const secondOrderDiscountAmount = Math.round(
      orderItems.reduce((sum, item) => sum + (item.secondOrderDiscountAmount || 0) * item.quantity, 0) * 100
    ) / 100;

    // Aggregate membership discount amount for the order snapshot
    const membershipDiscountAmount = Math.round(
      orderItems.reduce((sum, item) => sum + (item.membershipDiscountAmount || 0) * item.quantity, 0) * 100
    ) / 100;

    // Aggregate referral discount amount for the order snapshot
    const referralDiscountAmount = Math.round(
      orderItems.reduce((sum, item) => sum + (item.referralDiscountAmount || 0) * item.quantity, 0) * 100
    ) / 100;

    // Final authoritative pricing: combo discount passed to the pricing utility
    const pricingOptions = { comboDiscount };
    const pricing = calculatePricing(orderItems, settings, pricingOptions);
    pricing.secondOrderDiscountPercent = secondOrderDiscountPercent;
    pricing.secondOrderDiscountAmount = secondOrderDiscountAmount;
    pricing.membershipTier = membershipTier;
    pricing.membershipDiscountPercent = membershipDiscountPercent;
    pricing.membershipDiscountAmount = membershipDiscountAmount;
    pricing.customerType = customerType;
    // Phase 8 — referral snapshot (backward-compatible)
    pricing.referralCode = referralCode;
    pricing.referredByReseller = referredByReseller ? referredByReseller : null;
    pricing.referralDiscountPercent = referralDiscountPercent;
    pricing.referralDiscountAmount = referralDiscountAmount;

    // Wholesale pricing snapshot for wholesale customers
    let wholesaleTier = null;
    let wholesaleDiscountPercent = 0;
    let wholesaleDiscountAmount = 0;

    if (customerType === CUSTOMER_TYPES.WHOLESALE) {
      // The applicable wholesale order amount = amount AFTER category discount
      // (same basis used for the wholesale tier). Re-enforce the wholesale
      // minimum ORDER AMOUNT on authoritative data inside the transaction.
      const wholesaleAmount = calculateAmountAfterCategoryDiscount(orderItems);
      if (!isWholesaleMinimumOrderMet(wholesaleAmount)) {
        throw new ApiError(
          400,
          getWholesaleMinimumOrderMessage(),
          ['Wholesale minimum order amount not met']
        );
      }

      // Wholesale tier is determined from the amount AFTER category discount
      const wholesale = calculateWholesaleDiscount(wholesaleAmount);
      wholesaleTier = wholesale.tier;
      wholesaleDiscountPercent = wholesale.discountPercent;
      wholesaleDiscountAmount = wholesale.discountAmount;
    }

    pricing.wholesaleTier = wholesaleTier;
    pricing.wholesaleDiscountPercent = wholesaleDiscountPercent;
    pricing.wholesaleDiscountAmount = wholesaleDiscountAmount;

    // Apply ALL order-level discounts to the authoritative order pricing — identical
    // to buildCheckoutSummary — so the created Order's pricing subtotal / discount /
    // deliveryCharge / total match exactly what the customer saw at cart and
    // checkout. GST is untouched ("Inclusive of all taxes": pricing.gst stays 0).
    //   Retail    -> loyalty (second-order OR membership, mutually exclusive) + referral.
    //   Wholesale -> wholesale tier discount only.
    const retailOrderLevelDiscount = customerType === CUSTOMER_TYPES.WHOLESALE
      ? 0
      : Math.round((secondOrderDiscountAmount + membershipDiscountAmount + referralDiscountAmount) * 100) / 100;

    const freeDeliveryThreshold = Number(settings.freeDeliveryThreshold) || 1000;
    pricing.subtotal = amountAfterCategoryDiscount;
    pricing.deliveryCharge = pricing.subtotal >= freeDeliveryThreshold ? 0 : (Number(settings.deliveryCharge) || 0);
    pricing.discount = Math.round((comboDiscount + retailOrderLevelDiscount + wholesaleDiscountAmount) * 100) / 100;
    pricing.total = Math.round((pricing.subtotal - pricing.discount + pricing.deliveryCharge) * 100) / 100;

    // Re-enforce the RETAIL minimum order value on authoritative data inside the
    // transaction. (The wholesale ₹50,000 minimum was already enforced above.)
    if (customerType !== CUSTOMER_TYPES.WHOLESALE) {
      enforceMinimumOrder(orderItems, settings.minimumOrderAmount);
    }

    // Generate a unique order number
    const orderCount = await Order.countDocuments({}, sessionOpt);
    let orderId = generateOrderNumber(orderCount + 1);
    // Ensure uniqueness (in case of concurrent orders)
    let exists = await Order.findOne({ orderId }, null, sessionOpt);
    let counter = orderCount + 2;
    while (exists) {
      orderId = generateOrderNumber(counter);
      exists = await Order.findOne({ orderId }, null, sessionOpt);
      counter += 1;
    }

    // Create the order
    const order = await Order.create(
      [
        {
          orderId,
          user: userId,
          customer: {
            name: deliveryInfo.name.trim(),
            phone: deliveryInfo.phone,
            email: deliveryInfo.email.toLowerCase().trim()
          },
          deliveryAddress: {
            address: deliveryInfo.address.trim(),
            city: deliveryInfo.city.trim(),
            state: deliveryInfo.state.trim(),
            pincode: deliveryInfo.pincode
          },
          items: orderItems,
          pricing,
          payment: {
            method: paymentMethod,
            status: paymentMethod === 'cod' ? 'pending' : 'pending'
          },
          status: 'pending',
          statusHistory: [{ status: 'pending', changedAt: new Date() }]
        }
      ],
      sessionOpt
    );

    // Reduce stock atomically and record inventory transactions
    for (const item of orderItems) {
      // Combo-expanded products may not be in productMap — fetch if needed
      let product = productMap[item.product.toString()];
      if (!product) {
        product = await Product.findById(item.product, null, sessionOpt);
      }
      const previousStock = product.stock;
      const newStock = previousStock - item.quantity;

      // Atomic update to prevent race conditions (works with or without transaction)
      const updated = await Product.findOneAndUpdate(
        { _id: product._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true, ...sessionOpt }
      );

      if (!updated) {
        throw new ApiError(409, `Insufficient stock for ${product.name}. Please try again.`, ['Stock changed during checkout']);
      }

      await InventoryTransaction.create(
        [
          {
            product: product._id,
            previousStock,
            newStock,
            changeAmount: -item.quantity,
            reason: 'SALE',
            referenceOrder: order[0]._id,
            changedBy: userId,
            changedByModel: 'User',
            note: `Order ${orderId}`
          }
        ],
        sessionOpt
      );
    }

    // Clear the cart
    cart.items = [];
    await cart.save(sessionOpt);

    return {
      order: order[0],
      orderId: order[0].orderId,
      pricing
    };
  });
}

/**
 * POST /api/orders/:id/cancel
 * Cancel an order and restore stock exactly once.
 */
async function cancelOrder(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw new ApiError(404, 'Order not found', ['Order does not exist']);
  }

  // Validate transition
  if (!canTransition(order.status, 'cancelled')) {
    throw new ApiError(400, `Order cannot be cancelled from status '${order.status}'`, ['Invalid status transition']);
  }

  return withTransaction(async (session) => {
    const sessionOpt = session ? { session } : {};

    // Re-fetch order within transaction to prevent double restoration
    const lockedOrder = await Order.findOne({ _id: orderId, user: userId }, null, sessionOpt);
    if (!lockedOrder) {
      throw new ApiError(404, 'Order not found', ['Order does not exist']);
    }
    if (lockedOrder.status === 'cancelled') {
      throw new ApiError(400, 'Order is already cancelled', ['Order already cancelled']);
    }
    if (!canTransition(lockedOrder.status, 'cancelled')) {
      throw new ApiError(400, `Order cannot be cancelled from status '${lockedOrder.status}'`, ['Invalid status transition']);
    }

    // Restore stock for each item (idempotent via status check)
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
              changedBy: userId,
              changedByModel: 'User',
              note: `Order ${lockedOrder.orderId} cancelled`
            }
          ],
          sessionOpt
        );
      }
    }

    // Update order status
    lockedOrder.status = 'cancelled';
    lockedOrder.statusHistory.push({ status: 'cancelled', changedAt: new Date(), note: 'Cancelled by customer' });
    await lockedOrder.save(sessionOpt);

    return lockedOrder;
  });
}

/**
 * Get a customer's order by ID (security: only own orders).
 */
async function getCustomerOrder(userId, orderId) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw new ApiError(404, 'Order not found', ['Order does not exist']);
  }
  return order;
}

/**
 * Get order tracking info.
 */
async function getOrderTracking(userId, orderId) {
  const order = await getCustomerOrder(userId, orderId);
  return {
    orderId: order.orderId,
    status: order.status,
    statusHistory: order.statusHistory,
    updatedAt: order.updatedAt
  };
}

/**
 * List a customer's orders with pagination.
 */
async function listCustomerOrders(userId, { page, limit, skip }) {
  const filter = { user: userId };
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

  return { orders: mapped, total };
}

module.exports = {
  validateCheckout,
  createOrder,
  cancelOrder,
  getCustomerOrder,
  getOrderTracking,
  listCustomerOrders,
  canTransition,
  ORDER_STATUS_TRANSITIONS,
  calculateAmountAfterCategoryDiscount,
  calculateFinalProductAmount,
  enforceMinimumOrder
};