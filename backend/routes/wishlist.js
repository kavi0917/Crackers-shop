/* ============================================================
   VENDHAN CRACKERS — Wishlist Routes (Customer)
   ============================================================ */

const express = require('express');
const router = express.Router();

const wishlistController = require('../controllers/wishlistController');
const { authenticateUser } = require('../middleware/auth');
const {
  validateAddToWishlist,
  validateRemoveWishlistItem
} = require('../validators/wishlistValidators');
const validateResult = require('../validators/validateResult');

/* All wishlist routes require customer authentication */
router.use(authenticateUser);

/* GET /api/wishlist */
router.get('/', wishlistController.getWishlist);

/* POST /api/wishlist */
router.post('/', validateAddToWishlist, validateResult, wishlistController.addToWishlist);

/* DELETE /api/wishlist/:productId */
router.delete('/:productId', validateRemoveWishlistItem, validateResult, wishlistController.removeFromWishlist);

module.exports = router;