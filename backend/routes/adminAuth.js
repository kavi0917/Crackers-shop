/* ============================================================
   VENDHAN CRACKERS — Admin Auth Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const adminAuthController = require('../controllers/adminAuthController');
const { authenticateAdmin } = require('../middleware/auth');
const { adminAuthLimiter } = require('../middleware/rateLimiter');
const { validateAdminLogin } = require('../validators/authValidators');
const validateResult = require('../validators/validateResult');

/* POST /api/admin/auth/login — dedicated admin auth limiter (20 / 15 min, independent bucket) */
router.post('/login', adminAuthLimiter, validateAdminLogin, validateResult, adminAuthController.adminLogin);

/* GET /api/admin/auth/me — admin only */
router.get('/me', authenticateAdmin, adminAuthController.adminGetMe);

module.exports = router;