const db = require('../config/db');

exports.getCart = async (req, res) => {
    try {
        // Lấy hoặc tạo cart cho user
        let [carts] = await db.query('SELECT id FROM cart WHERE user_id = ?', [req.user.userId]);
        let cartId;
        if (carts.length === 0) {
            const [result] = await db.query('INSERT INTO cart (user_id) VALUES (?)', [req.user.userId]);
            cartId = result.insertId;
        } else {
            cartId = carts[0].id;
        }

        const [items] = await db.query(
    `SELECT ci.id,ci.product_id, ci.quantity,
        p.name, p.image_url, p.stock,
        p.price AS original_price,
        p.discount_percent,
        CASE
            WHEN p.discount_percent > 0 
              AND (p.discount_expires_at IS NULL OR p.discount_expires_at > NOW())
            THEN ROUND(p.price * (1 - p.discount_percent / 100))
            ELSE p.price
        END AS price
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.cart_id = ?`,
    [cartId]
);

        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        res.json({ success: true, data: { items, total } });
    } catch (error) {
        console.error('Lỗi getCart:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

exports.addToCart = async (req, res) => {
    try {
        
        const { productId } = req.body;
        const quantity = Number(req.body.quantity ?? 1);

        // Validate inputs
        if (!productId) {
            console.error('productId is missing or invalid:', productId);
            return res.status(400).json({ success: false, message: 'Thiếu productId' });
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ success: false, message: 'So luong phai la so nguyen duong' });
        }

        if (!req.user) {
            console.error('req.user is undefined!');
            return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
        }

        if (!req.user.userId) {
            console.error('userId missing in token. Token contents:', req.user);
            return res.status(401).json({ success: false, message: 'Token không có userId' });
        }

        // Check if product exists
        const [products] = await db.query('SELECT id, stock, price FROM products WHERE id = ?', [productId]);
        
        if (!products || products.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        }

        const product = products[0];
        
        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Số lượng tồn kho không đủ' });
        }

        // Lấy hoặc tạo cart cho user
        let [carts] = await db.query('SELECT id FROM cart WHERE user_id = ?', [req.user.userId]);
        
        let cartId;
        if (!carts || carts.length === 0) {
            try {
                const [result] = await db.query('INSERT INTO cart (user_id) VALUES (?)', [req.user.userId]);
                cartId = result.insertId;
            } catch (dbError) {
                console.error('Error creating cart:', dbError.message);
                return res.status(500).json({ success: false, message: 'Lỗi tạo giỏ hàng: ' + dbError.message });
            }
        } else {
            cartId = carts[0].id;
        }

        const [existing] = await db.query(
            'SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?',
            [cartId, productId]
        );

        if (existing && existing.length > 0) {
            await db.query(
                'UPDATE cart_items SET quantity = quantity + ? WHERE cart_id = ? AND product_id = ?',
                [quantity, cartId, productId]
            );
        } else {
            await db.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
                [cartId, productId, quantity]
            );
        }

        res.json({ success: true, message: 'Thêm vào giỏ hàng thành công!' });
    } catch (error) {
        console.error('Loi addToCart:', error);
        res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        const quantity = Number(req.body.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ success: false, message: 'Số lượng phải lớn hơn 0' });
        }

        const [carts] = await db.query('SELECT id FROM cart WHERE user_id = ?', [req.user.userId]);
        if (carts.length === 0) {
            return res.status(403).json({ success: false, message: 'Không có quyền thực hiện' });
        }

        // Lấy product_id từ cart_item để kiểm tra stock
        const [cartItems] = await db.query(
            'SELECT product_id FROM cart_items WHERE id = ? AND cart_id = ?',
            [req.params.id, carts[0].id]
        );
        if (cartItems.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ' });
        }

        //Kiểm tra stock thực tế trong database
        const [products] = await db.query(
            'SELECT stock FROM products WHERE id = ?',
            [cartItems[0].product_id]
        );
        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        if (quantity > products[0].stock) {
            return res.status(400).json({
                success: false,
                message: `Chỉ còn ${products[0].stock} sản phẩm trong kho`,
                maxStock: products[0].stock
            });
        }

        const [result] = await db.query(
            'UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?',
            [quantity, req.params.id, carts[0].id]
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
        const [carts] = await db.query('SELECT id FROM cart WHERE user_id = ?', [req.user.userId]);
        if (carts.length === 0) {
            return res.status(403).json({ success: false, message: 'Không có quyền thực hiện' });
        }

        const [result] = await db.query(
            'DELETE FROM cart_items WHERE id = ? AND cart_id = ?',
            [req.params.id, carts[0].id]
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
        // Lấy cart_id của user
        const [carts] = await db.query('SELECT id FROM cart WHERE user_id = ?', [req.user.userId]);
        
        if (carts.length > 0) {
            await db.query('DELETE FROM cart_items WHERE cart_id = ?', [carts[0].id]);
        }
        
        res.json({ success: true, message: 'Đã xoá toàn bộ giỏ hàng!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
