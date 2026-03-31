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
        <p className="font-bold text-green-600">{formatMoney(payload[0]?.value)}</p>
        {payload[1] && (
          <p className="text-purple-500 font-medium">{payload[1].value} đơn hàng</p>
        )}
      </div>
    );
  }
  return null;
};

const DAY_OPTIONS = [
  { key: 7, label: "7 ngày" },
  { key: 14, label: "14 ngày" },
  { key: 30, label: "30 ngày" },
];

const RANGES = [
  { key: "day", label: "Theo ngày" },
  { key: "week", label: "Theo tuần" },
  { key: "quarter", label: "Theo quý" },
];

export default function AdminRevenue() {
  const [range, setRange] = useState("day");
  const [dayLimit, setDayLimit] = useState(7);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const limit = range === "day" ? dayLimit : range === "week" ? 8 : 8;
    getRevenueReport(range, limit)
      .then((res) => setRows(res.data?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [range, dayLimit]);

  const chartData = rows.map((item) => {
    let label = "";
    if (range === "day") {
      const d = new Date(item.label);
      label = `${d.getDate()}/${d.getMonth() + 1}`;
    } else if (range === "week") {
      label = `T${item.label}`;
    } else {
      label = `Q${item.label}/${item.year}`;
    }
    return {
      label,
      revenue: Number(item.revenue || 0),
      orders: Number(item.orders || 0),
    };
  });

  const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
  const totalOrders = rows.reduce((s, r) => s + Number(r.orders || 0), 0);

  //Tính độ rộng chart: mỗi điểm cần ít nhất 60px, tối thiểu full container
  const chartWidth = Math.max(600, chartData.length * 60);
  const needScroll = chartData.length > 10;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Doanh thu</h1>
          <p className="text-sm text-gray-500">Thống kê doanh thu chi tiết</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                range === r.key
                  ? "bg-green-600 text-white shadow"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bộ lọc số ngày — chỉ hiện khi range = day */}
      {range === "day" && (
        <div className="flex gap-2 mb-5">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDayLimit(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dayLimit === opt.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Thẻ tổng */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-sm text-white/80">Tổng doanh thu</p>
          <p className="text-3xl font-bold mt-2">{formatMoney(totalRevenue)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-sm text-white/80">Tổng đơn hàng</p>
          <p className="text-3xl font-bold mt-2">{totalOrders}</p>
        </div>
      </div>

      {/* Biểu đồ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Biểu đồ doanh thu</h2>
        {needScroll && (
          <p className="text-xs text-gray-400 mb-3">← Kéo ngang để xem thêm →</p>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-16">Đang tải dữ liệu...</div>
        ) : chartData.length === 0 ? (
          <div className="text-center text-gray-400 py-16">Chưa có dữ liệu</div>
        ) : needScroll ? (
          // Scroll ngang khi nhiều điểm
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
                <YAxis tickFormatter={fmtY} tick={{ fontSize: 11, fill: "#9ca3af" }} />
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
              <YAxis tickFormatter={fmtY} tick={{ fontSize: 12, fill: "#9ca3af" }} />
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