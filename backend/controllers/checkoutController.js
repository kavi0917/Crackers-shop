/* ============================================================
   VENDHAN CRACKERS — Checkout Controllers
   ============================================================ */

const checkoutService = require('../services/checkoutService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/checkout/validate
 * Validate the cart and return a calculated checkout summary.
 */
const validateCheckout = asyncHandler(async (req, res) => {
  const summary = await checkoutService.validateCheckout(req.user._id, req.body);

  res.json({
    success: true,
    message: 'Checkout validated successfully',
    data: summary
  });
});

/**
 * POST /api/checkout
 * Create an order from the user's cart.
 */
const createOrder = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body;
  const result = await checkoutService.createOrder(req.user._id, req.body, paymentMethod);

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    data: {
      orderId: result.orderId,
      order: result.order,
      pricing: result.pricing
    }
  });
});

module.exports = {
  validateCheckout,
  createOrder
};