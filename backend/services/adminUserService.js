/* ============================================================
   VENDHAN CRACKERS — Admin User Management Service
   ============================================================ */

const { Admin } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/paginate');

/**
 * Build a safe admin response object.
 * Never exposes password or sensitive authentication fields.
 */
function toSafeAdmin(admin) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    lastLogin: admin.lastLogin,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt
  };
}

/**
 * Admin: List admin users with pagination.
 * Only super_admins can access this.
 */
async function listAdmins(query) {
  const { page, limit, skip } = paginate(query, { defaultLimit: 10, maxLimit: 50 });

  const filter = {};
  if (query.status) {
    if (!['active', 'inactive'].includes(query.status)) {
      throw new ApiError(400, 'Invalid status filter', ['status must be active or inactive']);
    }
    filter.status = query.status;
  }
  if (query.role) {
    if (!['super_admin', 'manager'].includes(query.role)) {
      throw new ApiError(400, 'Invalid role filter', ['role must be super_admin or manager']);
    }
    filter.role = query.role;
  }
  if (query.search) {
    const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const total = await Admin.countDocuments(filter);
  const admins = await Admin.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const mapped = admins.map((a) => toSafeAdmin(a));

  return { admins: mapped, total, page, limit };
}

/**
 * Admin: Create a new admin user.
 */
async function createAdmin(data) {
  // Check duplicate email
  const existing = await Admin.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'An admin with this email already exists', ['Email is already registered']);
  }

  if (!['super_admin', 'manager'].includes(data.role || 'manager')) {
    throw new ApiError(400, 'Invalid role', ['role must be super_admin or manager']);
  }

  const admin = await Admin.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: data.password,
    role: data.role || 'manager',
    status: data.status || 'active'
  });

  return toSafeAdmin(admin);
}

/**
 * Admin: Update an admin user's status.
 */
async function updateAdminStatus(adminId, status) {
  if (!['active', 'inactive'].includes(status)) {
    throw new ApiError(400, 'Invalid status', ['status must be active or inactive']);
  }

  const admin = await Admin.findById(adminId);
  if (!admin) {
    throw new ApiError(404, 'Admin user not found', ['Admin does not exist']);
  }

  admin.status = status;
  await admin.save();

  return toSafeAdmin(admin);
}

module.exports = {
  listAdmins,
  createAdmin,
  updateAdminStatus
};