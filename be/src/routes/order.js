const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, verifyAdmin, verifyAdminOrStaff, verifyCustomer } = require('../middleware/auth');
const { cancelOrder } = require('../controllers/orderController');
// User routes
router.post('/', verifyToken, verifyCustomer, orderController.createOrder);
router.get('/my-orders', verifyToken, verifyCustomer, orderController.getMyOrders);
// Admin routes
router.get('/admin/all', verifyToken, verifyAdminOrStaff, orderController.getAllOrders);
router.get('/admin/:id', verifyToken, verifyAdminOrStaff, orderController.getAdminOrderById);
router.put('/admin/:id/status', verifyToken, verifyAdminOrStaff, orderController.updateOrderStatus);
router.delete('/admin/:id', verifyToken, verifyAdmin, orderController.deleteOrder);
router.get('/:id', verifyToken, verifyCustomer, orderController.getOrderById);
router.put('/:id/cancel', verifyToken, verifyCustomer, cancelOrder);

module.exports = router;
