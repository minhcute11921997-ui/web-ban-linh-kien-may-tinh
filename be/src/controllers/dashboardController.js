const db = require("../config/db");

exports.getStats = async (req, res) => {
  try {
    const [[{ totalProducts }]] = await db.query(
      "SELECT COUNT(*) as totalProducts FROM products"
    );
    const [[{ totalOrders }]] = await db.query(
      "SELECT COUNT(*) as totalOrders FROM orders"
    );
    const [[{ totalRevenue }]] = await db.query(
      "SELECT COALESCE(SUM(total_price), 0) as totalRevenue FROM orders WHERE status = 'delivered'"
    );
    const [[{ totalUsers }]] = await db.query(
      "SELECT COUNT(*) as totalUsers FROM users"
    );
    const [[{ pendingOrders }]] = await db.query(
      "SELECT COUNT(*) as pendingOrders FROM orders WHERE status = 'pending'"
    );

    // ✅ Doanh thu hôm nay
    const [[{ todayRevenue }]] = await db.query(
      `SELECT COALESCE(SUM(total_price), 0) as todayRevenue 
             FROM orders 
             WHERE status = 'delivered' 
             AND DATE(created_at) = CURDATE()`
    );

    // ✅ Số sản phẩm hết hàng
    const [[{ outOfStock }]] = await db.query(
      "SELECT COUNT(*) as outOfStock FROM products WHERE stock = 0"
    );

    res.json({
      success: true,
      data: {
        totalProducts,
        totalOrders,
        totalRevenue,
        totalUsers,
        pendingOrders,
        todayRevenue,
        outOfStock,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
};
