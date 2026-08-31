/* ============================================================
   VENDHAN CRACKERS — Pagination Helper
   ============================================================ */

/**
 * Parse and validate pagination query parameters.
 *
 * @param {Object} query - Express req.query
 * @param {Object} options - { defaultLimit, maxLimit }
 * @returns {Object} { page, limit, skip }
 */
function paginate(query, options = {}) {
  const defaultLimit = options.defaultLimit || 10;
  const maxLimit = options.maxLimit || 50;

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || defaultLimit, 1),
    maxLimit
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Build a pagination metadata object.
 *
 * @param {Number} total - Total document count
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @returns {Object} { total, page, totalPages }
 */
function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

module.exports = { paginate, paginationMeta };