/* ============================================================
   VENDHAN CRACKERS — Setting Model
   ============================================================ */

const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      required: [true, 'Shop name is required'],
      trim: true,
      maxlength: [100, 'Shop name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    deliveryCharge: {
      type: Number,
      default: 49,
      min: [0, 'Delivery charge cannot be negative']
    },
    freeDeliveryThreshold: {
      type: Number,
      default: 1000,
      min: [0, 'Free delivery threshold cannot be negative']
    },
    minimumOrderAmount: {
      type: Number,
      default: 2000,
      min: [0, 'Minimum order amount cannot be negative']
    },
    gst: {
      type: Number,
      default: 18,
      min: [0, 'GST cannot be negative'],
      max: [100, 'GST cannot exceed 100%']
    },
    lowStockThreshold: {
      type: Number,
      default: 20,
      min: [0, 'Low stock threshold cannot be negative']
    },
    openingHours: {
      type: String,
      default: '9:00 AM - 9:00 PM',
      trim: true
    },
    /* ============ Contact Details (Admin → Contact Details, single source of truth) ============ */
    companyName: {
      type: String,
      default: 'Vendhan Enterprises',
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    phone2: {
      type: String,
      trim: true,
      maxlength: [30, 'Secondary phone cannot exceed 30 characters']
    },
    email2: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: [120, 'Secondary email cannot exceed 120 characters']
    },
    mondaySaturdayHours: {
      type: String,
      default: 'Mon – Sat: 9:00 AM – 9:00 PM',
      trim: true,
      maxlength: [100, 'Monday–Saturday hours cannot exceed 100 characters']
    },
    sundayHours: {
      type: String,
      default: 'Sunday: 10:00 AM – 8:00 PM',
      trim: true,
      maxlength: [100, 'Sunday hours cannot exceed 100 characters']
    },
    festivalSeasonHours: {
      type: String,
      default: 'Festival Season: Extended Hours',
      trim: true,
      maxlength: [100, 'Festival season hours cannot exceed 100 characters']
    },
    whatsappUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'WhatsApp link cannot exceed 500 characters']
    },
    facebookUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Facebook link cannot exceed 500 characters']
    },
    instagramUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Instagram link cannot exceed 500 characters']
    },
    twitterUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Twitter/X link cannot exceed 500 characters']
    },
    mapEmbedUrl: {
      type: String,
      default: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.0074118003454!2d77.72415797407349!3d9.641433279103854!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b06d900295818ff%3A0x8660c67bf4148bae!2sVendhan%20Fire%20Works!5e1!3m2!1sen!2sin!4v1787085840469!5m2!1sen!2sin',
      trim: true,
      maxlength: [2000, 'Map embed URL cannot exceed 2000 characters']
    },
    trustedSinceYear: {
      type: Number,
      default: 1985,
      min: [1900, 'Trusted since year cannot be before 1900'],
      max: [2100, 'Trusted since year cannot be after 2100']
    },
    customerCount: {
      type: Number,
      default: 50000,
      min: [0, 'Customer count cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

/* ---------- Singleton: only one settings document ---------- */
settingSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }

  // Backfill Contact Details fields on existing documents so Admin → Contact
  // Details always has the full set of editable fields (seeded with the exact
  // existing values that were previously hard-coded in the public pages).
  const contactDetailDefaults = {
    companyName: 'Vendhan Enterprises',
    phone2: '+91 44 2653 7890',
    email2: 'support@vendhancrackers.in',
    mondaySaturdayHours: 'Mon – Sat: 9:00 AM – 9:00 PM',
    sundayHours: 'Sunday: 10:00 AM – 8:00 PM',
    festivalSeasonHours: 'Festival Season: Extended Hours',
    whatsappUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.0074118003454!2d77.72415797407349!3d9.641433279103854!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b06d900295818ff%3A0x8660c67bf4148bae!2sVendhan%20Fire%20Works!5e1!3m2!1sen!2sin!4v1787085840469!5m2!1sen!2sin'
  };

  let needsSave = false;
  Object.keys(contactDetailDefaults).forEach((key) => {
    if (settings[key] === undefined || settings[key] === null) {
      settings[key] = contactDetailDefaults[key];
      needsSave = true;
    }
  });

  if (needsSave) {
    await settings.save();
  }

  return settings;
};

module.exports = mongoose.model('Setting', settingSchema);