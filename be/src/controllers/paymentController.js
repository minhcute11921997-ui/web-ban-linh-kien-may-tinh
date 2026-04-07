const db = require('../config/db');
const { createVNPayUrl, verifyVNPayResponse } = require('../config/payment');
const { incrementUsedCount } = require('./discountController');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';


const getClientIp = (req) => {
    return (
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        '127.0.0.1'
    );
};

/**
 * Tạo order và trả về URL thanh toán
 * POST /api/payments/create-order
 */
exports.createOrder = async (req, res) => {
    try {
        const {
            paymentMethod,
            cartItemIds,
            customerName,
            customerPhone,
            customerAddress,
            customerNotes,
            shippingFee,
            discountAmount,
            discount_code, 
        } = req.body;
        const userId = req.user.userId;

        // Validate phương thức thanh toán
        if (!['cod', 'vnpay'].includes(paymentMethod)) {
            return res.status(400).json({ success: false, message: 'Phương thức thanh toán không hợp lệ' });
        }

        // Validate thông tin giao hàng
        if (!customerName || !customerPhone || !customerAddress) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin giao hàng' });
        }

        // Lấy giỏ hàng
        const [carts] = await db.query('SELECT * FROM cart WHERE user_id = ?', [userId]);
        if (carts.length === 0) {
            return res.status(404).json({ success: false, message: 'Giỏ hàng trống' });
        }
        const cartId = carts[0].id;

        // Lấy sản phẩm trong giỏ
        let cartItems;
        if (cartItemIds && cartItemIds.length > 0) {
            const placeholders = cartItemIds.map(() => '?').join(',');
            [cartItems] = await db.query(
                `SELECT ci.*, p.price, p.stock, p.name AS product_name_db
                 FROM cart_items ci
                 JOIN products p ON ci.product_id = p.id
                 WHERE ci.cart_id = ? AND ci.id IN (${placeholders})`,
                [cartId, ...cartItemIds]
            );
        } else {
            [cartItems] = await db.query(
                `SELECT ci.*, p.price, p.stock, p.name AS product_name_db
                 FROM cart_items ci
                 JOIN products p ON ci.product_id = p.id
                 WHERE ci.cart_id = ?`,
                [cartId]
            );
        }

        if (cartItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Giỏ hàng không có sản phẩm' });
        }

        // Kiểm tra tồn kho
        for (const item of cartItems) {
            if (item.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm "${item.product_name_db}" không đủ hàng trong kho (còn ${item.stock})`
                });
            }
        }

        // Tính tiền
        const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const fee = Number(shippingFee) || 0;
        const discount = Number(discountAmount) || 0;
        const totalPrice = Math.max(0, subtotal + fee - discount);

        // Tạo order
        const [orderResult] = await db.query(
            `INSERT INTO orders
             (user_id, total_price, payment_method, payment_status, status,
              customer_name, customer_phone, shipping_address, notes, shipping_fee, discount_amount, discount_code)
             VALUES (?, ?, ?, 'pending', 'pending', ?, ?, ?, ?, ?, ?, ?)`,
            [userId, totalPrice, paymentMethod, customerName, customerPhone, customerAddress, customerNotes || '', fee, discount, discount_code || null]
        );
        const orderId = orderResult.insertId;

        // Thêm order items và trừ tồn kho
        for (const item of cartItems) {
            await db.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, item.price]
            );
            await db.query(
                `UPDATE products SET stock = stock - ? WHERE id = ?`,
                [item.quantity, item.product_id]
            );
            await db.query(
                `UPDATE products SET flash_sale_qty = GREATEST(0, flash_sale_qty - ?)
                 WHERE id = ? AND flash_sale_qty IS NOT NULL AND discount_percent > 0`,
                [item.quantity, item.product_id]
            );
        }

        // Xóa các cart_items đã thanh toán
        if (cartItemIds && cartItemIds.length > 0) {
            const placeholders = cartItemIds.map(() => '?').join(',');
            await db.query(
                `DELETE FROM cart_items WHERE cart_id = ? AND id IN (${placeholders})`,
                [cartId, ...cartItemIds]
            );
        } else {
            await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
        }

        // Xử lý theo phương thức
        if (paymentMethod === 'cod') {
            await db.query(
                `UPDATE orders SET payment_status = 'pending', status = 'processing' WHERE id = ?`,
                [orderId]
            );

            if (discount_code) {
                await incrementUsedCount(discount_code, userId, orderId);
            }

            return res.json({
                success: true,
                message: 'Đặt hàng thành công!',
                orderId,
                totalPrice,
                paymentMethod: 'cod',
                paymentUrl: null
            });

        } else if (paymentMethod === 'vnpay') {
            const clientIp = getClientIp(req);
            const paymentUrl = createVNPayUrl({
                orderId: `${orderId}`,
                amount: totalPrice,
                orderDescription: `Thanh toan don hang ${orderId}`, 
                clientIp
            });

            console.log('=== FULL PAYMENT URL ===');
            console.log(paymentUrl);



            return res.json({
                success: true,
                message: 'Tạo đơn hàng thành công! Chuyển hướng đến VNPay...',
                orderId,
                totalPrice,
                paymentMethod: 'vnpay',
                paymentUrl
            });
        }

    } catch (error) {
        console.error('Lỗi tạo order:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

/**
 * GET /api/payments/vnpay-callback
 */
exports.vnpayCallback = async (req, res) => {
    try {
        const verifyResult = verifyVNPayResponse(req.query);

        if (!verifyResult.isValid) {
            return res.redirect(`${FRONTEND_URL}/payment-success?status=failed&reason=invalid_signature`);
        }

        if (verifyResult.responseCode !== '00') {
            // Hoàn lại tồn kho khi thanh toán thất bại
            const [orderItems] = await db.query(
                `SELECT product_id, quantity FROM order_items WHERE order_id = ?`,
                [verifyResult.orderId]
            );
            for (const item of orderItems) {
                await db.query(
                    `UPDATE products SET stock = stock + ? WHERE id = ?`,
                    [item.quantity, item.product_id]
                );
                await db.query(
                    `UPDATE products SET flash_sale_qty = flash_sale_qty + ?
                     WHERE id = ? AND flash_sale_qty IS NOT NULL AND discount_percent > 0`,
                    [item.quantity, item.product_id]
                );
            }
            await db.query(
                `UPDATE orders SET payment_status = 'failed', transaction_id = ? WHERE id = ?`,
                [verifyResult.transactionNo, verifyResult.orderId]
            );
            return res.redirect(`${FRONTEND_URL}/payment-success?status=failed&orderId=${verifyResult.orderId}&method=vnpay`);
        }

        await db.query(
            `UPDATE orders SET payment_status = 'completed', status = 'processing', transaction_id = ?
             WHERE id = ? AND payment_status != 'completed'`,
            [verifyResult.transactionNo, verifyResult.orderId]
        );
        const [orderRows] = await db.query(
            `SELECT user_id, discount_code FROM orders WHERE id = ?`,
            [verifyResult.orderId]
        );
        if (orderRows.length > 0 && orderRows[0].discount_code) {
            await incrementUsedCount(
                orderRows[0].discount_code,
                orderRows[0].user_id,
                verifyResult.orderId
            );
        }

        return res.redirect(`${FRONTEND_URL}/payment-success?orderId=${verifyResult.orderId}&method=vnpay`);

    } catch (error) {
        console.error('Lỗi callback VNPay:', error);
        return res.redirect(`${FRONTEND_URL}/payment-success?status=failed&reason=server_error`);
    }
};

/**
 * GET /api/payments/:orderId
 */
exports.getPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.userId;

        const [orders] = await db.query(
            `SELECT o.*,
                    oi.id AS item_id, oi.quantity, oi.price AS item_price,
                    p.name AS product_name, p.image_url
             FROM orders o
             LEFT JOIN order_items oi ON oi.order_id = o.id
             LEFT JOIN products p ON p.id = oi.product_id
             WHERE o.id = ? AND o.user_id = ?`,
            [orderId, userId]
        );

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
        }

        const order = orders[0];
        const items = orders
            .filter(r => r.item_id)
            .map(r => ({
                id: r.item_id,
                product_name: r.product_name,
                image_url: r.image_url,
                quantity: r.quantity,
                price: r.item_price
            }));

        res.json({
            success: true,
            data: {
                orderId: order.id,
                totalPrice: order.total_price,
                shippingFee: order.shipping_fee,
                discountAmount: order.discount_amount,
                paymentMethod: order.payment_method,
                paymentStatus: order.payment_status,
                orderStatus: order.status,
                transactionId: order.transaction_id,
                customerName: order.customer_name,
                customerPhone: order.customer_phone,
                shippingAddress: order.shipping_address,
                notes: order.notes,
                createdAt: order.created_at,
                items
            }
        });

    } catch (error) {
        console.error('Lỗi lấy status:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

/**
 * POST /api/payments/vnpay-ipn
 */
exports.vnpayIpn = async (req, res) => {
    try {
        const verifyResult = verifyVNPayResponse(req.query);

        if (!verifyResult.isValid) {
            return res.json({ RspCode: '97', Message: 'Invalid signature' });
        }

        // Kiểm tra đơn hàng tồn tại
        const [orders] = await db.query(
            'SELECT * FROM orders WHERE id = ?',
            [verifyResult.orderId]
        );

        if (orders.length === 0) {
            return res.json({ RspCode: '01', Message: 'Order not found' });
        }

        const order = orders[0];

        // Kiểm tra đã xử lý chưa (tránh duplicate)
        if (order.payment_status === 'completed') {
            return res.json({ RspCode: '02', Message: 'Order already confirmed' });
        }

        const vnpAmount = parseInt(req.query.vnp_Amount);
        const orderAmount = Math.round(Number(order.total_price) * 100);
        if (vnpAmount !== orderAmount) {
            return res.json({ RspCode: '04', Message: 'Invalid amount' });
        }

        if (verifyResult.responseCode === '00') {
            // Thanh toán thành công
            await db.query(
                `UPDATE orders SET payment_status = 'completed', status = 'processing',
                 transaction_id = ? WHERE id = ?`,
                [verifyResult.transactionNo, verifyResult.orderId]
            );

            if (order.discount_code) {
                await incrementUsedCount(order.discount_code, order.user_id, order.id);
            }

            return res.json({ RspCode: '00', Message: 'Confirm Success' });

        } else {
            // Thanh toán thất bại — hoàn lại tồn kho
            const [orderItems] = await db.query(
                'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
                [verifyResult.orderId]
            );
            for (const item of orderItems) {
                await db.query(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
                await db.query(
                    `UPDATE products SET flash_sale_qty = flash_sale_qty + ?
                     WHERE id = ? AND flash_sale_qty IS NOT NULL AND discount_percent > 0`,
                    [item.quantity, item.product_id]
                );
            }
            await db.query(
                `UPDATE orders SET payment_status = 'failed', transaction_id = ? WHERE id = ?`,
                [verifyResult.transactionNo, verifyResult.orderId]
            );
            return res.json({ RspCode: '00', Message: 'Confirm Success' });
        }

    } catch (error) {
        console.error('Lỗi IPN VNPay:', error);
        return res.json({ RspCode: '99', Message: 'Server error' });
    }
};