/* ============================================================
   VENDHAN CRACKERS — Cart Service
   ============================================================ */

const { Cart, Product, Combo, Category, User, Setting } = require('../models');
const ApiError = require('../utils/ApiError');
const calculateProductPricing = require('../utils/calculateProductPricing');
const { MINIMUM_ONLINE_ORDER_AMOUNT } = require('../utils/minimumOrder');
const { getLoyaltyDiscount } = require('../utils/loyaltyDiscount');
const {
  CUSTOMER_TYPES,
  WHOLESALE_MIN_ORDER_AMOUNT,
  isWholesaleMinimumOrderMet,
  calculateWholesaleDiscount
} = require('../utils/wholesale');
const {
  REFERRAL_DISCOUNT_PERCENT,
  getActiveCustomerReferral
} = require('../utils/reseller');

/**
 * Get or create a cart for a user.
 */
async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

/**
 * Load the cart with authoritative current product/combo data from MongoDB.
 * Never trust client-provided prices, names, or discounts.
 */
async function loadCart(userId) {
  const cart = await getOrCreateCart(userId);

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

  // Determine active reseller referral (retail only). Referral discount is
  // 3% applied AFTER category + loyalty. Wholesale customers never get it.
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

  // Separate product and combo items
  const productItems = cart.items.filter((item) => item.itemType !== 'COMBO');
  const comboItems = cart.items.filter((item) => item.itemType === 'COMBO');

  // Fetch current product data for product items
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

  // Fetch current combo data for combo items
  const comboIds = comboItems.map((item) => item.combo);
  const combos = await Combo.find({ _id: { $in: comboIds } });
  const comboMap = {};
  combos.forEach((c) => {
    comboMap[c._id.toString()] = c;
  });

  // Build cart items with authoritative data
  const items = [];

  // --- Product items ---
  for (const cartItem of productItems) {
    const product = productMap[cartItem.product.toString()];

    // Product deleted or no longer exists
    if (!product) {
      // Skip items whose product no longer exists — they will be cleaned up on save
      continue;
    }

    // Product became inactive — mark it, but still include with current data
    // so the frontend can show an "unavailable" state
    const category = categoryMap[product.category ? product.category.toString() : ''];
    const categoryDiscount = category ? (category.discount || 0) : 0;
    // Stored model: originalPrice = admin-entered original, price = selling,
    // discount = category discount. Use originalPrice as the pricing base so the
    // derived selling price matches the stored selling price (no double discount).
    const storedOriginal = (typeof product.originalPrice === 'number' && !Number.isNaN(product.originalPrice) && product.originalPrice > 0)
      ? product.originalPrice
      : product.price;
    const pricing = calculateProductPricing(storedOriginal, categoryDiscount, secondOrderDiscountPercent, membershipDiscountPercent, referralDiscountPercent);

    // Unit price AFTER the per-product category discount but BEFORE any order-level
    // discount (second-order / membership / referral). This is the Subtotal basis:
    // order-level discounts are applied ON TOP of it, never embedded + shown twice.
    const priceAfterCategory = Math.round((pricing.originalPrice - pricing.discountAmount) * 100) / 100;

    items.push({
      itemType: 'PRODUCT',
      productId: product._id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      image: product.images && product.images.length > 0 ? product.images[0] : null,
      images: product.images || [],
      price: pricing.finalPrice,
      afterCategoryPrice: priceAfterCategory,
      afterCategorySubtotal: Math.round(priceAfterCategory * cartItem.quantity * 100) / 100,
      originalPrice: pricing.originalPrice,
      discount: pricing.discountPercent,
      discountAmount: pricing.discountAmount,
      categoryDiscount: categoryDiscount,
      secondOrderDiscountPercent: pricing.secondOrderDiscountPercent,
      secondOrderDiscountAmount: pricing.secondOrderDiscountAmount,
      membershipTier,
      membershipDiscountPercent: pricing.membershipDiscountPercent,
      membershipDiscountAmount: pricing.membershipDiscountAmount,
      referralDiscountPercent: pricing.referralDiscountPercent,
      referralDiscountAmount: pricing.referralDiscountAmount,
      quantity: cartItem.quantity,
      subtotal: Math.round(pricing.finalPrice * cartItem.quantity * 100) / 100,
      stock: product.stock,
      reorderLevel: product.reorderLevel,
      stockStatus: product.stockStatus,
      status: product.status
    });
  }

  // --- Combo items ---
  for (const cartItem of comboItems) {
    const combo = comboMap[cartItem.combo.toString()];

    // Combo deleted or no longer exists
    if (!combo) {
      continue;
    }

    // Fetch combo product details for display. Use the customer's customized
    // snapshot when present (slot count/quantities are admin-controlled);
    // fall back to the combo's current contents for non-customized combos.
    const comboSlots =
      cartItem.comboItems && cartItem.comboItems.length > 0 ? cartItem.comboItems : combo.items;
    const comboProductIds = comboSlots.map((ci) => ci.product);
    const comboProducts = await Product.find({ _id: { $in: comboProductIds } });
    const comboProductMap = {};
    comboProducts.forEach((p) => {
      comboProductMap[p._id.toString()] = p;
    });

    const comboItemDetails = comboSlots.map((ci) => {
      const p = comboProductMap[ci.product.toString()];
      return {
        productId: ci.product,
        name: p ? p.name : 'Unknown product',
        quantity: ci.quantity,
        price: p ? p.price : 0,
        available: !!(p && p.status === 'active')
      };
    });

    // Recalculate combo price from DB (with discount applied)
    const discountAmount = Math.round((combo.price * combo.discount) / 100 * 100) / 100;
    const finalPrice = Math.round((combo.price - discountAmount) * 100) / 100;

    items.push({
      itemType: 'COMBO',
      comboId: combo._id,
      name: combo.name,
      description: combo.description,
      image: combo.image,
      price: finalPrice,
      afterCategoryPrice: finalPrice,
      afterCategorySubtotal: Math.round(finalPrice * cartItem.quantity * 100) / 100,
      quantity: cartItem.quantity,
      subtotal: Math.round(finalPrice * cartItem.quantity * 100) / 100,
      comboItems: comboItemDetails,
      status: combo.status
    });
  }

  // Calculate cart totals — the Subtotal is the amount AFTER the per-product
  // category discount but BEFORE any order-level discount (second-order,
  // membership, referral, wholesale). This is the SAME basis the backend uses
  // for the customer-type specific minimum-order checks and wholesale tier.
  // Order-level discounts are applied below to derive the Grand Total.
  const subtotal = Math.round(
    items.reduce((sum, item) => {
      const perUnit = item.originalPrice != null && item.discountAmount != null
        ? item.originalPrice - item.discountAmount
        : item.price;
      return sum + perUnit * item.quantity;
    }, 0) * 100
  ) / 100;
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Aggregate second-order discount info for display
  const secondOrderDiscountAmount = Math.round(
    items.reduce((sum, item) => sum + (item.secondOrderDiscountAmount || 0) * item.quantity, 0) * 100
  ) / 100;

  // Aggregate membership discount info for display
  const membershipDiscountAmount = Math.round(
    items.reduce((sum, item) => sum + (item.membershipDiscountAmount || 0) * item.quantity, 0) * 100
  ) / 100;

  // Aggregate referral discount info for display (retail referred customers only)
  const referralDiscountAmount = Math.round(
    items.reduce((sum, item) => sum + (item.referralDiscountAmount || 0) * item.quantity, 0) * 100
  ) / 100;

  // --- Wholesale pricing ---
  // For wholesale customers, calculate the amount after category discount
  // and apply the wholesale tier discount. Wholesale eligibility is based on
  // the order/cart AMOUNT (not quantity).
  let wholesaleTier = null;
  let wholesaleDiscountPercent = 0;
  let wholesaleDiscountAmount = 0;
  let wholesaleMinAmountMet = false;

  if (customerType === CUSTOMER_TYPES.WHOLESALE) {
    // Amount after category discount = sum of (originalPrice - discountAmount) * quantity
    // This is the applicable wholesale order/cart amount (same basis the
    // wholesale discount tier and the checkout validator use).
    const amountAfterCategoryDiscount = Math.round(
      items.reduce((sum, item) => {
        const perUnit = item.originalPrice != null && item.discountAmount != null
          ? item.originalPrice - item.discountAmount
          : item.price;
        return sum + perUnit * item.quantity;
      }, 0) * 100
    ) / 100;

    wholesaleMinAmountMet = isWholesaleMinimumOrderMet(amountAfterCategoryDiscount);

    const wholesale = calculateWholesaleDiscount(amountAfterCategoryDiscount);
    wholesaleTier = wholesale.tier;
    wholesaleDiscountPercent = wholesale.discountPercent;
    wholesaleDiscountAmount = wholesale.discountAmount;
  }

  // Minimum ORDER AMOUNT resolved to the logged-in customer's type — the single
  // authoritative value both the Cart and Checkout pages display:
  //   Retail    -> ₹2,000  from Shop Settings (Setting.minimumOrderAmount)
  //   Wholesale -> ₹50,000 from WHOLESALE_MIN_ORDER_AMOUNT (single constant)
  const settingsDoc = await Setting.getSettings();
  const minimumOrderAmount = customerType === CUSTOMER_TYPES.WHOLESALE
    ? WHOLESALE_MIN_ORDER_AMOUNT
    : (settingsDoc.minimumOrderAmount != null ? Number(settingsDoc.minimumOrderAmount) : MINIMUM_ONLINE_ORDER_AMOUNT);

  // Order-level pricing summary from the backend (authoritative — the frontend
  // must display these values, not recalculate them).
  //   * The Subtotal is the amount AFTER the per-product category discount.
  //   * Retail order-level discounts (second-order OR membership — mutually
  //     exclusive — plus referral) are applied ON TOP of that Subtotal and each
  //     one is subtracted to derive the Grand Total. They are never embedded
  //     into the Subtotal AND shown again as a separate row.
  //   * The wholesale discount is an ORDER-LEVEL discount computed on the amount
  //     AFTER category discount and subtracted in `total` exactly the same way.
  // Delivery charge follows the exact same rule as calculatePricing.js:
  // free above the Settings free-delivery threshold, otherwise the flat charge.
  const freeDeliveryThreshold = Number(settingsDoc.freeDeliveryThreshold) || 1000;
  const deliveryCharge = subtotal >= freeDeliveryThreshold ? 0 : (Number(settingsDoc.deliveryCharge) || 0);
  const discount = customerType === CUSTOMER_TYPES.WHOLESALE
    ? wholesaleDiscountAmount
    : Math.round((secondOrderDiscountAmount + membershipDiscountAmount + referralDiscountAmount) * 100) / 100;
  const total = Math.round((subtotal - discount + deliveryCharge) * 100) / 100;

  return {
    items,
    subtotal,
    discount,
    deliveryCharge,
    total,
    totalItemCount,
    customerType,
    minimumOrderAmount,
    secondOrderDiscountPercent,
    secondOrderDiscountAmount,
    membershipTier,
    membershipDiscountPercent,
    membershipDiscountAmount,
    referralCode,
    referredByReseller,
    referralDiscountPercent,
    referralDiscountAmount,
    wholesaleTier,
    wholesaleDiscountPercent,
    wholesaleDiscountAmount,
    wholesaleMinAmountMet,
    wholesaleMinAmount: WHOLESALE_MIN_ORDER_AMOUNT
  };
}

