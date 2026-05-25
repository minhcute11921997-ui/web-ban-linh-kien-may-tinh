const db = require("../config/db");

exports.getStats = async (req, res) => {
  try {
    const [
      [[{ totalProducts }]],
      [[{ totalOrders }]],
      [[{ totalRevenue }]],
      [[{ totalUsers }]],
      [[{ pendingOrders }]],
      [[{ outOfStock }]],
      [[{ todayRevenue }]],
      [[{ monthRevenue }]],
      [[{ todayOrders }]],
      [[{ averageOrderValue }]],
      [ordersByStatus],
      [topProducts],
      [revenueByHour],
      [recentOrders],
    ] = await Promise.all([
      db.query("SELECT COUNT(*) as totalProducts FROM products"),
      db.query("SELECT COUNT(*) as totalOrders FROM orders"),
      db.query("SELECT COALESCE(SUM(total_price), 0) as totalRevenue FROM orders WHERE status = 'delivered'"),
      db.query("SELECT COUNT(*) as totalUsers FROM users"),
      db.query("SELECT COUNT(*) as pendingOrders FROM orders WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) as outOfStock FROM products WHERE stock = 0"),
      db.query("SELECT COALESCE(SUM(total_price), 0) as todayRevenue FROM orders WHERE status = 'delivered' AND DATE(created_at) = CURDATE()"),
      db.query("SELECT COALESCE(SUM(total_price), 0) as monthRevenue FROM orders WHERE status = 'delivered' AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())"),
      db.query("SELECT COUNT(*) as todayOrders FROM orders WHERE DATE(created_at) = CURDATE()"),
      db.query("SELECT COALESCE(AVG(total_price), 0) as averageOrderValue FROM orders WHERE status = 'delivered'"),
      db.query(
        `SELECT status, COUNT(*) as count
         FROM orders
         GROUP BY status
         ORDER BY count DESC`
      ),
      db.query(
        `SELECT p.id, p.name, p.image_url,
                COALESCE(SUM(oi.quantity), 0) as soldQuantity,
                COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status = 'delivered'
         GROUP BY p.id, p.name, p.image_url
         ORDER BY soldQuantity DESC, revenue DESC
         LIMIT 5`
      ),
      db.query(
        `SELECT HOUR(created_at) as hour, COALESCE(SUM(total_price), 0) as revenue
       FROM orders
       WHERE status = 'delivered'
       AND DATE(created_at) = CURDATE()
       GROUP BY HOUR(created_at)
       ORDER BY hour ASC`
      ),
      db.query(
        `SELECT o.id, o.total_price, o.status, o.created_at, u.full_name, u.email
       FROM orders o JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC LIMIT 5`
      ),
    ]);

    res.json({
      success: true,
      data: {
        totalProducts, totalOrders, totalRevenue,
        totalUsers, pendingOrders, outOfStock,
        todayRevenue, monthRevenue, todayOrders,
        averageOrderValue, ordersByStatus, topProducts,
        revenueByHour, recentOrders,
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

    // Validate range
    if (!["day", "month"].includes(range)) {
      return res.status(400).json({ success: false, message: "range không hợp lệ. Chỉ hỗ trợ: day, month" });
    }

    let sql = "";
    let params = [];

    if (range === "day") {
      sql = `
        SELECT DATE(created_at) AS label,
          COALESCE(SUM(total_price), 0) AS revenue,
          COUNT(*) AS orders
        FROM orders
        WHERE status = 'delivered'
          AND MONTH(created_at) = ?
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
    }

    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });

  } catch (error) {
    console.error("[getRevenueReport]", error);
    res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};
