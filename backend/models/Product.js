/* ============================================================
   VENDHAN CRACKERS — Product Model
   ============================================================ */

const mongoose = require('mongoose');
const generateSlug = require('../utils/generateSlug');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [150, 'Product name cannot exceed 150 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      default: null,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    originalPrice: {
      type: Number,
      default: null,
      min: [0, 'Original price cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%']
    },
    images: {
      type: [String],
      default: []
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    reorderLevel: {
      type: Number,
      default: 20,
      min: [0, 'Reorder level cannot be negative']
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative']
    },
    isFeatured: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

/* ---------- Indexes ---------- */
// slug has unique: true in field definition (auto-indexed)
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ isFeatured: 1, rating: -1 });

/* ---------- Pre-save hook: auto-generate slug ---------- */
productSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = generateSlug(this.name);
  }
  next();
});

/* ---------- Virtual: stock status ---------- */
productSchema.virtual('stockStatus').get(function () {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= this.reorderLevel) return 'low_stock';
  return 'in_stock';
});

/* ---------- Ensure virtuals are included in JSON ---------- */
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);