/* ============================================================
   VENDHAN CRACKERS — Admin Settings Routes
   ============================================================ */

const express = require('express');
const router = express.Router();

const adminSettingsController = require('../controllers/adminSettingsController');
const { authenticateAdmin } = require('../middleware/auth');
const { validateSettingsUpdate } = require('../validators/settingsValidators');
const validateResult = require('../validators/validateResult');

/* All admin settings routes require admin authentication */
router.use(authenticateAdmin);

/* GET /api/admin/settings */
router.get('/', adminSettingsController.getSettings);

/* PUT /api/admin/settings */
router.put('/', validateSettingsUpdate, validateResult, adminSettingsController.updateSettings);

module.exports = router;