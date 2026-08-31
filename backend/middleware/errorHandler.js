/* ============================================================
   VENDHAN CRACKERS — Centralized Error Handler
   ============================================================ */

const ApiError = require('../utils/ApiError');

/**
 * Centralized error handling middleware.
 * Handles: invalid JSON, validation errors, MongoDB errors,
 * CastError, duplicate key errors, auth errors, unknown routes,
 * and internal server errors.
 */
function errorHandler(err, req, res, next) {
  // Log the error server-side (never expose stack traces to client in production)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.error(err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  // --- Invalid JSON body ---
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  }

  // --- Mongoose validation error ---
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // --- Mongoose duplicate key error ---
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}. This value already exists.`;
    errors = [`${field} must be unique`];
  }

  // --- Mongoose CastError (invalid ObjectId) ---
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    errors = [`Invalid ${err.path} format`];
  }

  // --- JWT errors ---
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired. Please log in again.';
  }

  // --- Multer upload errors (should already be converted to ApiError, but safety net) ---
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = 'Image upload failed. Please try again.';
    errors = ['Upload error'];
  }

  // --- Custom ApiError ---
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }

  // --- Production: hide internal error details ---
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
    errors = [];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors
  });
}

/**
 * 404 handler for unknown routes.
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: []
  });
}

module.exports = { errorHandler, notFoundHandler };