import { useEffect, useState } from "react";
import { getDashboardStats } from "../../api/dashboardApi";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard,
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
  Package,
  Users,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";

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
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_ICON = {
  pending: <Clock size={11} />,
  processing: <Cog size={11} />,
  shipped: <Truck size={11} />,
  delivered: <CheckCircle size={11} />,
  cancelled: <XCircle size={11} />,
};

const fmtY = (v) => {
  if (v >= 1000000) return (v / 1000000).toFixed(0) + "tr";
  if (v >= 1000) return (v / 1000).toFixed(0) + "k";
  return v;
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

const StatCard = ({ icon, label, value, hint, color = "blue" }) => {
  const colorClass = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    indigo: "bg-indigo-50 text-indigo-600",
  }[color];

  return (
    <div className="bg-white rounded-xl border border-blue-50 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
          {icon}
        </span>
      </div>
    </div>
  );
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
      .then((r) => setStats(r.data.data))
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
  (stats?.revenueByHour || []).forEach((r) => {
    revenueMap[r.hour] = Number(r.revenue);
  });
  const chartData = Array.from({ length: 24 }, (_, h) => ({
    date: `${String(h).padStart(2, "0")}:00`,
    revenue: revenueMap[h] || 0,
  }));
  const statusMap = {};
  (stats?.ordersByStatus || []).forEach((row) => {
    statusMap[row.status] = Number(row.count || 0);
  });

  return (
    <div>
      {/* Tiêu đề trang */}
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800 mb-6">
        <LayoutDashboard size={24} className="text-blue-600" />
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<DollarSign size={20} />}
          label="Doanh thu hôm nay"
          value={formatMoney(stats?.todayRevenue)}
          hint={`Tháng này: ${formatMoney(stats?.monthRevenue)}`}
          color="green"
        />
        <StatCard
          icon={<ShoppingCart size={20} />}
          label="Đơn hôm nay"
          value={Number(stats?.todayOrders || 0).toLocaleString("vi-VN")}
          hint={`Tổng đơn: ${Number(stats?.totalOrders || 0).toLocaleString("vi-VN")}`}
          color="blue"
        />
        <StatCard
          icon={<Users size={20} />}
          label="Khách hàng"
          value={Number(stats?.totalUsers || 0).toLocaleString("vi-VN")}
          hint={`Đơn chờ xử lý: ${Number(stats?.pendingOrders || 0).toLocaleString("vi-VN")}`}
          color="indigo"
        />
        <StatCard
          icon={<Package size={20} />}
          label="Sản phẩm"
          value={Number(stats?.totalProducts || 0).toLocaleString("vi-VN")}
          hint={`Hết hàng: ${Number(stats?.outOfStock || 0).toLocaleString("vi-VN")}`}
          color={Number(stats?.outOfStock || 0) > 0 ? "red" : "amber"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {["pending", "processing", "shipped", "delivered"].map((status) => (
          <div key={status} className="bg-white rounded-xl border border-blue-50 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-500">
                {STATUS_ICON[status]}
                {STATUS_LABEL[status] || status}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[status] || "bg-gray-100 text-gray-600"}`}>
                {Number(statusMap[status] || 0).toLocaleString("vi-VN")}
              </span>
            </div>
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
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eff6ff" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              interval={1}
            />
            <YAxis
              tickFormatter={fmtY}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#16a34a"
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-blue-50 overflow-hidden">
          <div className="px-6 py-4 border-b border-blue-50 flex items-center gap-2">
            <Package size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-800">Sản phẩm bán chạy</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-50/60 text-gray-500">
                <th className="text-left px-6 py-3 font-medium">Sản phẩm</th>
                <th className="text-left px-6 py-3 font-medium">Đã bán</th>
                <th className="text-left px-6 py-3 font-medium">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.topProducts || []).map((product) => (
                <tr key={product.id} className="border-t border-blue-50">
                  <td className="px-6 py-3 font-medium text-gray-800">{product.name}</td>
                  <td className="px-6 py-3 text-gray-600">
                    {Number(product.soldQuantity || 0).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-6 py-3 font-semibold text-blue-600">
                    {formatMoney(product.revenue)}
                  </td>
                </tr>
              ))}
              {(!stats?.topProducts || stats.topProducts.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <AlertTriangle size={30} strokeWidth={1.5} />
                      <span className="text-sm">Chưa có dữ liệu bán hàng</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-blue-50 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
            <DollarSign size={20} className="text-green-500" />
            Giá trị đơn trung bình
          </h2>
          <p className="text-3xl font-bold text-gray-800">
            {formatMoney(stats?.averageOrderValue)}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Tính trên các đơn đã giao thành công.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-green-50 px-4 py-3">
              <p className="text-xs text-green-600">Tổng doanh thu</p>
              <p className="text-lg font-bold text-green-700">{formatMoney(stats?.totalRevenue)}</p>
            </div>
            <div className="rounded-xl bg-blue-50 px-4 py-3">
              <p className="text-xs text-blue-600">Đơn đã giao</p>
              <p className="text-lg font-bold text-blue-700">
                {Number(statusMap.delivered || 0).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
        </div>
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
            {(stats?.recentOrders || []).map((order) => (
              <tr
                key={order.id}
                className="border-t border-blue-50 hover:bg-blue-50/30 transition-colors"
              >
                <td className="px-6 py-3 font-medium text-gray-800">
                  #{order.id}
                </td>
                <td className="px-6 py-3">
                  <p className="font-medium text-gray-700">{order.full_name}</p>
                  <p className="text-xs text-gray-400">{order.email}</p>
                </td>
                <td className="px-6 py-3 font-semibold text-blue-600">
                  {Number(order.total_price).toLocaleString("vi-VN")}₫
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`flex items-center gap-1 w-fit text-xs px-2.5 py-1 rounded-full font-medium ${
                      STATUS_COLOR[order.status] || "bg-gray-100 text-gray-600"
                    }`}
                  >
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
