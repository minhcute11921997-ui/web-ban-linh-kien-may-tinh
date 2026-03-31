import { useEffect, useState } from "react";
import { getRevenueReport } from "../../api/dashboardApi";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  TrendingUp,
  ShoppingBag,
  BarChart2,
  Loader2,
  InboxIcon,
  MoveHorizontal,
  CalendarDays,
  CalendarRange,
  Calendar,
  Layers,
} from "lucide-react";

const formatMoney = (v) => Number(v || 0).toLocaleString("vi-VN") + "₫";

const fmtY = (v) => {
  if (v >= 1000000) return (v / 1000000).toFixed(0) + "tr";
  if (v >= 1000) return (v / 1000).toFixed(0) + "k";
  return v;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="text-gray-500 mb-1">{label}</p>
        <p className="flex items-center gap-1 font-bold text-green-600">
          <TrendingUp size={13} />
          {formatMoney(payload[0]?.value)}
        </p>
        {payload[1] && (
          <p className="flex items-center gap-1 text-purple-500 font-medium mt-0.5">
            <ShoppingBag size={13} />
            {payload[1].value} đơn hàng
          </p>
        )}
      </div>
    );
  }
  return null;
};

const RANGES = [
  { key: "day",     label: "Theo ngày",   icon: <CalendarDays  size={14} /> },
  { key: "week",    label: "Theo tuần",   icon: <CalendarRange size={14} /> },
  { key: "month",   label: "Theo tháng",  icon: <Calendar      size={14} /> },
  { key: "quarter", label: "Theo quý",    icon: <Layers        size={14} /> },
];

export default function AdminRevenue() {
  const [range, setRange] = useState("day");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const limit = range === "day" ? 30 : 12;
    getRevenueReport(range, limit)
      .then((res) => setRows(res.data?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [range]);

  const chartData = rows.map((item) => {
    let label = "";
    if (range === "day") {
      const d = new Date(item.label);
      label = `${d.getDate()}/${d.getMonth() + 1}`;
    } else if (range === "week") {
      label = `T${item.label}`;
    } else if (range === "month") {
      label = `Th${item.label}/${String(item.year).slice(-2)}`;
    } else {
      label = `Q${item.label}/${item.year}`;
    }
    return {
      label,
      revenue: Number(item.revenue || 0),
      orders:  Number(item.orders  || 0),
    };
  });

  const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
  const totalOrders  = rows.reduce((s, r) => s + Number(r.orders  || 0), 0);

  const chartWidth = Math.max(600, chartData.length * 60);
  const needScroll  = chartData.length > 10;

  return (
    <div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <TrendingUp size={24} className="text-green-600" />
            Doanh thu
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Thống kê doanh thu chi tiết</p>
        </div>

        {/* Range buttons */}
        <div className="flex gap-2 flex-wrap">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                range === r.key
                  ? "bg-green-600 text-white shadow"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <TrendingUp size={16} />
            Tổng doanh thu
          </div>
          <p className="text-3xl font-bold">{formatMoney(totalRevenue)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <ShoppingBag size={16} />
            Tổng đơn hàng
          </div>
          <p className="text-3xl font-bold">{totalOrders}</p>
        </div>
      </div>

      {/* Biểu đồ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-1">
          <BarChart2 size={20} className="text-green-500" />
          Biểu đồ doanh thu
        </h2>
        {needScroll && (
          <p className="flex items-center gap-1 text-xs text-gray-400 mb-3">
            <MoveHorizontal size={13} />
            Kéo ngang để xem thêm
          </p>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <Loader2 size={32} className="animate-spin text-green-500" />
            <span className="text-sm">Đang tải dữ liệu...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
            <InboxIcon size={32} strokeWidth={1.5} />
            <span className="text-sm">Chưa có dữ liệu</span>
          </div>
        ) : needScroll ? (
          <div className="overflow-x-auto pb-2">
            <div style={{ width: chartWidth, height: 300 }}>
              <AreaChart width={chartWidth} height={300} data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }}
                  angle={-35} textAnchor="end" height={50} />
                <YAxis tickFormatter={fmtY} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue"
                  stroke="#22c55e" strokeWidth={2} fill="url(#colorRev)" />
              </AreaChart>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} />
              <YAxis tickFormatter={fmtY} tick={{ fontSize: 12, fill: "#9ca3af" }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue"
                stroke="#22c55e" strokeWidth={2} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}