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

// ✅ Format giống dashboard gốc
const fmtY = (v) => {
  if (v >= 1000000) return (v / 1000000).toFixed(0) + "tr";
  if (v >= 1000) return (v / 1000).toFixed(0) + "k";
  return v;
};

// ✅ Format label trục X theo từng range
const formatLabel = (raw, range) => {
  if (range === "day") {
    // raw có thể là "2026-03-23T17:00:00.000Z" hoặc "2026-03-23"
    const d = new Date(raw);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }
  return raw; // week/quarter đã format rồi
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="text-gray-500 mb-1">{label}</p>
        <p className="font-bold text-green-600">
          {formatMoney(payload[0]?.value)}
        </p>
        {payload[1] && (
          <p className="text-blue-500 font-medium">{payload[1].value} đơn hàng</p>
        )}
      </div>
    );
  }
  return null;
};

const RANGES = [
  { key: "day", label: "Theo ngày" },
  { key: "week", label: "Theo tuần" },
  { key: "quarter", label: "Theo quý" },
];

export default function AdminRevenue() {
  const [range, setRange] = useState("day");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRevenueReport(range)
      .then((res) => setRows(res.data?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [range]);

  const chartData = rows.map((item) => {
    let label = "";
    if (range === "day") {
      const d = new Date(item.label);
      label = `${d.getDate()}/${d.getMonth() + 1}`; // ✅ "23/3" thay vì ISO string
    } else if (range === "week") {
      label = `Tuần ${item.label}/${item.year}`;
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

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Doanh thu</h1>
          <p className="text-sm text-gray-500">
            Thống kê theo ngày, tuần và quý
          </p>
        </div>
        <div className="flex gap-2">
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

      {/* Biểu đồ — dùng AreaChart giống dashboard gốc */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Biểu đồ doanh thu
        </h2>

        {loading ? (
          <div className="text-center text-gray-400 py-16">Đang tải dữ liệu...</div>
        ) : chartData.length === 0 ? (
          <div className="text-center text-gray-400 py-16">Chưa có dữ liệu</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
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
                tick={{ fontSize: 12, fill: "#9ca3af" }}
              />
              <YAxis
                tickFormatter={fmtY} // ✅ "32tr" thay vì "32000000"
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