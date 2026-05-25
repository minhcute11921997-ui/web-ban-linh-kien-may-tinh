const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, verifyAdminOrStaff } = require('../middleware/auth');

router.get('/stats', verifyToken, verifyAdminOrStaff, dashboardController.getStats);
router.get('/revenue', verifyToken, verifyAdminOrStaff, dashboardController.getRevenueReport);

module.exports = router;
