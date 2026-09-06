/* ============================================================
   VENDHAN CRACKERS — Settings Service
   ============================================================ */

const { Setting } = require('../models');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLogService');

/**
 * Default Contact Details values.
 * These mirror the exact values that were previously hard-coded in the
 * public pages, so the database is seeded with the existing information
 * (and old Setting documents without the new fields still resolve safely).
 */
const DEFAULT_CONTACT_DETAILS = {
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

/**
 * Resolve a contact-detail value, falling back to the existing displayed value
 * when the field is missing/blank in an older Setting document.
 */
function contactDetailValue(settings, key) {
  const v = settings[key];
  return v !== undefined && v !== null ? v : DEFAULT_CONTACT_DETAILS[key];
}

/**
 * Get application-wide settings.
 * Uses Setting.getSettings() singleton pattern.
 * Returns a plain object of shop configuration.
 */
async function getSettings() {
  const settings = await Setting.getSettings();

  return {
    shopName: settings.shopName,
    companyName: contactDetailValue(settings, 'companyName'),
    phone: settings.phone,
    phone2: contactDetailValue(settings, 'phone2'),
    email: settings.email,
    email2: contactDetailValue(settings, 'email2'),
    address: settings.address,
    deliveryCharge: settings.deliveryCharge,
    freeDeliveryThreshold: settings.freeDeliveryThreshold,
    minimumOrderAmount: settings.minimumOrderAmount != null ? settings.minimumOrderAmount : 2000,
    gst: settings.gst,
    lowStockThreshold: settings.lowStockThreshold,
    openingHours: settings.openingHours,
    mondaySaturdayHours: contactDetailValue(settings, 'mondaySaturdayHours'),
    sundayHours: contactDetailValue(settings, 'sundayHours'),
    festivalSeasonHours: contactDetailValue(settings, 'festivalSeasonHours'),
    whatsappUrl: contactDetailValue(settings, 'whatsappUrl'),
    facebookUrl: contactDetailValue(settings, 'facebookUrl'),
    instagramUrl: contactDetailValue(settings, 'instagramUrl'),
    twitterUrl: contactDetailValue(settings, 'twitterUrl'),
    mapEmbedUrl: contactDetailValue(settings, 'mapEmbedUrl'),
    trustedSinceYear: settings.trustedSinceYear != null ? settings.trustedSinceYear : 1985,
    customerCount: settings.customerCount != null ? settings.customerCount : 50000
  };
}

/**
 * Get settings for public display (only intentionally public fields).
 */
async function getPublicSettings() {
  const settings = await getSettings();

  // Only expose shop information that is intentionally public.
  // `deliveryCharge`, `freeDeliveryThreshold`, `minimumOrderAmount` are included
  // so customer-facing pages (e.g. Product Details) can render the exact
  // free-delivery and minimum-order rules that checkout uses as its source of truth.
  return {
    shopName: settings.shopName,
    companyName: settings.companyName,
    phone: settings.phone,
    phone2: settings.phone2,
    email: settings.email,
    email2: settings.email2,
    address: settings.address,
    openingHours: settings.openingHours,
    mondaySaturdayHours: settings.mondaySaturdayHours,
    sundayHours: settings.sundayHours,
    festivalSeasonHours: settings.festivalSeasonHours,
    whatsappUrl: settings.whatsappUrl,
    facebookUrl: settings.facebookUrl,
    instagramUrl: settings.instagramUrl,
    twitterUrl: settings.twitterUrl,
    mapEmbedUrl: settings.mapEmbedUrl,
    deliveryCharge: settings.deliveryCharge,
    freeDeliveryThreshold: settings.freeDeliveryThreshold,
    minimumOrderAmount: settings.minimumOrderAmount != null ? settings.minimumOrderAmount : 2000,
    trustedSinceYear: settings.trustedSinceYear != null ? settings.trustedSinceYear : 1985,
    customerCount: settings.customerCount != null ? settings.customerCount : 50000
  };
}

/**
 * Get settings for pricing calculations (used by checkout).
 */
async function getPricingSettings() {
  const settings = await Setting.getSettings();
  return {
    deliveryCharge: settings.deliveryCharge || 0,
    freeDeliveryThreshold: settings.freeDeliveryThreshold || 1000,
    minimumOrderAmount: settings.minimumOrderAmount || 2000,
    gstPercent: settings.gst || 0
  };
}

/**
 * Validate and normalize setting values.
 */
function normalizeSettings(data) {
  const allowedFields = [
    'shopName',
    'companyName',
    'phone',
    'phone2',
    'email',
    'email2',
    'address',
    'deliveryCharge',
    'freeDeliveryThreshold',
    'minimumOrderAmount',
    'gst',
    'lowStockThreshold',
    'openingHours',
    'mondaySaturdayHours',
    'sundayHours',
    'festivalSeasonHours',
    'whatsappUrl',
    'facebookUrl',
    'instagramUrl',
    'twitterUrl',
    'mapEmbedUrl',
    'trustedSinceYear',
    'customerCount'
  ];

  const update = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      update[field] = data[field];
    }
  }

  // Validate numeric fields
  if (update.deliveryCharge !== undefined) {
    const val = Number(update.deliveryCharge);
    if (isNaN(val) || val < 0) {
      throw new ApiError(400, 'Delivery charge must be a non-negative number', ['Invalid delivery charge']);
    }
    update.deliveryCharge = val;
  }

  if (update.freeDeliveryThreshold !== undefined) {
    const val = Number(update.freeDeliveryThreshold);
    if (isNaN(val) || val < 0) {
      throw new ApiError(400, 'Free delivery threshold must be a non-negative number', ['Invalid free delivery threshold']);
    }
    update.freeDeliveryThreshold = val;
  }

  if (update.minimumOrderAmount !== undefined) {
    const val = Number(update.minimumOrderAmount);
    if (isNaN(val) || val < 0) {
      throw new ApiError(400, 'Minimum order amount must be a non-negative number', ['Invalid minimum order amount']);
    }
    update.minimumOrderAmount = val;
  }

  if (update.gst !== undefined) {
    const val = Number(update.gst);
    if (isNaN(val) || val < 0 || val > 100) {
      throw new ApiError(400, 'GST must be between 0 and 100', ['Invalid GST']);
    }
    update.gst = val;
  }

  if (update.lowStockThreshold !== undefined) {
    const val = Number(update.lowStockThreshold);
    if (isNaN(val) || val < 0) {
      throw new ApiError(400, 'Low stock threshold must be a non-negative number', ['Invalid low stock threshold']);
    }
    update.lowStockThreshold = val;
  }

  if (update.trustedSinceYear !== undefined) {
    const val = Number(update.trustedSinceYear);
    if (isNaN(val) || val < 1900 || val > 2100) {
      throw new ApiError(400, 'Trusted since year must be between 1900 and 2100', ['Invalid trusted since year']);
    }
    update.trustedSinceYear = val;
  }

  if (update.customerCount !== undefined) {
    const val = Number(update.customerCount);
    if (isNaN(val) || val < 0) {
      throw new ApiError(400, 'Customer count must be a non-negative number', ['Invalid customer count']);
    }
    update.customerCount = val;
  }

  // Validate Contact Details text fields
  if (update.companyName !== undefined) {
    update.companyName = String(update.companyName).trim();
    if (update.companyName && update.companyName.length > 100) {
      throw new ApiError(400, 'Company name cannot exceed 100 characters', ['Invalid company name']);
    }
  }

  if (update.phone2 !== undefined) {
    update.phone2 = String(update.phone2).trim();
  }

  if (update.email2 !== undefined) {
    update.email2 = String(update.email2).trim();
    if (update.email2 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(update.email2)) {
      throw new ApiError(400, 'Please enter a valid secondary email address', ['Invalid secondary email']);
    }
    if (update.email2.length > 120) {
      throw new ApiError(400, 'Secondary email cannot exceed 120 characters', ['Invalid secondary email']);
    }
  }

  if (update.mondaySaturdayHours !== undefined) {
    update.mondaySaturdayHours = String(update.mondaySaturdayHours).trim();
  }
  if (update.sundayHours !== undefined) {
    update.sundayHours = String(update.sundayHours).trim();
  }
  if (update.festivalSeasonHours !== undefined) {
    update.festivalSeasonHours = String(update.festivalSeasonHours).trim();
  }

  // Social / map URL fields — trimmed; empty values are allowed (frontend keeps
  // its existing static fallback link when a URL field is blank).
  ['whatsappUrl', 'facebookUrl', 'instagramUrl', 'twitterUrl', 'mapEmbedUrl'].forEach((field) => {
    if (update[field] !== undefined) {
      update[field] = String(update[field]).trim();
    }
  });

  // Validate required text fields
  if (update.shopName !== undefined && (!update.shopName || !update.shopName.trim())) {
    throw new ApiError(400, 'Shop name is required', ['Shop name cannot be empty']);
  }
  if (update.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(update.email)) {
    throw new ApiError(400, 'Please enter a valid email address', ['Invalid email']);
  }
  if (update.phone !== undefined && !update.phone.trim()) {
    throw new ApiError(400, 'Phone is required', ['Phone cannot be empty']);
  }
  if (update.address !== undefined && !update.address.trim()) {
    throw new ApiError(400, 'Address is required', ['Address cannot be empty']);
  }

  return update;
}

