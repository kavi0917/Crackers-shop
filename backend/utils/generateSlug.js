/* ============================================================
   VENDHAN CRACKERS — Slug Generator
   ============================================================ */

/**
 * Convert a string into a URL-friendly slug.
 * Example: "Deluxe Sparkler Pack (50 pcs)" → "deluxe-sparkler-pack-50-pcs"
 */
function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

module.exports = generateSlug;