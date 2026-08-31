/* ============================================================
   VENDHAN CRACKERS — Async Route Handler Wrapper
   ============================================================ */

/**
 * Wraps an async route handler so that thrown errors
 * are automatically passed to the Express error handler.
 *
 * Usage:
 *   router.get('/', asyncHandler(async (req, res) => {
 *     const data = await Model.find();
 *     res.json({ success: true, data });
 *   }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;