const mongoose = require('mongoose');

// Định nghĩa cấu trúc của một User trong database
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }, 
    email:    { type: String, required: true, unique: true }, // Email, bắt buộc, không trùng
    password: { type: String, required: true },               
    full_name:{ type: String, default: '' },                 
    phone:    { type: String, default: '' },                  
    address:  { type: String, default: '' },                  
    role:     { type: String, enum: ['customer', 'admin'], default: 'customer' }, 
}, { timestamps: true }); // Tự động tạo createdAt và updatedAt

module.exports = mongoose.model('User', userSchema);
