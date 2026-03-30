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

const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,                   // tối đa 10 lần login/15 phút
  message: { success: false, message: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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
const cleanExpiredSales = async () => {
  try {
    await db.query(
      `UPDATE products 
       SET discount_percent = 0, discount_expires_at = NULL 
       WHERE discount_percent > 0 
       AND discount_expires_at IS NOT NULL 
       AND discount_expires_at < NOW()`
    );
  } catch (err) {
    console.error('Clean expired sales error:', err);
  }
};
cleanExpiredSales();
setInterval(cleanExpiredSales, 60 * 1000);
app.get('/', (req, res) => {
    res.json({ message: ' Backend API đang chạy!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