/**
 * Add a product to the user's cart.
 * Validates: product exists, is active, has stock, quantity within stock,
 * and prevents quantity exceeding stock; increments if already in cart.
 */
async function addToCart(userId, { productId, quantity = 1 }) {
  const qty = parseInt(quantity, 10) || 1;
  if (qty < 1) {
    throw new ApiError(400, 'Quantity must be at least 1', ['Invalid quantity']);
  }

  // Validate product exists and is active
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found', ['Product does not exist']);
  }
  if (product.status !== 'active') {
    throw new ApiError(400, 'This product is currently unavailable', ['Product is inactive']);
  }
  if (product.stock === 0) {
    throw new ApiError(409, 'This product is out of stock', ['Out of stock']);
  }

  const cart = await getOrCreateCart(userId);

  // Check if product already in cart (product items only — combo items have product = null)
  const existingItem = cart.items.find((item) => item.itemType !== 'COMBO' && item.product && item.product.toString() === productId);

  if (existingItem) {
    // Increase quantity, but never exceed stock
    const newQty = existingItem.quantity + qty;
    if (newQty > product.stock) {
      throw new ApiError(409, `Only ${product.stock} units available in stock`, ['Quantity exceeds available stock']);
    }
    existingItem.quantity = newQty;
  } else {
    // New item — ensure qty doesn't exceed stock
    if (qty > product.stock) {
      throw new ApiError(409, `Only ${product.stock} units available in stock`, ['Quantity exceeds available stock']);
    }
    cart.items.push({
      itemType: 'PRODUCT',
      product: productId,
      name: product.name,
      productName: product.name,
      price: product.price,
      quantity: qty
    });
  }

  await cart.save();
  return loadCart(userId);
}

