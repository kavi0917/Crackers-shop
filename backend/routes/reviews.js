/* ============================================================
   VENDHAN CRACKERS — Review Routes (Customer)
   ============================================================ */

const express = require('express');
const router = express.Router();

const reviewController = require('../controllers/reviewController');
const { authenticateUser } = require('../middleware/auth');
const { validateReviewId, validateUpdateReview } = require('../validators/reviewValidators');
const validateResult = require('../validators/validateResult');

/* PUT /api/reviews/:id — update own review (authenticated) */
router.put(
  '/:id',
  authenticateUser,
  validateReviewId,
  validateUpdateReview,
  validateResult,
  reviewController.updateReview
);

/* DELETE /api/reviews/:id — delete own review (authenticated) */
router.delete(
  '/:id',
  authenticateUser,
  validateReviewId,
  validateResult,
  reviewController.deleteReview
);

module.exports = router;