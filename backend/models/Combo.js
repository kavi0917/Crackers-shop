/* ============================================================
   VENDHAN CRACKERS — Combo Model
   ============================================================ */

const mongoose = require('mongoose');

/* ---------- Combo Item Sub-schema ---------- */
const comboItemSchema = new mongoose.Schema(
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

/* ---------- Combo Schema ---------- */
const comboSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Combo name is required'],
      trim: true,
      minlength: [2, 'Combo name must be at least 2 characters'],
      maxlength: [100, 'Combo name cannot exceed 100 characters']
    },
    price: {
      type: Number,
      required: [true, 'Combo price is required'],
      min: [0, 'Combo price cannot be negative']
    },
    description: {
      type: String,
      default: null,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    image: {
      type: String,
      default: null
    },
    items: {
      type: [comboItemSchema],
      default: []
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%']
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

/* ---------- Indexes ---------- */
comboSchema.index({ status: 1 });
comboSchema.index({ price: 1 });

module.exports = mongoose.model('Combo', comboSchema);