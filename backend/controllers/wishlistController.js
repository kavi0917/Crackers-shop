/* ============================================================
   VENDHAN CRACKERS — Wishlist Controllers (Customer)
   ============================================================ */

const wishlistService = require('../services/wishlistService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/wishlist
 * Return the authenticated user's wishlist with current product data.
 */
const getWishlist = asyncHandler(async (req, res) => {
  const data = await wishlistService.getWishlist(req.user._id);

  res.json({
    success: true,
    message: 'Wishlist retrieved successfully',
    data
  });
});

/**
 * POST /api/wishlist
 * Add a product to the authenticated user's wishlist.
 */
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const item = await wishlistService.addToWishlist(req.user._id, productId);

  res.status(201).json({
    success: true,
    message: 'Product added to wishlist successfully',
    data: { item }
  });
});

/**
 * DELETE /api/wishlist/:productId
 * Remove a product from the authenticated user's wishlist.
 */
const removeFromWishlist = asyncHandler(async (req, res) => {
  const result = await wishlistService.removeFromWishlist(req.user._id, req.params.productId);

  res.json({
    success: true,
    message: 'Product removed from wishlist successfully',
    data: result
  });
});

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist
};