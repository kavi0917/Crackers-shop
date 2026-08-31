/* ============================================================
   VENDHAN CRACKERS — Auth Controllers
   ============================================================ */

const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/auth/register
 * Register a new customer.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, customerType } = req.body;

  const { user, token } = await authService.registerCustomer({ name, email, phone, password, customerType });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: { user, token }
  });
});

/**
 * POST /api/auth/login
 * Login an existing customer.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { user, token } = await authService.loginCustomer({ email, password });

  res.json({
    success: true,
    message: 'Login successful',
    data: { user, token }
  });
});

/**
 * GET /api/auth/me
 * Return the currently authenticated customer.
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id);

  res.json({
    success: true,
    message: 'User retrieved successfully',
    data: { user }
  });
});

/**
 * POST /api/auth/logout
 * Logout customer. JWT is stateless — server cannot invalidate the token.
 * The client should clear the stored token.
 */
const logout = asyncHandler(async (req, res) => {
  const result = await authService.logoutCustomer();

  res.json({
    success: true,
    message: 'Logged out successfully. Please clear your token on the client.',
    data: result
  });
});

module.exports = { register, login, getMe, logout };