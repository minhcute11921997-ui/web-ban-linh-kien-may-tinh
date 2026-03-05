const db = require('../config/db');

exports.getCart = async (req, res) => {
    try {
        const [items] = await db.query(
            `SELECT ci.id, ci.quantity, ci.price, p.name, p.image_url, p.stock
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.id
             WHERE ci.user_id = ?`,
            [req.user.userId]
        );

        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        res.json({ success: true, data: { items, total } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        const [products] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        const product = products[0];
        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Số lượng tồn kho không đủ' });
        }

        const [existing] = await db.query(
            'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
            [req.user.userId, productId]
        );

        if (existing.length > 0) {
            await db.query(
                'UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
                [quantity, req.user.userId, productId]
            );
        } else {
            await db.query(
                'INSERT INTO cart_items (user_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [req.user.userId, productId, quantity, product.price]
            );
        }

        res.json({ success: true, message: 'Thêm vào giỏ hàng thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        if (quantity < 1) {
            return res.status(400).json({ success: false, message: 'Số lượng phải lớn hơn 0' });
        }

        const [result] = await db.query(
            'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
            [quantity, req.params.id, req.user.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ' });
        }

        res.json({ success: true, message: 'Cập nhật giỏ hàng thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.removeFromCart = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ' });
        }

        res.json({ success: true, message: 'Xoá sản phẩm khỏi giỏ thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.clearCart = async (req, res) => {
    try {
        await db.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.userId]);
        res.json({ success: true, message: 'Đã xoá toàn bộ giỏ hàng!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
