USE ecommerce_db;

ALTER TABLE orders CHANGE total_amount total_price DECIMAL(15,2) NOT NULL;

ALTER TABLE orders
  ADD COLUMN payment_status ENUM('pending','completed','failed') DEFAULT 'pending' AFTER payment_method,
  ADD COLUMN transaction_id VARCHAR(255) DEFAULT NULL AFTER notes,
  ADD COLUMN customer_name VARCHAR(255) DEFAULT NULL,
  ADD COLUMN customer_phone VARCHAR(20) DEFAULT NULL,
  ADD COLUMN shipping_fee DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN discount_amount DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

