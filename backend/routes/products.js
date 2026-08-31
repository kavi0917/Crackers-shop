/* ============================================================
   VENDHAN CRACKERS — Product Routes (Public)
   ============================================================ */

const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const { validateProductId } = require('../validators/productValidators');
const { validateProductIdParam, validateCreateReview } = require('../validators/reviewValidators');
const { authenticateUser } = require('../middleware/auth');
const validateResult = require('../validators/validateResult');

/* GET /api/products — list with filters, sort, pagination */
router.get('/', productController.listProducts);

/* GET /api/products/slug/:slug — must be defined before /:id */
router.get('/slug/:slug', productController.getProductBySlug);

/* GET /api/products/:productId/reviews — public reviews for a product */
router.get('/:productId/reviews', validateProductIdParam, validateResult, reviewController.listProductReviews);

/* POST /api/products/:productId/reviews — authenticated customer */
router.post(
  '/:productId/reviews',
  authenticateUser,
  validateProductIdParam,
  validateCreateReview,
  validateResult,
  reviewController.createReview
);

/* GET /api/products/:id/related — related products from same category */
router.get('/:id/related', validateProductId, validateResult, productController.getRelatedProducts);

/* GET /api/products/:id */
router.get('/:id', validateProductId, validateResult, productController.getProduct);

module.exports = router;
