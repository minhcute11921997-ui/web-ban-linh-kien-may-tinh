const Order = require('../models/Order');   // Import Order model
const Cart = require('../models/Cart');     // Import Cart model để lấy giỏ hàng khi đặt hàng
const Product = require('../models/Product'); // Import Product model để trừ tồn kho

// TẠO đơn hàng mới từ giỏ hàng
exports.createOrder = async (req, res) => {
    try {
        const { shipping_address } = req.body;

        if (!shipping_address) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ giao hàng' });
        }

        // Lấy giỏ hàng hiện tại của user
        const cart = await Cart.findOne({ user: req.user.userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
        }

        // Tính tổng tiền và tạo danh sách sản phẩm trong đơn hàng
        let total_price = 0;
        const orderItems = [];

        for (const item of cart.items) {
            // Kiểm tra tồn kho từng sản phẩm trước khi đặt
            if (item.product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm "${item.product.name}" không đủ hàng trong kho`
                });
            }

            orderItems.push({
                product: item.product._id,  // ID sản phẩm
                quantity: item.quantity,     // Số lượng
                price: item.price,           // Giá tại thời điểm đặt hàng
            });

            total_price += item.price * item.quantity; // Cộng dồn tổng tiền

            // Trừ tồn kho sản phẩm sau khi đặt hàng thành công
            await Product.findByIdAndUpdate(item.product._id, {
                $inc: { stock: -item.quantity } // $inc giảm stock đi số lượng đã đặt
            });
        }

        // Tạo đơn hàng mới và lưu vào MongoDB
        const newOrder = new Order({
            user: req.user.userId,
            items: orderItems,
            total_price,
            shipping_address,
            status: 'pending' // Trạng thái mặc định là chờ xử lý
        });
        await newOrder.save();

        // Xoá giỏ hàng sau khi đặt hàng thành công
        cart.items = [];
        await cart.save();

        res.status(201).json({ success: true, message: 'Đặt hàng thành công!', data: newOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// LẤY đơn hàng của user đang đăng nhập
exports.getMyOrders = async (req, res) => {
    try {
        // Tìm tất cả đơn hàng của user, populate để lấy tên sản phẩm kèm theo
        const orders = await Order.find({ user: req.user.userId })
            .populate('items.product', 'name image_url') // Lấy tên và ảnh sản phẩm
            .sort({ createdAt: -1 }); // Sắp xếp mới nhất lên đầu

        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// LẤY chi tiết 1 đơn hàng theo ID
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.product', 'name image_url price') // Lấy thông tin sản phẩm
            .populate('user', 'username email full_name');     // Lấy thông tin user đặt hàng

        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        // Chỉ cho phép xem đơn hàng của chính mình hoặc admin
        if (order.user._id.toString() !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem đơn hàng này' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// [ADMIN] LẤY TẤT CẢ đơn hàng
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'username email full_name') // Lấy thông tin user
            .populate('items.product', 'name')            // Lấy tên sản phẩm
            .sort({ createdAt: -1 });                     // Mới nhất lên đầu

        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// [ADMIN] CẬP NHẬT trạng thái đơn hàng
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;

        // Kiểm tra trạng thái hợp lệ
        const validStatus = ['pending', 'processing', 'shipping', 'delivered', 'cancelled'];
        if (!validStatus.includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }

        // Tìm và cập nhật trạng thái đơn hàng
        const updated = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true } // Trả về document sau khi cập nhật
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        res.json({ success: true, message: 'Cập nhật trạng thái thành công!', data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// [ADMIN] XOÁ đơn hàng
exports.deleteOrder = async (req, res) => {
    try {
        const deleted = await Order.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        res.json({ success: true, message: 'Xoá đơn hàng thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
