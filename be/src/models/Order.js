const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, // Liên kết tới User đặt hàng
        ref: 'User', 
        required: true 
    },
    items: [{
        product:  { 
            type: mongoose.Schema.Types.ObjectId, // Sản phẩm trong đơn hàng
            ref: 'Product' 
        },
        quantity: { type: Number, required: true }, 
        price:    { type: Number, required: true },  
    }],
    total_price:      { type: Number, required: true },  
    shipping_address: { type: String, required: true },  
    status: { 
        type: String, 
        enum: ['pending', 'processing', 'shipping', 'delivered', 'cancelled'], 
        default: 'pending'  // Trạng thái mặc định là "chờ xử lý"
    },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
