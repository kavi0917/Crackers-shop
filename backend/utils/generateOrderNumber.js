/* ============================================================
   VENDHAN CRACKERS — Order Number Generator
   ============================================================ */

/**
 * Generate a human-readable order number.
 * Format: VC-{year}-{zero-padded sequence}
 * Example: VC-2026-0007
 */
function generateOrderNumber(sequence) {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(4, '0');
  return `VC-${year}-${padded}`;
}

module.exports = generateOrderNumber;