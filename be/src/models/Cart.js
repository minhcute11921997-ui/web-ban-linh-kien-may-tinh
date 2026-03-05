const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, // Liên kết tới User
        ref: 'User', 
        required: true 
    },
    items: [{
        product: { 
            type: mongoose.Schema.Types.ObjectId, // Liên kết tới Product
            ref: 'Product', 
            required: true 
        },
        quantity: { type: Number, required: true, min: 1 }, // Số lượng, tối thiểu 1
        price:    { type: Number, required: true },          // Giá tại thời điểm thêm vào giỏ
    }],
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
