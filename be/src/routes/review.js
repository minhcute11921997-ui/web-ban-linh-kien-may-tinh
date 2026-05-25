const express = require('express');
const router = express.Router();
const { verifyToken, verifyCustomer } = require('../middleware/auth');
const {
    getReviewsByProduct,
    createReview,
    updateReview,
    deleteReview,
    checkUserReview,
} = require('../controllers/reviewController');

// Public
router.get('/product/:productId', getReviewsByProduct);

// Private 
router.post('/', verifyToken, verifyCustomer, createReview);
router.put('/:id', verifyToken, verifyCustomer, updateReview);
router.delete('/:id', verifyToken, deleteReview);
router.get('/check/:productId', verifyToken, verifyCustomer, checkUserReview);

module.exports = router;
