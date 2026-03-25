const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const {
  getDashboardStats,
  getRevenueReport,
} = require("../controllers/dashboardController");
// Admin only
router.get('/stats', verifyToken, verifyAdmin, dashboardController.getStats);
router.get('/revenue', verifyToken, verifyAdmin, dashboardController.getRevenueReport);

module.exports = router;
