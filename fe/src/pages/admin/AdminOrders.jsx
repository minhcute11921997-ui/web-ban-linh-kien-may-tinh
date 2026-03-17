import { useEffect, useState } from 'react';
import { getAllOrders, updateOrderStatus, deleteOrder } from '../../api/orderApi';
import { toast } from 'react-toastify';

const STATUS_LABEL = {
  pending:    'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped:    'Đang giao',
  delivered:  'Đã giao',
  cancelled:  'Đã hủy',
  rejected:   'Đã hủy',
};

const STATUS_COLOR = {
  pending:    'bg-blue-100 text-blue-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped:    'bg-blue-100 text-blue-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
  rejected:   'bg-red-100 text-red-700',
};

const NEXT_STATUS = {
  pending:    'processing',
  processing: 'shipped',
  shipped:    'delivered',
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(null);

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

  const handleStatusChange = (id, status) => {
    if (status === 'rejected') {
      setConfirmModal({ id, status });
    } else {
      doUpdateStatus(id, status);
    }
  };

  const doUpdateStatus = async (id, status) => {
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
      {/* Modal xác nhận từ chối */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
            <div className="text-4xl mb-3"></div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Xác nhận từ chối đơn hàng</h2>
            <p className="text-gray-500 text-sm mb-6">
              Đơn hàng <span className="font-semibold text-red-500">#{confirmModal.id}</span> sẽ bị từ chối
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  doUpdateStatus(confirmModal.id, confirmModal.status);
                  setConfirmModal(null);
                }}
                className="px-5 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

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
              {orders.map(order => {
                const isLocked = order.status === 'cancelled' || order.status === 'rejected' || order.status === 'delivered';
                return (
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
                        {STATUS_LABEL[order.status] || order.status_label}
                      </span>

                      {isLocked ? (
                        <div className="text-xs text-gray-400 italic mt-1">
                          {order.status === 'delivered' }
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => handleStatusChange(order.id, NEXT_STATUS[order.status])}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg font-medium transition-colors"
                          >
                            {STATUS_LABEL[NEXT_STATUS[order.status]]}
                          </button>

                          {order.status === 'processing' && (
                            <button
                              onClick={() => setConfirmModal({ id: order.id, status: 'rejected' })}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg font-medium transition-colors"
                            >
                              Từ chối
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="text-red-500 hover:text-red-700 font-medium cursor-pointer"
                      >
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
