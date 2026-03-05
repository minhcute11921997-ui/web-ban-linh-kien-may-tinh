const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./src/config/db'); // Import hàm kết nối MongoDB

const app = express();

// ket noi
connectDB();

// Middleware
app.use(cors());
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

const orderRoutes = require('./src/routes/order');
app.use('/api/orders', orderRoutes);

// Route test server
app.get('/', (req, res) => {
    res.json({ message: '🚀 Backend API đang chạy!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
