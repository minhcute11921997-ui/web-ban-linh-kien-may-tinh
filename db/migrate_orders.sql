-- Migration: Thêm các cột còn thiếu vào bảng orders
USE ecommerce_db;

-- Thêm cột shipping info nếu chưa có
ALTER TABLE orders
  ADD COLUMN customer_name VARCHAR(255) DEFAULT NULL AFTER notes,
  ADD COLUMN customer_phone VARCHAR(20) DEFAULT NULL AFTER customer_name,
  ADD COLUMN shipping_address TEXT DEFAULT NULL AFTER customer_phone,
  ADD COLUMN shipping_fee DECIMAL(15,2) DEFAULT 0 AFTER shipping_address,
  ADD COLUMN discount_amount DECIMAL(15,2) DEFAULT 0 AFTER shipping_fee;

-- Thêm cột status (alias của order_status) nếu bảng orders dùng cột 'status' riêng
-- (orderController.js dùng 'status', paymentController dùng 'order_status' => chuẩn hoá về order_status)
-- Nếu đang dùng cột 'status' cũ, đổi tên:
-- ALTER TABLE orders CHANGE COLUMN status order_status ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending';

SELECT 'Migration hoàn thành!' AS result;
