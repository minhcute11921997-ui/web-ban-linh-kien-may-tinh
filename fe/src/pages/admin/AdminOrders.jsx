import { useEffect, useState } from 'react';
import { getAllOrders, updateOrderStatus, deleteOrder } from '../../api/orderApi';
import { toast } from 'react-toastify';
import {
  ClipboardList,
  Trash2,
  Loader2,
  InboxIcon,
  AlertTriangle,
  X,
  ShoppingBag,
  Clock,
  Cog,
  Truck,
  CheckCircle,
  XCircle,
  ChevronRight,
} from 'lucide-react';

const STATUS_LABEL = {
  pending:    'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped:    'Đang giao',
  delivered:  'Đã giao',
  cancelled:  'Đã hủy',
  rejected:   'Đã từ chối',
};
const STATUS_COLOR = {
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
  rejected:   'bg-red-100 text-red-700',
};
const STATUS_ICON = {
  pending:    <Clock size={11} />,
  processing: <Cog size={11} />,
  shipped:    <Truck size={11} />,
  delivered:  <CheckCircle size={11} />,
  cancelled:  <XCircle size={11} />,
  rejected:   <XCircle size={11} />,
};
const NEXT_STATUS = { pending: 'processing', processing: 'shipped', shipped: 'delivered' };
const NEXT_STATUS_ICON = {
  processing: <Cog size={12} />,
  shipped:    <Truck size={12} />,
  delivered:  <CheckCircle size={12} />,
};

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
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <span className="text-sm">Đang tải đơn hàng...</span>
      </div>
    );

  return (
    <div>

      {/* Modal xác nhận từ chối */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Xác nhận từ chối đơn hàng</h2>
            <p className="text-gray-500 text-sm mb-6">
              Đơn hàng <span className="font-semibold text-red-500">#{confirmModal.id}</span> sẽ bị từ chối
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium cursor-pointer transition-colors"
              >
                <X size={15} />
                Hủy bỏ
              </button>
              <button
                onClick={() => { doUpdateStatus(confirmModal.id, confirmModal.status); setConfirmModal(null); }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium cursor-pointer transition-colors"
              >
                <XCircle size={15} />
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <ClipboardList size={24} className="text-blue-600" />
          Quản lý đơn hàng
        </h1>
        <span className="flex items-center gap-1.5 text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
          <ShoppingBag size={14} />
          {orders.length} đơn hàng
        </span>
      </div>

      {/* Table */}
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
                const isLocked = ['cancelled', 'rejected', 'delivered'].includes(order.status);
                return (
                  <tr key={order.id} className="border-t border-blue-50 hover:bg-blue-50/30 transition-colors">

                    {/* ID */}
                    <td className="px-6 py-3 font-medium text-gray-800">#{order.id}</td>

                    {/* Khách hàng */}
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-700">{order.full_name}</p>
                      <p className="text-gray-400 text-xs">{order.email}</p>
                    </td>

                    {/* Tổng tiền */}
                    <td className="px-6 py-3 text-blue-600 font-semibold">
                      {Number(order.total_price).toLocaleString('vi-VN')}₫
                    </td>

                    {/* Ngày đặt */}
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('vi-VN')}
                    </td>

                    {/* Trạng thái + nút chuyển */}
                    <td className="px-6 py-3">
                      <span className={`flex items-center gap-1 w-fit text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[order.status]}`}>
                        {STATUS_ICON[order.status]}
                        {STATUS_LABEL[order.status] || order.status}
                      </span>
                      {!isLocked && (
                        <div className="flex gap-2 mt-1.5">
                          <button
                            onClick={() => doUpdateStatus(order.id, NEXT_STATUS[order.status])}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg font-medium transition-colors cursor-pointer"
                          >
                            {NEXT_STATUS_ICON[NEXT_STATUS[order.status]]}
                            <ChevronRight size={11} />
                            {STATUS_LABEL[NEXT_STATUS[order.status]]}
                          </button>
                          {order.status === 'processing' && (
                            <button
                              onClick={() => setConfirmModal({ id: order.id, status: 'rejected' })}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg font-medium transition-colors cursor-pointer"
                            >
                              <XCircle size={12} />
                              Từ chối
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Xóa */}
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleDelete(order.id)}
                        aria-label="Xóa đơn hàng"
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium cursor-pointer transition-colors"
                      >
                        <Trash2 size={14} />
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Empty state */}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
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
    </div>
  );
};

export default AdminOrders;