const db = require('../config/db');

// Lấy thống kê tổng quan cho dashboard
exports.getStats = async (req, res) => {
    try {
        const [[{ totalProducts }]] = await db.query('SELECT COUNT(*) as totalProducts FROM products');
        const [[{ totalOrders }]] = await db.query('SELECT COUNT(*) as totalOrders FROM orders');
        const [[{ totalRevenue }]] = await db.query(
            "SELECT COALESCE(SUM(total_price), 0) as totalRevenue FROM orders WHERE status = 'delivered'"
        );
        const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) as totalUsers FROM users');
        const [[{ pendingOrders }]] = await db.query(
            "SELECT COUNT(*) as pendingOrders FROM orders WHERE status = 'pending'"
        );

        // Đơn hàng gần đây (5 đơn)
        const [recentOrders] = await db.query(
            `SELECT o.id, o.total_price, o.status, o.created_at, u.full_name, u.email
             FROM orders o JOIN users u ON o.user_id = u.id
             ORDER BY o.created_at DESC LIMIT 5`
        );

        res.json({
            success: true,
            data: {
                totalProducts,
                totalOrders,
                totalRevenue,
                totalUsers,
                pendingOrders,
                recentOrders
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};
