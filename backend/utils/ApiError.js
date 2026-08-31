/* ============================================================
   VENDHAN CRACKERS — Custom API Error Class
   ============================================================ */

/**
 * Custom error class that carries an HTTP status code.
 * Used by controllers and services to signal specific error responses.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true; // Marks expected/operational errors
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;