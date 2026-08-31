/* ============================================================
   VENDHAN CRACKERS — Authentication Service
   ============================================================ */

const jwt = require('jsonwebtoken');
const { User, Admin, Cart } = require('../models');
const ApiError = require('../utils/ApiError');
const { getMembershipEligibility } = require('../utils/membership');
const { getCustomerReferral } = require('../utils/reseller');

/**
 * Generate a JWT for a user or admin.
 */
function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

/**
 * Register a new customer.
 * Validates duplicates, creates user, initializes cart, returns user + token.
 */
async function registerCustomer({ name, email, phone, password, customerType }) {
  // Check duplicate email
  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    throw new ApiError(409, 'An account with this email already exists', ['Email is already registered']);
  }

  // Check duplicate phone
  const existingPhone = await User.findOne({ phone });
  if (existingPhone) {
    throw new ApiError(409, 'An account with this phone number already exists', ['Phone number is already registered']);
  }

  // Validate customerType (backend-authoritative; defaults to retail when omitted)
  const safeCustomerType = customerType === 'wholesale' ? 'wholesale' : 'retail';

  // Create user (password is hashed by pre-save hook on the model)
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    password,
    customerType: safeCustomerType
  });

  // Initialize an empty cart for the new user
  await Cart.create({ user: user._id, items: [] });

  const token = generateToken({ id: user._id, email: user.email, role: 'customer' });

  return { user: user.toSafeObject(), token };
}

/**
 * Login a customer with email + password.
 */
async function loginCustomer({ email, password }) {
  // Fetch user WITH password (select: false on schema hides it by default)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password', ['Invalid credentials']);
  }

  if (user.status !== 'active') {
    throw new ApiError(403, 'Your account is inactive. Please contact support.', ['Account is inactive']);
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    throw new ApiError(401, 'Invalid email or password', ['Invalid credentials']);
  }

  const token = generateToken({ id: user._id, email: user.email, role: 'customer' });

  return { user: user.toSafeObject(), token };
}

/**
 * Get the currently authenticated customer.
 * Assumes req.user was populated by authenticateUser middleware.
 * Includes membership information derived from completed (delivered) orders.
 */
async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found', ['User does not exist']);
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'Your account is inactive. Please contact support.', ['Account is inactive']);
  }

  const safeUser = user.toSafeObject();

  // Attach membership info (authoritative from backend, derived from delivered orders)
  const membership = await getMembershipEligibility(userId);
  safeUser.membership = {
    tier: membership.tier,
    discountPercent: membership.discountPercent,
    completedOrders: membership.completedOrders
  };

  // Phase 8 — reseller & referral info (read-only, backend-authoritative)
  safeUser.isReseller = !!user.isReseller;
  safeUser.resellerStatus = user.resellerStatus || 'inactive';
  safeUser.referralCode = user.referralCode || null;
  safeUser.referredBy = user.referredBy || null;
  safeUser.referralCodeApplied = user.referralCodeApplied || null;

  // Attach referral summary if the user is a referred retail customer
  const referral = await getCustomerReferral(user);
  safeUser.referral = referral;

  // customerType is already included via toSafeObject (model field)
  return safeUser;
}

/**
 * Customer logout — with stateless JWT, the server cannot
 * literally invalidate an issued token without a blacklist.
 * Practical approach: clear client-side token.
 * This endpoint exists for API contract completeness and
 * can be extended with a token blacklist later if needed.
 */
async function logoutCustomer() {
  // JWT is stateless — server cannot revoke.
  // Return a success message so clients can clear the stored token.
  return { message: 'Logged out successfully. Please clear your token on the client.' };
}

/**
 * Admin login — authenticates admin separately.
 */
async function loginAdmin({ email, password }) {
  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
  if (!admin) {
    throw new ApiError(401, 'Invalid admin credentials', ['Invalid credentials']);
  }

  if (admin.status !== 'active') {
    throw new ApiError(403, 'This admin account is inactive. Please contact support.', ['Account is inactive']);
  }

  const isValid = await admin.comparePassword(password);
  if (!isValid) {
    throw new ApiError(401, 'Invalid admin credentials', ['Invalid credentials']);
  }

  // Update last login timestamp
  admin.lastLogin = new Date();
  await admin.save();

  const token = generateToken({ id: admin._id, email: admin.email, role: 'admin' });

  return { admin: admin.toSafeObject(), token };
}

/**
 * Get the currently authenticated admin.
 */
async function getCurrentAdmin(adminId) {
  const admin = await Admin.findById(adminId);
  if (!admin) {
    throw new ApiError(404, 'Admin not found', ['Admin does not exist']);
  }
  if (admin.status !== 'active') {
    throw new ApiError(403, 'This admin account is inactive. Please contact support.', ['Account is inactive']);
  }
  return admin.toSafeObject();
}

module.exports = {
  generateToken,
  registerCustomer,
  loginCustomer,
  getCurrentUser,
  logoutCustomer,
  loginAdmin,
  getCurrentAdmin
};