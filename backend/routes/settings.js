/* ============================================================
   VENDHAN CRACKERS — Settings Routes (Public)
   ============================================================ */

const express = require('express');
const router = express.Router();

const settingsController = require('../controllers/settingsController');

/* GET /api/settings — public shop settings (includes freeDeliveryThreshold) */
router.get('/', settingsController.getPublicSettings);

module.exports = router;