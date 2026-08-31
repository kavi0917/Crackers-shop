/* ============================================================
   VENDHAN CRACKERS — Combo Service
   ============================================================ */

const { Combo, Product, Cart } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate');

/**
 * Validate that a combo exists and is active.
 * Returns the combo document.
 */
async function getActiveCombo(comboId) {
  const combo = await Combo.findOne({ _id: comboId, status: 'active' });
  if (!combo) {
    throw new ApiError(404, 'Combo not found', ['Combo does not exist or is inactive']);
  }
  return combo;
}

/**
 * Load combo items with authoritative product data.
 * Returns { combo, items } where items are enriched with product info.
 * Throws ApiError if any included product is missing or inactive.
 */
async function loadComboItems(combo) {
  const productIds = combo.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = {};
  products.forEach((p) => {
    productMap[p._id.toString()] = p;
  });

  const items = [];
  const unavailable = [];
  for (const comboItem of combo.items) {
    const product = productMap[comboItem.product.toString()];

    if (!product || product.status !== 'active') {
      unavailable.push({
        productId: comboItem.product,
        quantity: comboItem.quantity,
        reason: !product ? 'Product no longer exists' : 'Product is inactive'
      });
      continue;
    }

    items.push({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      image: product.images && product.images.length > 0 ? product.images[0] : null,
      price: product.price,
      quantity: comboItem.quantity,
      subtotal: Math.round(product.price * comboItem.quantity * 100) / 100,
      stock: product.stock,
      stockStatus: product.stockStatus,
      status: product.status
    });
  }

  return { combo, items, unavailable };
}

/**
 * Build a public combo response object with product details and pricing.
 */
function buildComboResponse(combo, items, unavailable = []) {
  const itemTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = Math.round((combo.price * combo.discount) / 100 * 100) / 100;
  const finalPrice = Math.round((combo.price - discountAmount) * 100) / 100;

  return {
    id: combo._id,
    name: combo.name,
    price: combo.price,
    discount: combo.discount,
    finalPrice,
    description: combo.description,
    image: combo.image,
    status: combo.status,
    items,
    itemTotal: Math.round(itemTotal * 100) / 100,
    savings: Math.round((itemTotal - finalPrice) * 100) / 100,
    unavailable,
    createdAt: combo.createdAt,
    updatedAt: combo.updatedAt
  };
}

/**
 * Public: List active combos.
 */
async function listActiveCombos(query) {
  const { page, limit, skip } = paginate(query, { defaultLimit: 12, maxLimit: 50 });

  const filter = { status: 'active' };
  const total = await Combo.countDocuments(filter);
  const combos = await Combo.find(filter)
    .sort({ price: 1 })
    .skip(skip)
    .limit(limit);

  const mapped = [];
  for (const combo of combos) {
    const { items } = await loadComboItems(combo);
    mapped.push(buildComboResponse(combo, items));
  }

  return { combos: mapped, total, page, limit };
}

/**
 * Public: Get a single active combo with full details.
 */
async function getComboById(comboId) {
  const combo = await getActiveCombo(comboId);
  const { items, unavailable } = await loadComboItems(combo);
  return buildComboResponse(combo, items, unavailable);
}

/**
 * Admin: List all combos (including inactive) with pagination.
 */
async function listCombosAdmin(query) {
  const { page, limit, skip } = paginate(query, { defaultLimit: 12, maxLimit: 50 });

  const filter = {};
  if (query.status) {
    if (!['active', 'inactive'].includes(query.status)) {
      throw new ApiError(400, 'Invalid status filter', ['status must be active or inactive']);
    }
    filter.status = query.status;
  }
  if (query.search) {
    const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.name = searchRegex;
  }

  const total = await Combo.countDocuments(filter);
  const combos = await Combo.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const mapped = [];
  for (const combo of combos) {
    const { items, unavailable } = await loadComboItems(combo);
    mapped.push(buildComboResponse(combo, items, unavailable));
  }

  return { combos: mapped, total, page, limit };
}

/**
 * Admin: Get a single combo by id (including inactive).
 */
