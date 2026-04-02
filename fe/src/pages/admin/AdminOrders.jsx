import { useEffect, useState } from 'react';
import { getAllOrders, updateOrderStatus, deleteOrder, getOrderById } from '../../api/orderApi';
import { toast } from 'react-toastify';
import {
  ClipboardList, Trash2, Loader2, InboxIcon, AlertTriangle,
  X, ShoppingBag, Clock, Cog, Truck, CheckCircle, XCircle,
  ChevronRight, Eye, MapPin, CreditCard, Package, Tag,
} from 'lucide-react';

const STATUS_LABEL = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  rejected: 'Đã từ chối',
};
const STATUS_COLOR = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
};
const STATUS_ICON = {
  pending: <Clock size={11} />,
  processing: <Cog size={11} />,
  shipped: <Truck size={11} />,
  delivered: <CheckCircle size={11} />,
  cancelled: <XCircle size={11} />,
  rejected: <XCircle size={11} />,
};
const NEXT_STATUS = { pending: 'processing', processing: 'shipped', shipped: 'delivered' };
const NEXT_STATUS_ICON = {
  processing: <Cog size={12} />,
  shipped: <Truck size={12} />,
  delivered: <CheckCircle size={12} />,
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);   // order detail
  const [detailLoading, setDetailLoading] = useState(false);

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

  const handleViewDetail = async (id) => {
    setDetailLoading(true);
    setDetailModal({ id }); // mở modal ngay, hiện loading bên trong
    try {
      const res = await getOrderById(id);
      setDetailModal(res.data.data);
    } catch {
      toast.error('Không thể tải chi tiết đơn hàng!');
      setDetailModal(null);
    } finally {
      setDetailLoading(false);
    }
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

      {/* ── Modal xác nhận từ chối ── */}
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
                <X size={15} /> Hủy bỏ
              </button>
              <button
                onClick={() => { doUpdateStatus(confirmModal.id, confirmModal.status); setConfirmModal(null); }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium cursor-pointer transition-colors"
              >
                <XCircle size={15} /> Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal chi tiết đơn hàng ── */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Package size={20} className="text-blue-500" />
                Chi tiết đơn hàng #{detailModal.id}
              </h2>
              <button
                onClick={() => setDetailModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body modal */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {detailLoading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                  <Loader2 size={28} className="animate-spin text-blue-500" />
                  <span className="text-sm">Đang tải chi tiết...</span>
                </div>
              ) : (
                <>
                  {/* Thông tin khách hàng & trạng thái */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Khách hàng</p>
                      <p className="font-semibold text-gray-800">{detailModal.full_name || detailModal.username || '—'}</p>
                      <p className="text-sm text-gray-500">{detailModal.email || '—'}</p>
                      <p className="text-sm text-gray-500">{detailModal.phone || '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Trạng thái</p>
                      <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium ${STATUS_COLOR[detailModal.status]}`}>
                        {STATUS_ICON[detailModal.status]}
                        {STATUS_LABEL[detailModal.status] || detailModal.status}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        Đặt lúc: {new Date(detailModal.created_at).toLocaleString('vi-VN')}
                      </p>
                      {detailModal.delivered_at && (
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5">
                          <CheckCircle size={11} />
                          Đã giao: {new Date(detailModal.delivered_at).toLocaleString('vi-VN')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Địa chỉ giao hàng */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <MapPin size={13} /> Địa chỉ giao hàng
                    </p>
                    <p className="text-sm text-gray-700">{detailModal.shipping_address}</p>
                  </div>

                  {/* Thanh toán */}
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CreditCard size={15} className="text-gray-400" />
                      <span className="font-medium">Phương thức thanh toán:</span>
                      <span className="uppercase font-semibold text-gray-800">
                        {detailModal.payment_method || '—'}
                      </span>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${detailModal.payment_status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                      }`}>
                      {detailModal.payment_status === 'completed' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                  </div>

                  {/* Danh sách sản phẩm */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Tag size={13} /> Sản phẩm trong đơn
                    </p>
                    <div className="space-y-2">
                      {(detailModal.items || []).map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                          {/* Ảnh sản phẩm */}
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={e => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={20} className="text-gray-300" />
                              </div>
                            )}
                          </div>
                          {/* Tên & số lượng */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{item.name}</p>
                            <p className="text-xs text-gray-400">
                              {Number(item.price).toLocaleString('vi-VN')}₫ × {item.quantity}
                            </p>
                          </div>
                          {/* Thành tiền */}
                          <p className="font-semibold text-blue-600 flex-shrink-0">
                            {(Number(item.price) * item.quantity).toLocaleString('vi-VN')}₫
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tổng tiền */}
                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    {detailModal.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Giảm giá</span>
                        <span className="text-red-500 font-medium">
                          -{Number(detailModal.discount_amount).toLocaleString('vi-VN')}₫
                        </span>
                      </div>
                    )}
                    {detailModal.shipping_fee > 0 && (
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Phí vận chuyển</span>
                        <span>{Number(detailModal.shipping_fee).toLocaleString('vi-VN')}₫</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800">Tổng thanh toán</span>
                      <span className="text-xl font-bold text-blue-600">
                        {Number(detailModal.total_price).toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer modal */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setDetailModal(null)}
                className="px-5 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium cursor-pointer transition-colors text-sm"
              >
                Đóng
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
                              <XCircle size={12} /> Từ chối
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Thao tác: Xem chi tiết + Xóa */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleViewDetail(order.id)}
                          className="flex items-center gap-1 text-blue-500 hover:text-blue-700 font-medium cursor-pointer transition-colors"
                        >
                          <Eye size={14} /> Xem
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          aria-label="Xóa đơn hàng"
                          className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium cursor-pointer transition-colors"
                        >
                          <Trash2 size={14} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

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