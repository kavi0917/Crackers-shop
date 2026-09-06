/* ============================================================
   VENDHAN CRACKERS — Coupon Model
   ============================================================ */

const mongoose = require('mongoose');

/* ---------- Coupon Schema ---------- */
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [3, 'Coupon code must be at least 3 characters'],
      maxlength: [30, 'Coupon code cannot exceed 30 characters']
    },
    discountType: {
      type: String,
      required: [true, 'Discount type is required'],
      enum: {
        values: ['percentage', 'fixed'],
        message: 'Discount type must be percentage or fixed'
      }
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0.01, 'Discount value must be greater than 0']
    },
    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order amount cannot be negative']
    },
    // Cap for percentage coupons (rupees). Null = no cap.
    maximumDiscount: {
      type: Number,
      default: null,
      min: [0, 'Maximum discount cannot be negative']
    },
    startDate: {
      type: Date,
      default: null
    },
    expiryDate: {
      type: Date,
      default: null
    },
    // Null = no limit (unlimited usage).
    usageLimit: {
      type: Number,
      default: null,
      min: [0, 'Usage limit cannot be negative']
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, 'Used count cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: 'Status must be either active or inactive'
      },
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

/* ---------- Indexes ---------- */
// code is unique (field-level) — because codes are normalized to UPPERCASE before
// save (service + schema setter), lowercase duplicates are prevented at DB level.
couponSchema.index({ status: 1 });
couponSchema.index({ expiryDate: 1 });

/* ---------- Validators ---------- */
// Percentage coupons cannot exceed 100%.
couponSchema.path('discountValue').validate(function (value) {
  if (this.discountType === 'percentage' && Number(value) > 100) {
    return false;
  }
  return true;
}, 'Percentage discount value cannot exceed 100');

module.exports = mongoose.model('Coupon', couponSchema);