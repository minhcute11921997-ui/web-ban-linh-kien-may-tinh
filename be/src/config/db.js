const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        console.log('🔄 Đang kết nối MongoDB...'); // Thêm dòng này để biết hàm có chạy không
        console.log('URI:', process.env.MONGODB_URI); // In URI ra xem có đúng không
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Kết nối MongoDB thành công!');
    } catch (error) {
        console.error('❌ Lỗi kết nối MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