async function getComboByIdAdmin(comboId) {
  const combo = await Combo.findById(comboId);
  if (!combo) {
    throw new ApiError(404, 'Combo not found', ['Combo does not exist']);
  }
  const { items, unavailable } = await loadComboItems(combo);
  return buildComboResponse(combo, items, unavailable);
}

/**
 * Validate combo items: product IDs valid, quantities > 0, no duplicates.
 * Returns normalized items array.
 */
async function validateComboItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'A combo must contain at least one product', ['At least one product is required']);
  }

  const seen = new Set();
  const normalized = [];

  for (const item of items) {
    if (!item || !item.product) {
      throw new ApiError(400, 'Each combo item must include a product ID', ['Invalid combo item']);
    }
    if (!item.product.match(/^[0-9a-fA-F]{24}$/)) {
      throw new ApiError(400, 'Invalid product ID in combo', ['Product must be a valid ObjectId']);
    }
    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty < 1) {
      throw new ApiError(400, 'Combo item quantity must be at least 1', ['Invalid quantity']);
    }

    const productKey = item.product.toString();
    if (seen.has(productKey)) {
      throw new ApiError(400, 'Duplicate products are not allowed in a combo', ['Duplicate product in combo']);
    }
    seen.add(productKey);

    // Verify the product exists
    const product = await Product.findById(item.product);
    if (!product) {
      throw new ApiError(400, `Product ${item.product} does not exist`, ['Invalid product in combo']);
    }

    normalized.push({ product: item.product, quantity: qty });
  }

  return normalized;
}

/**
 * Admin: Create a new combo.
 */
async function createCombo(data) {
  const items = await validateComboItems(data.items);

  const combo = await Combo.create({
    name: data.name,
    price: data.price,
    description: data.description || null,
    image: data.image || null,
    items,
    discount: data.discount !== undefined ? data.discount : 0,
    status: data.status || 'active'
  });

  return combo;
}

/**
 * Admin: Update an existing combo.
 */
async function updateCombo(comboId, data) {
  const combo = await Combo.findById(comboId);
  if (!combo) {
    throw new ApiError(404, 'Combo not found', ['Combo does not exist']);
  }

  if (data.name !== undefined) combo.name = data.name;
  if (data.price !== undefined) combo.price = data.price;
  if (data.description !== undefined) combo.description = data.description;
  if (data.image !== undefined) combo.image = data.image;
  if (data.discount !== undefined) combo.discount = data.discount;
  if (data.status !== undefined) {
    if (!['active', 'inactive'].includes(data.status)) {
      throw new ApiError(400, 'Invalid status', ['status must be active or inactive']);
    }
    combo.status = data.status;
  }
  if (data.items !== undefined) {
    const items = await validateComboItems(data.items);
    combo.items = items;
  }

  await combo.save();
  return combo;
}

/**
 * Admin: Delete/deactivate a combo.
 * Prefers deactivation over permanent deletion to preserve historical usage.
 */
async function deleteCombo(comboId) {
  const combo = await Combo.findById(comboId);
  if (!combo) {
    throw new ApiError(404, 'Combo not found', ['Combo does not exist']);
  }

  // Prefer deactivation for safety
  combo.status = 'inactive';
  await combo.save();

  return { deleted: false, deactivated: true, message: 'Combo deactivated successfully' };
}

/**
 * Add a combo to the customer's cart.
 *
 * Validates: the combo exists and is active, the number of slots matches the
 * admin-defined combo, every selected product exists and is active, and there is
 * sufficient stock for every selected product.
 *
 * Allows PRODUCT-SELECTION-ONLY customization: when `customProducts` is provided
 * it carries the customer's chosen product id for each combo slot. The slot
 * count and per-slot quantities ALWAYS come from the admin-defined combo — the
 * customer may swap the product within a slot but cannot change the price,
 * slots, or quantities. Uses the database combo price — never trusts
 * client-provided prices.
 */
