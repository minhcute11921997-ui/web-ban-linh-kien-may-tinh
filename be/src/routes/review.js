const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');
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
router.post('/', verifyToken, createReview);
router.put('/:id', verifyToken, updateReview);
router.delete('/:id', verifyToken, deleteReview);
router.get('/check/:productId', verifyToken, checkUserReview);

module.exports = router;