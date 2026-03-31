import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  ClipboardList,
  Clock,
  Loader2,
  PackageSearch,
  AlertTriangle,
  CalendarDays,
  Wallet,
  BadgeCheck,
  Hash,
  User,
  Phone,
  MapPin,
  FileText,
  ShoppingBag,
  Receipt,
  Truck,
  Tag,
  XCircle,
  Banknote,
  Landmark,
} from 'lucide-react';

const STATUS_COLOR = {
  pending:    'bg-yellow-100 text-yellow-700 border border-yellow-200',
  processing: 'bg-blue-100   text-blue-700   border border-blue-200',
  shipped:    'bg-blue-100   text-blue-700   border border-blue-200',
  delivered:  'bg-green-100  text-green-700  border border-green-200',
  cancelled:  'bg-red-100    text-red-700    border border-red-200',
};

const STATUS_LABEL = {
  pending:    'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped:    'Đang giao',
  delivered:  'Đã giao',
  cancelled:  'Đã hủy',
};

const STATUS_ICON = {
  pending:    <Clock    size={13} />,
  processing: <Loader2  size={13} />,
  shipped:    <Truck    size={13} />,
  delivered:  <BadgeCheck size={13} />,
  cancelled:  <XCircle  size={13} />,
};

const Row = ({ icon, label, value, valueClass = "font-medium text-gray-800" }) => (
  <div className="flex gap-2 text-sm">
    <span className="flex items-center gap-1.5 text-gray-400 w-32 flex-shrink-0">
      {icon}{label}:
    </span>
    <span className={valueClass}>{value}</span>
  </div>
);

