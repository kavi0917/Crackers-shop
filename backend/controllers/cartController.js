/* ============================================================
   VENDHAN CRACKERS — Cart Controllers
   ============================================================ */

const cartService = require('../services/cartService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/cart
 * Return the authenticated user's cart.
 */
const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.loadCart(req.user._id);

  res.json({
    success: true,
    message: 'Cart retrieved successfully',
    data: cart
  });
});

/**
 * POST /api/cart/items
 * Add a product to the cart.
 */
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  const cart = await cartService.addToCart(req.user._id, { productId, quantity });

  res.json({
    success: true,
    message: 'Item added to cart successfully',
    data: cart
  });
});

/**
 * PUT /api/cart/items/:productId
 * Update the quantity of a cart item.
 */
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  const cart = await cartService.updateCartItem(req.user._id, req.params.productId, { quantity });

  res.json({
    success: true,
    message: 'Cart item updated successfully',
    data: cart
  });
});

/**
 * DELETE /api/cart/items/:productId
 * Remove an item from the cart.
 */
const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await cartService.removeCartItem(req.user._id, req.params.productId);

  res.json({
    success: true,
    message: 'Item removed from cart successfully',
    data: cart
  });
});

/**
 * DELETE /api/cart
 * Clear all items from the cart.
 */
const clearCart = asyncHandler(async (req, res) => {
  const cart = await cartService.clearCart(req.user._id);

  res.json({
    success: true,
    message: 'Cart cleared successfully',
    data: cart
  });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};