/* ============================================================
   VENDHAN CRACKERS — Wishlist Model
   ============================================================ */

const mongoose = require('mongoose');

/* ---------- Wishlist Schema ----------
   A wishlist record associates an authenticated customer with a product.
   It stores ONLY references — no name/price/discount/stock snapshots.
   Current product information (price, discount, availability) is always
   fetched live from the Product collection when the wishlist is loaded,
   so no stale pricing can ever be displayed. */
const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required']
    }
  },
  {
    timestamps: true
  }
);

/* ---------- Indexes ---------- */
// One wishlist entry per user + product pair — prevents duplicate wishlist
// items at the database level (races included). Queries always scope by
// user, so this also serves every get/remove lookup.
wishlistSchema.index({ user: 1, product: 1 }, { unique: true });
wishlistSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Wishlist', wishlistSchema);