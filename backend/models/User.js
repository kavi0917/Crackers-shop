/* ============================================================
   VENDHAN CRACKERS — User Model
   ============================================================ */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^\d{10}$/, 'Phone number must be exactly 10 digits']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false // Never return password in normal queries
    },
    role: {
      type: String,
      enum: ['customer'],
      default: 'customer'
    },
    customerType: {
      type: String,
      enum: ['retail', 'wholesale'],
      default: 'retail'
    },
    /* ---------- Phase 8: Reseller + Referral (admin-controlled) ---------- */
    isReseller: {
      type: Boolean,
      default: false
    },
    resellerStatus: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'inactive'
    },
    referralCode: {
      type: String,
      trim: true,
      uppercase: true
      // NO default here. Normal Retail/Wholesale customers must NOT persist
      // referralCode: null — MongoDB's sparse unique index still indexes explicit
      // null values, so multiple nulls cause E11000 duplicate-key (HTTP 409).
      // Absent (undefined) values are excluded from the sparse index, allowing any
      // number of non-reseller customers. A real unique code is assigned only when
      // a customer is activated as a reseller (see resellerService.activateReseller).
      // Unique index defined below (sparse + unique).
    },
    // Stable referral binding: which active reseller referred this customer
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // Snapshot of the referral code that was applied (for display + audit)
    referralCodeApplied: {
      type: String,
      trim: true,
      uppercase: true,
      default: null
    },
    address: {
      type: String,
      default: null
    },
    city: {
      type: String,
      default: null
    },
    state: {
      type: String,
      default: null
    },
    pincode: {
      type: String,
      default: null
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
// email and phone have unique: true in field definitions (auto-indexed)
userSchema.index({ status: 1 });
userSchema.index({ isReseller: 1, resellerStatus: 1 });
// Sparse unique index — excludes ABSENT fields, so non-reseller customers (who have
// no referralCode field at all) never collide. Enforces uniqueness on actual reseller codes.
userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });
userSchema.index({ referredBy: 1 });

/* ---------- Pre-save hook: hash password ---------- */
userSchema.pre('save', async function (next) {
  // Only hash if the password was modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/* ---------- Instance method: compare password ---------- */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/* ---------- Instance method: safe user object (no password) ---------- */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);