/**
 * Admin: Get all settings.
 */
async function getSettingsAdmin() {
  return getSettings();
}

/**
 * Admin: Update settings.
 * Phase 8 — also records an audit entry for meaningful settings changes.
 */
async function updateSettings(data, auditCtx = {}) {
  const settings = await Setting.getSettings();
  const update = normalizeSettings(data);

  // Capture only the values actually being changed for the old-values snapshot.
  const oldValues = {};
  const newValues = {};
  Object.keys(update).forEach((key) => {
    oldValues[key] = settings[key] !== undefined ? settings[key] : null;
    newValues[key] = update[key];
  });

  Object.assign(settings, update);
  await settings.save();

  const after = await getSettings();

  // Phase 8 — audit record (best-effort; only after the save succeeded).
  // Only meaningful differences are logged (no-op saves create no record).
  if (Object.keys(update).length > 0) {
    const changedKeys = Object.keys(newValues).filter(
      (key) => JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
    );
    if (changedKeys.length > 0) {
      const changedOld = {};
      const changedNew = {};
      changedKeys.forEach((key) => {
        changedOld[key] = oldValues[key];
        changedNew[key] = newValues[key];
      });
      await auditLogService.createAuditLog({
        actor: auditCtx.actor,
        action: 'UPDATE',
        module: 'SETTINGS',
        targetId: settings._id || null,
        targetType: 'Setting',
        description: `Shop settings updated (${changedKeys.join(', ')})`,
        oldValues: changedOld,
        newValues: changedNew,
        ipAddress: auditCtx.ipAddress,
        userAgent: auditCtx.userAgent
      });
    }
  }

  return after;
}

module.exports = {
  getSettings,
  getPublicSettings,
  getPricingSettings,
  getSettingsAdmin,
  updateSettings
};