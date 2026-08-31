/* ============================================================
   VENDHAN CRACKERS — Admin User Management Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const adminUserController = require('../controllers/adminUserController');
const { authenticateAdmin, authorizeRole } = require('../middleware/auth');
const {
  validateCreateAdmin,
  validateAdminId,
  validateAdminStatus
} = require('../validators/adminUserValidators');
const validateResult = require('../validators/validateResult');

/* All admin user management routes require super_admin authentication */
router.use(authenticateAdmin, authorizeRole('super_admin'));

/* GET /api/admin/users — list admin users */
router.get('/', adminUserController.listAdmins);

/* POST /api/admin/users — create a new admin */
router.post('/', validateCreateAdmin, validateResult, adminUserController.createAdmin);

/* PUT /api/admin/users/:id/status — update admin status */
router.put(
  '/:id/status',
  validateAdminId,
  validateAdminStatus,
  validateResult,
  adminUserController.updateAdminStatus
);

module.exports = router;