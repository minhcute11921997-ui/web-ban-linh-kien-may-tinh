import { useEffect, useState } from "react";
import { getDashboardStats } from "../../api/dashboardApi";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  PackageX,
  BarChart2,
  ClipboardList,
  ArrowRight,
  Loader2,
  InboxIcon,
  Clock,
  Cog,
  Truck,
  CheckCircle,
  XCircle,
} from "lucide-react";

const STATUS_LABEL = {
  pending:    "Chờ xử lý",
  processing: "Đang xử lý",
  shipped:    "Đang giao",
  delivered:  "Đã giao",
  cancelled:  "Đã hủy",
};
const STATUS_COLOR = {
  pending:    "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  shipped:    "bg-indigo-100 text-indigo-700",
  delivered:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-700",
};
const STATUS_ICON = {
  pending:    <Clock size={11} />,
  processing: <Cog size={11} />,
  shipped:    <Truck size={11} />,
  delivered:  <CheckCircle size={11} />,
  cancelled:  <XCircle size={11} />,
};

const fmtY = (v) => {
  if (v >= 1000000) return (v / 1000000).toFixed(0) + "tr";
  if (v >= 1000) return (v / 1000).toFixed(0) + "k";
  return v;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length)
    return (
      <div className="bg-white border border-blue-100 rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="text-gray-500 mb-1">{label}</p>
        <p className="font-bold text-blue-600">
          {Number(payload[0].value).toLocaleString("vi-VN")}₫
        </p>
      </div>
    );
  return null;
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardStats()
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <span className="text-sm">Đang tải dữ liệu...</span>
      </div>
    );

  const revenueMap = {};
  (stats?.revenueByHour || []).forEach(r => { revenueMap[r.hour] = Number(r.revenue); });
  const chartData = Array.from({ length: 24 }, (_, h) => ({
    date: `${String(h).padStart(2, "0")}:00`,
    revenue: revenueMap[h] || 0,
  }));

  const cards = [
    {
      label: "Sản phẩm",
      value: stats?.totalProducts || 0,
      icon: <Package size={22} className="text-white/80" />,
      color: "from-blue-500 to-blue-600",
      link: "/admin/products",
    },
    {
      label: "Đơn hàng",
      value: stats?.totalOrders || 0,
      icon: <ShoppingBag size={22} className="text-white/80" />,
      color: "from-blue-600 to-blue-700",
      link: "/admin/orders",
      badge: stats?.pendingOrders > 0 ? `${stats.pendingOrders} chờ xử lý` : null,
    },
    {
      label: "Doanh thu",
      value: `${Number(stats?.totalRevenue || 0).toLocaleString("vi-VN")}₫`,
      icon: <TrendingUp size={22} className="text-white/80" />,
      color: "from-blue-700 to-indigo-700",
      link: "/admin/revenue",
    },
    {
      label: "Người dùng",
      value: stats?.totalUsers || 0,
      icon: <Users size={22} className="text-white/80" />,
      color: "from-indigo-500 to-indigo-600",
      link: "/admin/users",
    },
    {
      label: "Hết hàng",
      value: stats?.outOfStock || 0,
      icon: <PackageX size={22} className="text-white/80" />,
      color: "from-red-500 to-red-600",
      link: "/admin/products",
    },
  ];

  return (
    <div>

      {/* Tiêu đề trang */}
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800 mb-6">
        <LayoutDashboard size={24} className="text-blue-600" />
        Dashboard
      </h1>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
        {cards.map((card, i) => (
          <div
            key={i}
            onClick={() => card.link && navigate(card.link)}
            className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-[1.02]`}
          >
            <div className="flex justify-between items-start mb-2">
              {card.icon}
              {card.badge && (
                <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                  {card.badge}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm text-white/80 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Biểu đồ doanh thu theo giờ */}
      <div className="bg-white rounded-2xl shadow-sm border border-blue-50 p-6 mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
          <BarChart2 size={20} className="text-blue-500" />
          Doanh thu hôm nay ({new Date().toLocaleDateString("vi-VN")})
        </h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#16a34a" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eff6ff" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} interval={1} />
            <YAxis tickFormatter={fmtY} tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone" dataKey="revenue"
              stroke="#16a34a" strokeWidth={2}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Đơn hàng gần đây */}
      <div className="bg-white rounded-2xl shadow-sm border border-blue-50 overflow-hidden">
        <div className="px-6 py-4 border-b border-blue-50 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <ClipboardList size={20} className="text-blue-500" />
            Đơn hàng gần đây
          </h2>
          <button
            onClick={() => navigate("/admin/orders")}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer transition-colors"
          >
            Xem tất cả
            <ArrowRight size={15} />
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-50/60 text-gray-500">
              <th className="text-left px-6 py-3 font-medium">Đơn #</th>
              <th className="text-left px-6 py-3 font-medium">Khách hàng</th>
              <th className="text-left px-6 py-3 font-medium">Tổng tiền</th>
              <th className="text-left px-6 py-3 font-medium">Trạng thái</th>
              <th className="text-left px-6 py-3 font-medium">Ngày</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.recentOrders || []).map(order => (
              <tr key={order.id} className="border-t border-blue-50 hover:bg-blue-50/30 transition-colors">
                <td className="px-6 py-3 font-medium text-gray-800">#{order.id}</td>
                <td className="px-6 py-3">
                  <p className="font-medium text-gray-700">{order.full_name}</p>
                  <p className="text-xs text-gray-400">{order.email}</p>
                </td>
                <td className="px-6 py-3 font-semibold text-blue-600">
                  {Number(order.total_price).toLocaleString("vi-VN")}₫
                </td>
                <td className="px-6 py-3">
                  <span className={`flex items-center gap-1 w-fit text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[order.status] || "bg-gray-100 text-gray-600"}`}>
                    {STATUS_ICON[order.status]}
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-500">
                  {new Date(order.created_at).toLocaleDateString("vi-VN")}
                </td>
              </tr>
            ))}
            {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <InboxIcon size={32} strokeWidth={1.5} />
                    <span className="text-sm">Chưa có đơn hàng nào</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default AdminDashboard;