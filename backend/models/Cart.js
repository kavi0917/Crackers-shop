/* ============================================================
   VENDHAN CRACKERS — Cart Model
   ============================================================ */

const mongoose = require('mongoose');

/* ---------- Combo Item Snapshot Sub-schema ---------- */
const comboItemSnapshotSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    }
  },
  {
    _id: false // No separate _id for embedded items
  }
);

/* ---------- Cart Item Sub-schema ---------- */
const cartItemSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ['PRODUCT', 'COMBO'],
      default: 'PRODUCT'
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      // Required only for PRODUCT items (validated in service layer)
      default: null
    },
    combo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Combo',
      // Required only for COMBO items (validated in service layer)
      default: null
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Subtotal cannot be negative']
    },
    // Snapshot of the combo's contents (only for COMBO items)
    comboItems: {
      type: [comboItemSnapshotSchema],
      default: []
    }
  },
  {
    _id: false // No separate _id for embedded items
  }
);

/* ---------- Cart Schema ---------- */
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true // One cart per user
    },
    items: {
      type: [cartItemSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

/* ---------- Indexes ---------- */
// user has unique: true in field definition (auto-indexed)

/* ---------- Pre-save hook: compute item subtotals ---------- */
cartSchema.pre('save', function (next) {
  this.items.forEach((item) => {
    item.subtotal = Math.round(item.price * item.quantity * 100) / 100;
  });
  next();
});

/* ---------- Virtual: cart subtotal ---------- */
cartSchema.virtual('subtotal').get(function () {
  return this.items.reduce((sum, item) => sum + item.subtotal, 0);
});

/* ---------- Ensure virtuals are included in JSON ---------- */
cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cart', cartSchema);