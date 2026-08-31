/* ============================================================
   VENDHAN CRACKERS — Commission Model (Phase 8)
   ============================================================ */

const mongoose = require('mongoose');

/**
 * Commission record for a reseller's referred retail customer order.
 *
 * - Immutable snapshot of the commission calculation at the time the
 *   eligible order reached status === 'delivered'.
 * - Historical records must NOT change if the reseller percentage
 *   changes later.
 */
const commissionSchema = new mongoose.Schema(
  {
    reseller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reseller reference is required'],
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required']
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required'],
      unique: true // One commission per eligible order — prevents duplicates
    },
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
      trim: true
    },
    referralCode: {
      type: String,
      uppercase: true,
      trim: true,
      required: [true, 'Referral code is required']
    },
    commissionPercent: {
      type: Number,
      required: [true, 'Commission percent is required'],
      min: [0, 'Commission percent cannot be negative'],
      max: [100, 'Commission percent cannot exceed 100'],
      default: 5
    },
    commissionBaseAmount: {
      type: Number,
      required: [true, 'Commission base amount is required'],
      min: [0, 'Commission base amount cannot be negative']
    },
    commissionAmount: {
      type: Number,
      required: [true, 'Commission amount is required'],
      min: [0, 'Commission amount cannot be negative']
    },
    status: {
      type: String,
      enum: ['pending', 'earned', 'cancelled'],
      default: 'earned'
    },
    /* Snapshot of the referral discount applied for audit */
    referralDiscountPercent: {
      type: Number,
      default: 0,
      min: [0, 'Referral discount percent cannot be negative'],
      max: [100, 'Referral discount percent cannot exceed 100']
    },
    referralDiscountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Referral discount amount cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

/* ---------- Indexes ---------- */
commissionSchema.index({ reseller: 1, createdAt: -1 });
commissionSchema.index({ status: 1 });
commissionSchema.index({ orderId: 1 }, { unique: true });

module.exports = mongoose.model('Commission', commissionSchema);