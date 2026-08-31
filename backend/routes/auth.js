/* ============================================================
   VENDHAN CRACKERS — Customer Auth Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');
const { customerAuthLimiter } = require('../middleware/rateLimiter');
const { validateRegister, validateLogin } = require('../validators/authValidators');
const validateResult = require('../validators/validateResult');

/* POST /api/auth/register — dedicated customer auth limiter (20 / 15 min) */
router.post('/register', customerAuthLimiter, validateRegister, validateResult, authController.register);

/* POST /api/auth/login — dedicated customer auth limiter (20 / 15 min) */
router.post('/login', customerAuthLimiter, validateLogin, validateResult, authController.login);

/* GET /api/auth/me — customer only */
router.get('/me', authenticateUser, authController.getMe);

/* POST /api/auth/logout — customer only */
router.post('/logout', authenticateUser, authController.logout);

module.exports = router;