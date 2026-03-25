import { useEffect, useState } from "react";
import { getDashboardStats } from "../../api/dashboardApi";
import { useNavigate } from "react-router-dom";

const STATUS_LABEL = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  shipped: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

const STATUS_COLOR = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getDashboardStats();
        setStats(res.data.data);
      } catch {
        console.error("Không thể tải thống kê");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Đang tải...</div>
      </div>
    );

  const cards = [
    {
      label: "Sản phẩm",
      value: stats?.totalProducts || 0,
      icon: "",
      color: "from-blue-500 to-blue-600",
      link: "/admin/products",
    },
    {
      label: "Đơn hàng",
      value: stats?.totalOrders || 0,
      icon: "",
      color: "from-purple-500 to-purple-600",
      link: "/admin/orders",
    },
    {
      label: "Doanh thu",
      value: `${Number(stats?.totalRevenue || 0).toLocaleString("vi-VN")}₫`,
      icon: "",
      color: "from-green-500 to-green-600",
      link: null,
    },
    {
      label: "Người dùng",
      value: stats?.totalUsers || 0,
      icon: "",
      color: "from-orange-500 to-orange-600",
      link: "/admin/users",
    },
    {
      label: "Doanh thu hôm nay",
      value: `${Number(stats?.todayRevenue || 0).toLocaleString("vi-VN")}₫`,
      color: "from-teal-500 to-teal-600",
      link: null,
    },
    {
      label: "🔴 Hết hàng",
      value: stats?.outOfStock || 0,
      color: "from-red-500 to-red-600",
      link: "/admin/products",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cards.map((card, i) => (
          <div
            key={i}
            onClick={() => card.link && navigate(card.link)}
            className={`bg-gradient-to-br ${
              card.color
            } rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-200 ${
              card.link ? "cursor-pointer hover:scale-[1.02]" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              {stats?.pendingOrders > 0 && card.label === "Đơn hàng" && (
                <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                  {stats.pendingOrders} chờ xử lý
                </span>
              )}
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm text-white/80 mt-1">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
