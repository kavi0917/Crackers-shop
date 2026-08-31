/* ============================================================
   VENDHAN CRACKERS — Category Model
   ============================================================ */

const mongoose = require('mongoose');
const generateSlug = require('../utils/generateSlug');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [100, 'Category name cannot exceed 100 characters']
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
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    image: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%']
    },
    productCount: {
      type: Number,
      default: 0,
      min: [0, 'Product count cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

/* ---------- Indexes ---------- */
// slug has unique: true in field definition (auto-indexed)
categorySchema.index({ status: 1 });

/* ---------- Ensure virtuals are included in JSON ---------- */
categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

/* ---------- Pre-save hook: auto-generate slug ---------- */
categorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = generateSlug(this.name);
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);