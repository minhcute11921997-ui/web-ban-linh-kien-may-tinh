const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./src/config/db');
const app = express();

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));


app.use(express.json());

// Import middleware xác thực token
const { verifyToken } = require('./src/middleware/auth');

// Routes
const authRoutes = require('./src/routes/auth');
app.use('/api/auth', authRoutes);

const productRoutes = require('./src/routes/product');
app.use('/api/products', productRoutes);

const categoryRoutes = require('./src/routes/category');
app.use('/api/categories', categoryRoutes);

const cartRoutes = require('./src/routes/cart');
app.use('/api/cart', cartRoutes);

const shippingRoutes = require('./src/routes/shipping');
app.use('/api/shipping', shippingRoutes);

const checkoutRoutes = require('./src/routes/checkout');
app.use('/api/checkout', checkoutRoutes);

const orderRoutes = require('./src/routes/order');
app.use('/api/orders', orderRoutes);

const paymentRoutes = require('./src/routes/payment');
app.use('/api/payments', paymentRoutes);

const discountRoutes = require('./src/routes/discount');
app.use('/api/discounts', discountRoutes);

const userRoutes = require('./src/routes/user');
app.use('/api/users', userRoutes);

const dashboardRoutes = require('./src/routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

const addressRoutes = require('./src/routes/address');
app.use('/api/addresses', addressRoutes);

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const reviewRoutes = require('./src/routes/review');
app.use('/api/reviews', reviewRoutes);

const cleanExpiredSales = async () => {
  try {
    await db.query(
      `UPDATE products 
       SET discount_percent = 0, discount_expires_at = NULL,flash_sale_qty = NULL 
       WHERE discount_percent > 0 
       AND discount_expires_at IS NOT NULL 
       AND discount_expires_at < NOW()`
    );
  } catch (err) {
    console.error('Clean expired sales error:', err);
  }
};

const cleanExpiredRefreshTokens = async () => {
  try {
    const [result] = await db.query(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
    );
    if (result.affectedRows > 0) {
      console.log(`Cleaned ${result.affectedRows} expired refresh tokens`);
    }
  } catch (err) {
    console.error('Clean expired refresh tokens error:', err);
  }
};

cleanExpiredSales();
cleanExpiredRefreshTokens();

setInterval(cleanExpiredSales, 60 * 1000);
setInterval(cleanExpiredRefreshTokens, 24 * 60 * 60 * 1000);
app.get('/', (req, res) => {
  res.json({ message: ' Backend API đang chạy!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
