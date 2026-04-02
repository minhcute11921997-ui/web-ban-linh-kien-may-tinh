const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

//Public routes
// Validate mã giảm giá (dùng khi checkout)
router.get('/validate', discountController.validateDiscount);

// Lấy danh sách mã còn hiệu lực (hiển thị cho user chọn)
router.get('/available', discountController.getAvailableDiscounts);

// Admin routes
// Lấy tất cả mã (kể cả hết hạn, inactive)
router.get('/admin/all', verifyToken, verifyAdmin, discountController.adminGetAll);

// Tạo mã mới
router.post('/admin', verifyToken, verifyAdmin, discountController.adminCreate);

// Cập nhật mã
router.put('/admin/:id', verifyToken, verifyAdmin, discountController.adminUpdate);

// Xóa mã
router.delete('/admin/:id', verifyToken, verifyAdmin, discountController.adminDelete);

module.exports = router;