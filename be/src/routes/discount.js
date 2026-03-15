const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');

// Validate discount code
router.get('/validate', discountController.validateDiscount);

// Get all available discounts
router.get('/available', discountController.getAvailableDiscounts);

module.exports = router;
