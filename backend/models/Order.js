/* ============================================================
   VENDHAN CRACKERS — Order Model
   ============================================================ */

const mongoose = require('mongoose');

/* ---------- Order Item Sub-schema ---------- */
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required']
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
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
    discountPercent: {
      type: Number,
      default: 0,
      min: [0, 'Discount percent cannot be negative'],
      max: [100, 'Discount percent cannot exceed 100']
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative']
    },
    secondOrderDiscountPercent: {
      type: Number,
      default: 0,
      min: [0, 'Second-order discount percent cannot be negative'],
      max: [100, 'Second-order discount percent cannot exceed 100']
    },
    secondOrderDiscountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Second-order discount amount cannot be negative']
    },
    membershipTier: {
      type: String,
      enum: ['none', 'silver', 'gold', 'platinum'],
      default: 'none'
    },
    membershipDiscountPercent: {
      type: Number,
      default: 0,
      min: [0, 'Membership discount percent cannot be negative'],
      max: [100, 'Membership discount percent cannot exceed 100']
    },
    membershipDiscountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Membership discount amount cannot be negative']
    },
    wholesaleDiscountPercent: {
      type: Number,
      default: 0,
      min: [0, 'Wholesale discount percent cannot be negative'],
      max: [100, 'Wholesale discount percent cannot exceed 100']
    },
    wholesaleDiscountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Wholesale discount amount cannot be negative']
    },
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
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative']
    }
  },
  {
    _id: false // No separate _id for embedded items
  }
);

/* ---------- Pricing Sub-schema ---------- */
const pricingSchema = new mongoose.Schema(
  {
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative']
    },
    comboDiscount: {
      type: Number,
      default: 0,
      min: [0, 'Combo discount cannot be negative']
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: [0, 'Coupon discount cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    secondOrderDiscountPercent: {
      type: Number,
      default: 0,
      min: [0, 'Second-order discount percent cannot be negative'],
      max: [100, 'Second-order discount percent cannot exceed 100']
    },
    secondOrderDiscountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Second-order discount amount cannot be negative']
    },
    membershipTier: {
      type: String,
      enum: ['none', 'silver', 'gold', 'platinum'],
      default: 'none'
    },
    membershipDiscountPercent: {
      type: Number,
      default: 0,
      min: [0, 'Membership discount percent cannot be negative'],
      max: [100, 'Membership discount percent cannot exceed 100']
    },
    membershipDiscountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Membership discount amount cannot be negative']
    },
    customerType: {
      type: String,
      enum: ['retail', 'wholesale'],
      default: 'retail'
    },
    wholesaleTier: {
      type: String,
      enum: ['tier0', 'tier1', 'tier2', 'tier3'],
      default: null
    },
    wholesaleDiscountPercent: {
      type: Number,
      default: 0,
      min: [0, 'Wholesale discount percent cannot be negative'],
      max: [100, 'Wholesale discount percent cannot exceed 100']
    },
    wholesaleDiscountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Wholesale discount amount cannot be negative']
    },
    /* ---------- Phase 8: Reseller referral snapshot (backward-compatible) ---------- */
    referralCode: {
      type: String,
      default: null,
      trim: true,
      uppercase: true
    },
    referredByReseller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
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
    },
    deliveryCharge: {
      type: Number,
      default: 0,
      min: [0, 'Delivery charge cannot be negative']
    },
    gst: {
      type: Number,
      default: 0,
      min: [0, 'GST cannot be negative']
    },
    total: {
      type: Number,
      required: [true, 'Total is required'],
      min: [0, 'Total cannot be negative']
    }
  },
  {
    _id: false
  }
);

/* ---------- Delivery Address Sub-schema ---------- */
const deliveryAddressSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Pincode must be exactly 6 digits']
    }
  },
  {
    _id: false
  }
);

/* ---------- Status History Sub-schema ---------- */
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'packed', 'delivered', 'cancelled'],
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      default: null
    }
  },
  {
    _id: false
  }
);

/* ---------- Order Schema ---------- */
const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
      unique: true,
      trim: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    customer: {
      name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true
      },
      phone: {
        type: String,
        required: [true, 'Customer phone is required'],
        trim: true
      },
      email: {
        type: String,
        required: [true, 'Customer email is required'],
        lowercase: true,
        trim: true
      }
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: [true, 'Delivery address is required']
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'Order items are required'],
      validate: {
        validator: (items) => items.length > 0,
        message: 'Order must contain at least one item'
      }
    },
    pricing: {
      type: pricingSchema,
      required: [true, 'Pricing is required']
    },
    payment: {
      method: {
        type: String,
        enum: ['cod', 'upi', 'card'],
        default: 'cod'
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
      }
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'packed', 'delivered', 'cancelled'],
      default: 'pending'
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
    },
    couponCode: {
      type: String,
      default: null,
      trim: true,
      uppercase: true
    }
  },
  {
    timestamps: true
  }
);

/* ---------- Indexes ---------- */
// orderId has unique: true in field definition (auto-indexed)
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'items.product': 1 });

/* ---------- Pre-save hook: initialize status history ---------- */
orderSchema.pre('save', function (next) {
  // Add initial status to history if it's a new order
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() });
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);