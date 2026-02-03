const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// User routes
router.post('/', verifyToken, orderController.createOrder);
router.get('/my-orders', verifyToken, orderController.getMyOrders);
router.get('/:id', verifyToken, orderController.getOrderById);

// Admin routes
router.get('/admin/all', verifyToken, verifyAdmin, orderController.getAllOrders);
router.put('/admin/:id/status', verifyToken, verifyAdmin, orderController.updateOrderStatus);
router.delete('/admin/:id', verifyToken, verifyAdmin, orderController.deleteOrder);

module.exports = router;
