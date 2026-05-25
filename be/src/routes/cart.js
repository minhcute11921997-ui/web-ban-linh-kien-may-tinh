const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { verifyToken, verifyCustomer } = require('../middleware/auth');

// Tất cả route đều cần đăng nhập
router.get('/', verifyToken, verifyCustomer, cartController.getCart);
router.post('/add', verifyToken, verifyCustomer, cartController.addToCart);
router.put('/item/:id', verifyToken, verifyCustomer, cartController.updateCartItem);
router.delete('/item/:id', verifyToken, verifyCustomer, cartController.removeFromCart);
router.delete('/clear', verifyToken, verifyCustomer, cartController.clearCart);

module.exports = router;
