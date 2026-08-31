/* ============================================================
   VENDHAN CRACKERS — Authentication & Authorization Middleware
   ============================================================ */

const jwt = require('jsonwebtoken');
const { User, Admin } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Extract Bearer token from Authorization header.
 * Returns null if missing or malformed.
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}

/**
 * authenticateUser — protects customer routes.
 * Validates: token existence, format, signature, expiry,
 * user existence, and account status.
 */
const authenticateUser = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new ApiError(401, 'Authentication required. Please log in.', ['Missing or malformed token']);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired. Please log in again.', ['Token has expired']);
    }
    throw new ApiError(401, 'Invalid token. Please log in again.', ['Token signature verification failed']);
  }

  if (decoded.role !== 'customer') {
    throw new ApiError(403, 'Access denied. Customer authentication required.', ['Invalid role for this route']);
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, 'User account not found.', ['User no longer exists']);
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'Your account is inactive. Please contact support.', ['Account is inactive']);
  }

  req.user = user;
  next();
});

/**
 * authenticateAdmin — protects admin routes.
 * Validates: token existence, format, signature, expiry,
 * admin existence, and account status.
 */
const authenticateAdmin = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw new ApiError(401, 'Admin authentication required.', ['Missing or malformed token']);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired. Please log in again.', ['Token has expired']);
    }
    throw new ApiError(401, 'Invalid token. Please log in again.', ['Token signature verification failed']);
  }

  if (decoded.role !== 'admin') {
    throw new ApiError(403, 'Admin access required.', ['Invalid role for this route']);
  }

  const admin = await Admin.findById(decoded.id);
  if (!admin) {
    throw new ApiError(401, 'Admin account not found.', ['Admin no longer exists']);
  }
  if (admin.status !== 'active') {
    throw new ApiError(403, 'This admin account is inactive.', ['Account is inactive']);
  }

  req.admin = admin;
  next();
});

/**
 * authorizeRole — role-based access control.
 * Usage: authorizeRole('super_admin') or authorizeRole('super_admin', 'manager')
 */
const authorizeRole = (...roles) => (req, res, next) => {
  const user = req.user || req.admin;
  if (!user) {
    throw new ApiError(401, 'Authentication required.', ['No authenticated user found']);
  }
  if (!roles.includes(user.role)) {
    throw new ApiError(403, 'You do not have permission to perform this action.', [`Role '${user.role}' is not authorized`]);
  }
  next();
};

module.exports = { authenticateUser, authenticateAdmin, authorizeRole };