/**
 * Update a cart item's quantity.
 * Supports both PRODUCT items (by product ID) and COMBO items (by combo ID).
 */
async function updateCartItem(userId, itemId, { quantity }) {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 1) {
    throw new ApiError(400, 'Quantity must be at least 1', ['Invalid quantity']);
  }

  const cart = await getOrCreateCart(userId);

  // Find the item — could be a PRODUCT (by product ID) or COMBO (by combo ID)
  const item = cart.items.find(
    (i) =>
      (i.itemType !== 'COMBO' && i.product && i.product.toString() === itemId) ||
      (i.itemType === 'COMBO' && i.combo && i.combo.toString() === itemId)
  );

  if (!item) {
    throw new ApiError(404, 'Item not found in cart', ['Item is not in the cart']);
  }

  if (item.itemType === 'COMBO') {
    // --- Combo item: validate combo and stock for all underlying products ---
    const combo = await Combo.findById(item.combo);
    if (!combo) {
      throw new ApiError(404, 'Combo not found', ['Combo does not exist']);
    }
    if (combo.status !== 'active') {
      throw new ApiError(400, 'This combo is currently unavailable', ['Combo is inactive']);
    }
    if (combo.items.length === 0) {
      throw new ApiError(400, 'This combo has no products', ['Combo is empty']);
    }

    // Check stock for every product in the combo. Use the customer's customized
    // snapshot when present; fall back to the combo defaults otherwise.
    const comboSlots =
      item.comboItems && item.comboItems.length > 0 ? item.comboItems : combo.items;
    const comboProductIds = comboSlots.map((ci) => ci.product);
    const comboProducts = await Product.find({ _id: { $in: comboProductIds } });
    const comboProductMap = {};
    comboProducts.forEach((p) => {
      comboProductMap[p._id.toString()] = p;
    });

    for (const comboItem of comboSlots) {
      const product = comboProductMap[comboItem.product.toString()];
      if (!product) {
        throw new ApiError(400, 'A product in this combo is no longer available', ['Combo contains unavailable products']);
      }
      if (product.status !== 'active') {
        throw new ApiError(400, `${product.name} is currently unavailable`, ['Combo product is inactive']);
      }
      const requiredQty = comboItem.quantity * qty;
      if (product.stock === 0) {
        throw new ApiError(409, `${product.name} is out of stock`, ['Combo item out of stock']);
      }
      if (requiredQty > product.stock) {
        throw new ApiError(409, `Only ${product.stock} units of ${product.name} are available in stock`, ['Insufficient stock for combo item']);
      }
    }

    // Use DB combo price (with discount applied) — never trust frontend prices
    const discountAmount = Math.round((combo.price * combo.discount) / 100 * 100) / 100;
    const finalPrice = Math.round((combo.price - discountAmount) * 100) / 100;
    item.price = finalPrice;
    item.quantity = qty;
  } else {
    // --- Product item: validate product and stock ---
    const product = await Product.findById(itemId);
    if (!product) {
      throw new ApiError(404, 'Product not found', ['Product does not exist']);
    }
    if (product.status !== 'active') {
      throw new ApiError(400, 'This product is currently unavailable', ['Product is inactive']);
    }
    if (qty > product.stock) {
      throw new ApiError(409, `Only ${product.stock} units available in stock`, ['Quantity exceeds available stock']);
    }

    item.quantity = qty;
  }

  await cart.save();

  return loadCart(userId);
}

/**
 * Remove an item from the user's cart.
 * Supports both PRODUCT items (by product ID) and COMBO items (by combo ID).
 */
async function removeCartItem(userId, itemId) {
  const cart = await getOrCreateCart(userId);

  const itemExists = cart.items.some(
    (i) =>
      (i.itemType !== 'COMBO' && i.product && i.product.toString() === itemId) ||
      (i.itemType === 'COMBO' && i.combo && i.combo.toString() === itemId)
  );
  if (!itemExists) {
    throw new ApiError(404, 'Item not found in cart', ['Item is not in the cart']);
  }

  cart.items = cart.items.filter(
    (i) =>
      !(
        (i.itemType !== 'COMBO' && i.product && i.product.toString() === itemId) ||
        (i.itemType === 'COMBO' && i.combo && i.combo.toString() === itemId)
      )
  );
  await cart.save();

  return loadCart(userId);
}

/**
 * Clear the user's cart.
 */
async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);
  cart.items = [];
  await cart.save();

  return loadCart(userId);
}

module.exports = {
  getOrCreateCart,
  loadCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};