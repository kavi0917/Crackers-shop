/* ============================================================
   VENDHAN CRACKERS — Validation Result Middleware
   ============================================================ */

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Middleware to check express-validator results.
 * If errors exist, throws a 422 Validation Error with the error messages.
 */
function validateResult(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((err) => err.msg);
    throw new ApiError(422, 'Validation failed', messages);
  }
  next();
}

module.exports = validateResult;