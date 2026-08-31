/* ============================================================
   VENDHAN CRACKERS — Admin Review Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const adminReviewController = require('../controllers/adminReviewController');
const { authenticateAdmin } = require('../middleware/auth');
const { validateReviewId } = require('../validators/reviewValidators');
const validateResult = require('../validators/validateResult');

/* All admin review routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/reviews — list with search, status filter, pagination */
router.get('/', adminReviewController.listReviews);

/* GET /api/admin/reviews/:id */
router.get('/:id', validateReviewId, validateResult, adminReviewController.getReview);

/* DELETE /api/admin/reviews/:id — hide (default) or ?permanent=true */
router.delete('/:id', validateReviewId, validateResult, adminReviewController.deleteReview);

module.exports = router;