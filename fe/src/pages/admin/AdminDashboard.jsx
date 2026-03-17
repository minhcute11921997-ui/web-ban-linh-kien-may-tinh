import { useEffect, useState } from 'react';
import { getDashboardStats } from '../../api/dashboardApi';
import { useNavigate } from 'react-router-dom';

const STATUS_LABEL = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

const STATUS_COLOR = {
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped:    'bg-purple-100 text-purple-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
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
        console.error('Không thể tải thống kê');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-lg">Đang tải...</div>
    </div>
  );

  const cards = [
    { label: 'Sản phẩm',   value: stats?.totalProducts || 0,  icon: '🛍️', color: 'from-blue-500 to-blue-600',   link: '/admin/products' },
    { label: 'Đơn hàng',   value: stats?.totalOrders || 0,    icon: '📦', color: 'from-purple-500 to-purple-600', link: '/admin/orders' },
    { label: 'Doanh thu',  value: `${Number(stats?.totalRevenue || 0).toLocaleString('vi-VN')}₫`, icon: '💰', color: 'from-green-500 to-green-600', link: null },
    { label: 'Người dùng', value: stats?.totalUsers || 0,     icon: '👥', color: 'from-orange-500 to-orange-600', link: '/admin/users' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cards.map((card, i) => (
          <div key={i} onClick={() => card.link && navigate(card.link)}
            className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-200 ${card.link ? 'cursor-pointer hover:scale-[1.02]' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">{card.icon}</span>
              {stats?.pendingOrders > 0 && card.label === 'Đơn hàng' && (
                <span className="bg-white/20 text-xs px-2 py-1 rounded-full">{stats.pendingOrders} chờ xử lý</span>
              )}
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm text-white/80 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Đơn hàng gần đây</h2>
          <button onClick={() => navigate('/admin/orders')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
            Xem tất cả →
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500">
              <th className="text-left px-6 py-3 font-medium">Đơn #</th>
              <th className="text-left px-6 py-3 font-medium">Khách hàng</th>
              <th className="text-left px-6 py-3 font-medium">Tổng tiền</th>
              <th className="text-left px-6 py-3 font-medium">Trạng thái</th>
              <th className="text-left px-6 py-3 font-medium">Ngày</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.recentOrders || []).map(order => (
              <tr key={order.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-medium text-gray-800">#{order.id}</td>
                <td className="px-6 py-3">
                  <p className="font-medium text-gray-700">{order.full_name}</p>
                  <p className="text-xs text-gray-400">{order.email}</p>
                </td>
                <td className="px-6 py-3 font-semibold text-blue-600">
                  {Number(order.total_price).toLocaleString('vi-VN')}₫
                </td>
                <td className="px-6 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-500">
                  {new Date(order.created_at).toLocaleDateString('vi-VN')}
                </td>
              </tr>
            ))}
            {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Chưa có đơn hàng nào</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
