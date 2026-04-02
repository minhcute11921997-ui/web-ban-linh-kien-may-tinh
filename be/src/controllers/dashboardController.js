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
    const [[{ outOfStock }]] = await db.query(
      "SELECT COUNT(*) as outOfStock FROM products WHERE stock = 0"
    );
    const [revenueByHour] = await db.query(
      `SELECT HOUR(created_at) as hour, COALESCE(SUM(total_price), 0) as revenue
       FROM orders
       WHERE status = 'delivered'
       AND DATE(created_at) = CURDATE()
       GROUP BY HOUR(created_at)
       ORDER BY hour ASC`
    );
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
        outOfStock,
        revenueByHour,
        recentOrders,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

exports.getRevenueReport = async (req, res) => {
  try {
    const range = req.query.range || "day";
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    let sql = "";
    let params = [];

    if (range === "day") {
      sql = `
        SELECT DATE(created_at) AS label,
          COALESCE(SUM(total_price), 0) AS revenue,
          COUNT(*) AS orders
        FROM orders WHERE status = 'delivered' AND MONTH(created_at) = ?
          AND YEAR(created_at)  = ?
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
        
      `;
      params = [month, year];
    } else if (range === "month") {
      sql = `
        SELECT MONTH(created_at) AS label,
          COALESCE(SUM(total_price), 0) AS revenue,
          COUNT(*) AS orders
        FROM orders
        WHERE status = 'delivered'
          AND YEAR(created_at) = ?
        GROUP BY MONTH(created_at)
        ORDER BY MONTH(created_at) ASC
      `;
      params = [year];
    } else {
      return res.status(400).json({ success: false, message: "range không hợp lệ" });
    }

    const [rows] = await db.query(sql);
    res.json({ success: true, data: rows.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};