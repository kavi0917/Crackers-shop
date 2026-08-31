/* ============================================================
   VENDHAN CRACKERS — Cart Routes (Customer)
   ============================================================ */

const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController');
const { authenticateUser } = require('../middleware/auth');
const {
  validateAddToCart,
  validateUpdateCartItem,
  validateRemoveCartItem
} = require('../validators/cartValidators');
const validateResult = require('../validators/validateResult');

/* All cart routes require customer authentication */
router.use(authenticateUser);

/* GET /api/cart */
router.get('/', cartController.getCart);

/* POST /api/cart/items */
router.post('/items', validateAddToCart, validateResult, cartController.addToCart);

/* PUT /api/cart/items/:productId */
router.put('/items/:productId', validateUpdateCartItem, validateResult, cartController.updateCartItem);

/* DELETE /api/cart/items/:productId */
router.delete('/items/:productId', validateRemoveCartItem, validateResult, cartController.removeCartItem);

/* DELETE /api/cart */
router.delete('/', cartController.clearCart);

module.exports = router;