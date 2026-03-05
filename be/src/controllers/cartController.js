const Cart = require('../models/Cart');       
const Product = require('../models/Product'); 
// XEM giỏ hàng của user đang đăng nhập
exports.getCart = async (req, res) => {
    try {
        // Tìm giỏ hàng theo userId từ token, populate để lấy thông tin sản phẩm kèm theo
        const cart = await Cart.findOne({ user: req.user.userId })
            .populate('items.product', 'name price image_url stock'); // Lấy các trường cần thiết của sản phẩm

        if (!cart) {
            return res.json({ success: true, data: { items: [], total: 0 } }); // Giỏ hàng trống
        }

        // Tính tổng tiền giỏ hàng
        const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        res.json({ success: true, data: { ...cart.toObject(), total } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// THÊM sản phẩm vào giỏ hàng
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        // Kiểm tra sản phẩm có tồn tại không
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        // Kiểm tra số lượng tồn kho có đủ không
        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Số lượng tồn kho không đủ' });
        }

        // Tìm giỏ hàng của user, nếu chưa có thì tạo mới
        let cart = await Cart.findOne({ user: req.user.userId });
        if (!cart) {
            cart = new Cart({ user: req.user.userId, items: [] });
        }

        // Kiểm tra sản phẩm đã có trong giỏ hàng chưa
        const existingItem = cart.items.find(
            item => item.product.toString() === productId // So sánh ObjectId dạng string
        );

        if (existingItem) {
            existingItem.quantity += quantity; // Nếu có rồi → cộng thêm số lượng
        } else {
            // Nếu chưa có → thêm sản phẩm mới vào giỏ với giá hiện tại
            cart.items.push({ product: productId, quantity, price: product.price });
        }

        await cart.save(); // Lưu giỏ hàng vào MongoDB

        res.json({ success: true, message: 'Thêm vào giỏ hàng thành công!', data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// CẬP NHẬT số lượng sản phẩm trong giỏ
exports.updateCartItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        const itemId = req.params.id; // ID của item trong giỏ hàng

        if (quantity < 1) {
            return res.status(400).json({ success: false, message: 'Số lượng phải lớn hơn 0' });
        }

        const cart = await Cart.findOne({ user: req.user.userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy giỏ hàng' });
        }

        // Tìm item trong giỏ hàng theo id của item
        const item = cart.items.id(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ' });
        }

        item.quantity = quantity; // Cập nhật số lượng mới
        await cart.save();

        res.json({ success: true, message: 'Cập nhật giỏ hàng thành công!', data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// XOÁ 1 sản phẩm khỏi giỏ hàng
exports.removeFromCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy giỏ hàng' });
        }

        // Lọc bỏ item có id trùng với id cần xoá
        cart.items = cart.items.filter(item => item._id.toString() !== req.params.id);
        await cart.save();

        res.json({ success: true, message: 'Xoá sản phẩm khỏi giỏ thành công!', data: cart });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// XOÁ TOÀN BỘ giỏ hàng
exports.clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy giỏ hàng' });
        }

        cart.items = []; // Xoá hết tất cả items trong giỏ
        await cart.save();

        res.json({ success: true, message: 'Đã xoá toàn bộ giỏ hàng!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
