import { useEffect, useState } from 'react';
import { getAllOrders, updateOrderStatus, deleteOrder } from '../../api/orderApi';
import { toast } from 'react-toastify';

const STATUS_LABEL = {
  pending: 'Chờ xử lý', processing: 'Đang xử lý',
  shipped: 'Đang giao', delivered: 'Đã giao',
  cancelled: 'Đã hủy', rejected: 'Đã từ chối',
};
const STATUS_COLOR = {
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
  rejected:   'bg-red-100 text-red-700',
};
const NEXT_STATUS = { pending: 'processing', processing: 'shipped', shipped: 'delivered' };

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try { const res = await getAllOrders(); setOrders(res.data.data); }
    catch { toast.error('Không thể tải đơn hàng!'); }
    finally { setLoading(false); }
  };

  const doUpdateStatus = async (id, status) => {
    try { await updateOrderStatus(id, status); toast.success('Cập nhật thành công!'); fetchOrders(); }
    catch { toast.error('Cập nhật thất bại!'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa đơn hàng này?')) return;
    try { await deleteOrder(id); toast.success('Đã xóa!'); fetchOrders(); }
    catch { toast.error('Xóa thất bại!'); }
  };

  if (loading)
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Đang tải...</div></div>;

  return (
    <div>
      {/* Modal xác nhận từ chối */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Xác nhận từ chối đơn hàng</h2>
            <p className="text-gray-500 text-sm mb-6">
              Đơn hàng <span className="font-semibold text-red-500">#{confirmModal.id}</span> sẽ bị từ chối
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmModal(null)}
                className="px-5 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium cursor-pointer">
                Hủy bỏ
              </button>
              <button onClick={() => { doUpdateStatus(confirmModal.id, confirmModal.status); setConfirmModal(null); }}
                className="px-5 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium cursor-pointer">
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý đơn hàng</h1>
        <span className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">{orders.length} đơn hàng</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-blue-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-50/60 text-gray-500">
                <th className="text-left px-6 py-3 font-medium">Đơn #</th>
                <th className="text-left px-6 py-3 font-medium">Khách hàng</th>
                <th className="text-left px-6 py-3 font-medium">Tổng tiền</th>
                <th className="text-left px-6 py-3 font-medium">Ngày đặt</th>
                <th className="text-left px-6 py-3 font-medium">Trạng thái</th>
                <th className="text-left px-6 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const isLocked = ['cancelled','rejected','delivered'].includes(order.status);
                return (
                  <tr key={order.id} className="border-t border-blue-50 hover:bg-blue-50/30 transition-colors">
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
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[order.status]}`}>
                        {STATUS_LABEL[order.status] || order.status}
                      </span>
                      {!isLocked && (
                        <div className="flex gap-2 mt-1.5">
                          <button onClick={() => doUpdateStatus(order.id, NEXT_STATUS[order.status])}
                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg font-medium transition-colors cursor-pointer">
                            {STATUS_LABEL[NEXT_STATUS[order.status]]}
                          </button>
                          {order.status === 'processing' && (
                            <button onClick={() => setConfirmModal({ id: order.id, status: 'rejected' })}
                              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg font-medium transition-colors cursor-pointer">
                              Từ chối
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <button onClick={() => handleDelete(order.id)}
                        className="text-red-500 hover:text-red-700 font-medium cursor-pointer">
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
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