async function addComboToCart(userId, comboId, customProducts = null) {
  // Inactive/missing combos are rejected here — backend is the final authority.
  const combo = await getActiveCombo(comboId);
  if (combo.items.length === 0) {
    throw new ApiError(400, 'This combo has no products', ['Combo is empty']);
  }

  const slots = combo.items;
  let selections;

  if (customProducts) {
    // ---- Customized path: PRODUCT SELECTION ONLY ----
    if (!Array.isArray(customProducts) || customProducts.length === 0) {
      throw new ApiError(400, 'Please choose a product for every slot', ['Combo customization is required']);
    }
    if (customProducts.length !== slots.length) {
      throw new ApiError(400, `Please choose a product for each of the ${slots.length} slots`, ['Combo slot count mismatch']);
    }

    const rawIds = customProducts.map((s) => (s && s.product ? s.product : s));
    const invalidId = rawIds.some((id) => !id || !/^[0-9a-fA-F]{24}$/.test(String(id)));
    if (invalidId) {
      throw new ApiError(400, 'Invalid product selection', ['Invalid product ID in customized combo']);
    }

    const products = await Product.find({ _id: { $in: rawIds } });
    const productMap = {};
    products.forEach((p) => {
      productMap[p._id.toString()] = p;
    });

    selections = slots.map((slot, i) => {
      const pid = String(rawIds[i]);
      const product = productMap[pid];

      if (!product) {
        throw new ApiError(400, `A product in slot ${i + 1} is no longer available`, ['Combo contains unavailable products']);
      }
      if (product.status !== 'active') {
        throw new ApiError(400, `${product.name} is currently unavailable. Please choose another product.`, ['Product is inactive']);
      }
      if (product.stock === 0) {
        throw new ApiError(409, `${product.name} is out of stock. Please choose another product.`, ['Combo item out of stock']);
      }
      if (slot.quantity > product.stock) {
        throw new ApiError(409, `Only ${product.stock} units of ${product.name} are available in stock. Please choose another product.`, ['Insufficient stock for combo item']);
      }

      return {
        productId: product._id,
        name: product.name,
        quantity: slot.quantity, // Admin-defined quantity — customer cannot modify
        price: product.price
      };
    });
  } else {
    // ---- Default path: use the admin-defined combo items ----
    const { items, unavailable } = await loadComboItems(combo);
    if (unavailable.length > 0) {
      throw new ApiError(400, 'A product in this combo is no longer available', ['Combo contains unavailable products']);
    }

    for (const item of items) {
      if (item.stock === 0) {
        throw new ApiError(409, `${item.name} is out of stock`, ['Combo item out of stock']);
      }
      if (item.quantity > item.stock) {
        throw new ApiError(409, `Only ${item.stock} units of ${item.name} are available in stock`, ['Insufficient stock for combo item']);
      }
    }

    selections = items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }));
  }

  // Calculate combo price from DB (with discount applied) — never client price
  const discountAmount = Math.round((combo.price * combo.discount) / 100 * 100) / 100;
  const finalPrice = Math.round((combo.price - discountAmount) * 100) / 100;

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(404, 'Cart not found. Please login again.', ['Cart does not exist']);
  }

  // Snapshot the customized selections so cart/checkout preserve them.
  const comboSnapshot = selections.map((s) => ({ product: s.productId, quantity: s.quantity }));

  // Check if this combo is already in the cart
  const existingItem = cart.items.find(
    (item) => item.itemType === 'COMBO' && item.combo && item.combo.toString() === comboId
  );

  if (existingItem) {
    existingItem.quantity += 1;
    existingItem.comboItems = comboSnapshot;
  } else {
    cart.items.push({
      itemType: 'COMBO',
      combo: combo._id,
      name: combo.name,
      price: finalPrice,
      quantity: 1,
      comboItems: comboSnapshot
    });
  }

  await cart.save();
  return cart;
}

module.exports = {
  listActiveCombos,
  getComboById,
  listCombosAdmin,
  getComboByIdAdmin,
  createCombo,
  updateCombo,
  deleteCombo,
  addComboToCart,
  validateComboItems,
  buildComboResponse
};