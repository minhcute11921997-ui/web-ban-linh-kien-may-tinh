import { useEffect, useState } from 'react';
import { getAllOrders, updateOrderStatus, deleteOrder } from '../../api/orderApi';
import { toast } from 'react-toastify';

const STATUSES = [
  { value: 'pending',    label: 'Chờ xử lý' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'shipped',    label: 'Đang giao' },
  { value: 'delivered',  label: 'Đã giao' },
  { value: 'cancelled',  label: 'Đã hủy' },
];

const STATUS_COLOR = {
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped:    'bg-purple-100 text-purple-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await getAllOrders();
      setOrders(res.data.data);
    } catch {
      toast.error('Không thể tải đơn hàng!');
    } finally {
      setLoading(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await updateOrderStatus(id, status);
      toast.success('Cập nhật trạng thái thành công!');
      fetchOrders();
    } catch {
      toast.error('Cập nhật thất bại!');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa đơn hàng này?')) return;
    try {
      await deleteOrder(id);
      toast.success('Đã xóa đơn hàng!');
      fetchOrders();
    } catch {
      toast.error('Xóa thất bại!');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-lg">Đang tải...</div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý đơn hàng</h1>
        <span className="text-sm text-gray-400">{orders.length} đơn hàng</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="text-left px-6 py-3 font-medium">Đơn #</th>
                <th className="text-left px-6 py-3 font-medium">Khách hàng</th>
                <th className="text-left px-6 py-3 font-medium">Tổng tiền</th>
                <th className="text-left px-6 py-3 font-medium">Ngày đặt</th>
                <th className="text-left px-6 py-3 font-medium">Trạng thái</th>
                <th className="text-left px-6 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-800">#{order.id}</td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-700">{order.full_name}</p>
                    <p className="text-gray-400 text-xs">{order.email}</p>
                  </td>
                  <td className="px-6 py-3 text-blue-600 font-semibold">
                    {Number(order.total_price).toLocaleString('vi-VN')}₫
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium mb-2 inline-block ${STATUS_COLOR[order.status]}`}>
                      {order.status_label}
                    </span>
                    <select
                      value={order.status}
                      onChange={e => handleStatus(order.id, e.target.value)}
                      className="block border border-gray-200 px-2 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full">
                      {STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="text-red-500 hover:text-red-700 font-medium cursor-pointer">
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chưa có đơn hàng nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
