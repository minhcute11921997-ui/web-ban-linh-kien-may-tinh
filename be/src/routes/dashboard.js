const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Admin only
router.get('/stats', verifyToken, verifyAdmin, dashboardController.getStats);

module.exports = router;
