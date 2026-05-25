const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken, verifyCustomer } = require('../middleware/auth');

// POST /api/payments/create-order - Tạo order và lấy URL thanh toán
router.post('/create-order', verifyToken, verifyCustomer, paymentController.createOrder);
router.post('/:orderId/retry', verifyToken, verifyCustomer, paymentController.retryVNPayPayment);


// GET /api/payments/vnpay-callback - Callback từ VNPay
router.get('/vnpay-callback', paymentController.vnpayCallback);

router.get('/vnpay-ipn', paymentController.vnpayIpn);


// GET /api/payments/:orderId - Lấy trạng thái thanh toán
router.get('/:orderId', verifyToken, verifyCustomer, paymentController.getPaymentStatus);


module.exports = router;