const SectionTitle = ({ icon, children }) => (
  <p className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
    {icon}{children}
  </p>
);

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [order, setOrder]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    axios.get(`/api/payments/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (res.data.success) setOrder(res.data.data); else toast.error('Không tìm thấy đơn hàng'); })
      .catch(() => toast.error('Lỗi tải đơn hàng'))
      .finally(() => setLoading(false));
  }, [id, token]);

  const handleCancel = async () => {
    setCancelling(true); setShowConfirm(false);
    try {
      await axios.put(`/api/orders/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Hủy đơn hàng thành công');
      setOrder(prev => ({ ...prev, orderStatus: 'cancelled' }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể hủy đơn hàng');
    } finally { setCancelling(false); }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-[400px] gap-3 text-gray-400">
      <Loader2 size={36} className="animate-spin text-blue-500" />
      <p className="text-sm">Đang tải đơn hàng...</p>
    </div>
  );

  if (!order) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
      <PackageSearch size={48} strokeWidth={1.5} />
      <p className="text-sm">Không tìm thấy đơn hàng</p>
    </div>
  );

  const orderStatus = order.orderStatus || order.status;

  const paymentStatusNode = (() => {
    const map = {
      completed: { cls: 'text-green-600', label: 'Đã thanh toán' },
      failed:    { cls: 'text-red-600',   label: 'Thất bại' },
    };
    const cfg = map[order.paymentStatus] || { cls: 'text-yellow-600', label: 'Chờ thanh toán' };
    return <span className={`font-semibold ${cfg.cls}`}>{cfg.label}</span>;
  })();

  return (
    <>
      {/* ── Modal xác nhận hủy ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="flex justify-center mb-3">
              <AlertTriangle size={40} className="text-red-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Xác Nhận Hủy Đơn</h2>
            <p className="text-gray-400 text-sm mb-8">
              Bạn có chắc muốn hủy đơn hàng <strong>#{order.orderId}</strong> không?<br />
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition">
                <ArrowLeft size={15} /> Quay Lại
              </button>
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50">
                {cancelling
                  ? <><Loader2 size={15} className="animate-spin" /> Đang hủy...</>
                  : <><XCircle size={15} /> Xác Nhận Hủy</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Back */}
        <button onClick={() => navigate('/orders')}
          className="flex items-center gap-1.5 text-blue-600 font-semibold text-sm mb-6 hover:underline">
          <ArrowLeft size={16} /> Quay lại danh sách đơn hàng
        </button>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <ClipboardList size={24} className="text-blue-500" />
            Đơn Hàng #{order.orderId}
          </h1>
          <span className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-semibold ${STATUS_COLOR[orderStatus] || 'bg-gray-100 text-gray-600'}`}>
            {STATUS_ICON[orderStatus]}
            {STATUS_LABEL[orderStatus] || orderStatus}
          </span>
        </div>

        <div className="space-y-5">

          {/* Thông tin đơn hàng */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <SectionTitle icon={<ClipboardList size={16} className="text-blue-400" />}>
              Thông Tin Đơn Hàng
            </SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="flex items-center gap-1 text-gray-400 text-xs mb-1"><CalendarDays size={12} /> Ngày đặt</p>
                <p className="font-medium text-gray-800 text-sm">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-gray-400 text-xs mb-1"><Wallet size={12} /> Phương thức thanh toán</p>
                <p className="font-medium text-gray-800 text-sm flex items-center gap-1.5">
                  {order.paymentMethod === 'cod'
                    ? <><Banknote size={14} className="text-green-500" /> Tiền Mặt (COD)</>
                    : <><Landmark size={14} className="text-blue-500" /> VNPay</>}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-gray-400 text-xs mb-1"><BadgeCheck size={12} /> Trạng thái thanh toán</p>
                {paymentStatusNode}
              </div>
              {order.transactionId && (
                <div>
                  <p className="flex items-center gap-1 text-gray-400 text-xs mb-1"><Hash size={12} /> Mã giao dịch</p>
                  <p className="font-mono text-xs text-gray-600">{order.transactionId}</p>
                </div>
              )}
            </div>
          </div>

          {/* Thông tin giao hàng */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <SectionTitle icon={<Truck size={16} className="text-blue-400" />}>
              Thông Tin Giao Hàng
            </SectionTitle>
            <div className="space-y-2">
              <Row icon={<User  size={12} />} label="Người nhận" value={order.customerName} />
              <Row icon={<Phone size={12} />} label="Điện thoại"  value={order.customerPhone} />
              <Row icon={<MapPin size={12} />} label="Địa chỉ"   value={order.shippingAddress} />
              {order.notes && (
                <Row icon={<FileText size={12} />} label="Ghi chú" value={order.notes} valueClass="text-gray-600" />
              )}
            </div>
          </div>

          {/* Sản phẩm */}
          {order.items?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <SectionTitle icon={<ShoppingBag size={16} className="text-blue-400" />}>
                Sản Phẩm
              </SectionTitle>
              <div className="space-y-4">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center gap-4">
                    <img src={item.image_url || 'https://via.placeholder.com/56'} alt={item.product_name}
                      className="w-16 h-16 object-cover rounded-xl bg-gray-100 border border-gray-200" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{item.product_name}</p>
                      <p className="text-gray-400 text-sm mt-0.5">
                        x{item.quantity} · {Number(item.price).toLocaleString('vi-VN')} đ/cái
                      </p>
                    </div>
                    <p className="font-bold text-blue-600">
                      {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chi tiết thanh toán */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <SectionTitle icon={<Receipt size={16} className="text-blue-400" />}>
              Chi Tiết Thanh Toán
            </SectionTitle>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1.5"><Truck size={13} /> Phí vận chuyển:</span>
                <span>{Number(order.shippingFee || 0).toLocaleString('vi-VN')} đ</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1.5"><Tag size={13} /> Giảm giá:</span>
                  <span>-{Number(order.discountAmount).toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-3 mt-1 text-base">
                <span>Tổng cộng:</span>
                <span className="text-blue-600">{Number(order.totalPrice).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
            {order.transactionId && (
              <p className="flex items-center gap-1 text-xs text-gray-400 mt-3">
                <Hash size={11} /> Mã GD: {order.transactionId}
              </p>
            )}
          </div>

          {/* Nút hủy đơn */}
          {['pending', 'processing'].includes(orderStatus) && (
            <button onClick={() => setShowConfirm(true)} disabled={cancelling}
              className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-500 py-3 rounded-xl font-bold hover:bg-red-50 transition disabled:opacity-50">
              {cancelling
                ? <><Loader2 size={16} className="animate-spin" /> Đang hủy...</>
                : <><XCircle size={16} /> Hủy Đơn Hàng</>}
            </button>
          )}

        </div>
      </div>
    </>
  );
};

export default OrderDetailPage;