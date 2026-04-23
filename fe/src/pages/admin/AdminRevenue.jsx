import { useEffect, useState } from "react";
import { getRevenueReport } from "../../api/dashboardApi";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  TrendingUp,
  ShoppingBag,
  BarChart2,
  Loader2,
  InboxIcon,
  MoveHorizontal,
  CalendarDays,
  Calendar,
  ChevronDown,
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

//  Theo ngày và Theo tháng
const RANGES = [
  { key: "day", label: "Theo ngày", icon: <CalendarDays size={14} /> },
  { key: "month", label: "Theo tháng", icon: <Calendar size={14} /> },
];

const MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function AdminRevenue() {
  const [range, setRange] = useState("day");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRevenueReport(range, range === "day" ? 30 : 12, {
      month: range === "day" ? selectedMonth : undefined,
      year: selectedYear,
    })
      .then((res) => setRows(res.data?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [range, selectedMonth, selectedYear]);

  const chartData = rows.map((item) => {
    let label = "";
    if (range === "day") {
      const d = new Date(item.label);
      label = `${d.getDate()}/${d.getMonth() + 1}`;
    } else {
      label = `Th${item.label}`;
    }
    return {
      label,
      revenue: Number(item.revenue || 0),
      orders: Number(item.orders || 0),
    };
  });

  const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
  const totalOrders = rows.reduce((s, r) => s + Number(r.orders || 0), 0);

  const chartWidth = Math.max(600, chartData.length * 60);
  const needScroll = chartData.length > 10;

  const selectCls =
    "appearance-none bg-white border border-gray-200 text-gray-700 text-sm font-medium " +
    "rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-green-400 " +
    "hover:border-green-400 transition-colors cursor-pointer shadow-sm";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <TrendingUp size={24} className="text-green-600" />
            Doanh thu
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Thống kê doanh thu chi tiết
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tab Theo ngày / Theo tháng */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  range === r.key
                    ? "bg-white text-green-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {r.icon}
                {r.label}
              </button>
            ))}
          </div>

          {/* ✅ Chọn tháng — chỉ hiện khi "Theo ngày" */}
          {range === "day" && (
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className={selectCls}
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          )}

          {/* ✅ Chọn năm — luôn hiện */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className={selectCls}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <TrendingUp size={16} />
            Tổng doanh thu
            <span className="ml-auto text-white/60 text-xs font-normal">
              {range === "day"
                ? `Tháng ${selectedMonth}/${selectedYear}`
                : `Năm ${selectedYear}`}
            </span>
          </div>
          <p className="text-3xl font-bold">{formatMoney(totalRevenue)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <ShoppingBag size={16} />
            Tổng đơn hàng
            <span className="ml-auto text-white/60 text-xs font-normal">
              {range === "day"
                ? `Tháng ${selectedMonth}/${selectedYear}`
                : `Năm ${selectedYear}`}
            </span>
          </div>
          <p className="text-3xl font-bold">{totalOrders}</p>
        </div>
      </div>

      {/* Biểu đồ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-1">
          <BarChart2 size={20} className="text-green-500" />
          Biểu đồ doanh thu
          <span className="ml-2 text-sm font-normal text-gray-400">
            {range === "day"
              ? `Tháng ${selectedMonth}/${selectedYear}`
              : `Năm ${selectedYear}`}
          </span>
        </h2>
        {needScroll && (
          <p className="flex items-center gap-1 text-xs text-gray-400 mb-3">
            <MoveHorizontal size={13} />
            Kéo ngang để xem thêm
          </p>
        )}

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
              <AreaChart
                width={chartWidth}
                height={300}
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 30 }}
              >
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tickFormatter={fmtY}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} />
              <YAxis
                tickFormatter={fmtY}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#colorRev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
