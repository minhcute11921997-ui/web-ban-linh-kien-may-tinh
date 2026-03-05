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
    <p className="text-center py-20 text-gray-400">Đang tải...</p>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Quản lý đơn hàng</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-3 border">Đơn #</th>
              <th className="text-left p-3 border">Khách hàng</th>
              <th className="text-left p-3 border">Tổng tiền</th>
              <th className="text-left p-3 border">Ngày đặt</th>
              <th className="text-left p-3 border">Trạng thái</th>
              <th className="text-left p-3 border">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="p-3 border font-medium">#{order.id}</td>
                <td className="p-3 border">
                  <p className="font-medium">{order.full_name}</p>
                  <p className="text-gray-400 text-xs">{order.email}</p>
                </td>
                <td className="p-3 border text-blue-600 font-semibold">
                  {Number(order.total_price).toLocaleString('vi-VN')}₫
                </td>
                <td className="p-3 border text-gray-500">
                  {new Date(order.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="p-3 border">
                  
                  <span className={`text-xs px-2 py-1 rounded-full font-medium mb-2 inline-block ${STATUS_COLOR[order.status]}`}>
                    {order.status_label}
                  </span>
                  <select
                    value={order.status}
                    onChange={e => handleStatus(order.id, e.target.value)}
                    className="block border px-2 py-1 rounded text-sm focus:outline-none w-full"
                  >
                    {STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3 border">
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="text-red-500 hover:underline"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrders;
