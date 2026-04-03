import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyOrders } from '../api/orderApi';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';
import {
  ShoppingBag, Clock, Loader2, Truck, BadgeCheck, XCircle,
  PackageSearch, Banknote, Landmark, ChevronRight,
} from 'lucide-react';

const TABS = [
  { key: 'active',    label: 'Chờ xác nhận',  statuses: ['pending', 'processing'] },
  { key: 'shipping',  label: 'Chờ giao hàng', statuses: ['shipped'] },
  { key: 'delivered', label: 'Đã giao',        statuses: ['delivered'] },
  { key: 'cancelled', label: 'Đã hủy',         statuses: ['cancelled'] },
];

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
  pending:    <Clock      size={12} />,
  processing: <Loader2    size={12} />,
  shipped:    <Truck      size={12} />,
  delivered:  <BadgeCheck size={12} />,
  cancelled:  <XCircle    size={12} />,
};

const PAYMENT_STATUS = {
  pending:   { label: 'Chờ thanh toán', color: 'text-yellow-600' },
  completed: { label: 'Đã thanh toán',  color: 'text-green-600' },
  failed:    { label: 'Thất bại',       color: 'text-red-600' },
};

const TAB_ICON = {
  active:    <Clock      size={14} />,
  shipping:  <Truck      size={14} />,
  delivered: <BadgeCheck size={14} />,
  cancelled: <XCircle    size={14} />,
};

const OrdersPage = () => {
  const { token } = useAuthStore();
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const navigate = useNavigate();

  useEffect(() => {

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    getMyOrders()
      .then(res => setOrders(res.data.data || []))
      .catch(err => {
        
        if (err?.response?.status === 401 || err?.message === 'No refresh token') return;
      })
      .finally(() => setLoading(false));
  }, [token]);

  const getTabOrders   = (key) => orders.filter(o => TABS.find(t => t.key === key)?.statuses.includes(o.status || o.order_status));
  const getTabCount    = (key) => getTabOrders(key).length;
  const filteredOrders = getTabOrders(activeTab);

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-[400px] gap-3 text-gray-400">
      <Loader2 size={36} className="animate-spin text-blue-500" />
      <p className="text-sm">Đang tải đơn hàng...</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800 mb-6">
        <ShoppingBag size={24} className="text-blue-500" />
        Đơn Hàng Của Bạn
      </h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors
              ${activeTab === tab.key
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'}`}>
            {TAB_ICON[tab.key]}
            {tab.label}
            {getTabCount(tab.key) > 0 && (
              <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold
                ${activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                {getTabCount(tab.key)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Danh sách đơn hàng */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3 bg-white rounded-2xl border border-gray-200">
          <PackageSearch size={48} strokeWidth={1.5} className="text-gray-300" />
          <p className="text-gray-400">Không có đơn hàng nào</p>
          <Link to="/"
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            <ShoppingBag size={16} /> Mua Sắm Ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const orderStatus = order.status || order.order_status;
            const payStatus   = PAYMENT_STATUS[order.payment_status] || PAYMENT_STATUS.pending;

            return (
              <div key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <p className="font-bold text-gray-800 text-lg">Đơn hàng #{order.id}</p>
                    <p className="flex items-center gap-1 text-gray-400 text-sm">
                      <Clock size={13} />
                      {new Date(order.created_at).toLocaleString('vi-VN')}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm flex-wrap">
                      <span className={`font-semibold ${payStatus.color}`}>{payStatus.label}</span>
                      <span className="text-gray-300">|</span>
                      <span className="flex items-center gap-1 text-gray-600 font-medium">
                        {order.payment_method === 'cod'
                          ? <><Banknote size={13} className="text-green-500" /> Tiền Mặt (COD)</>
                          : <><Landmark size={13} className="text-blue-500" /> VNPay</>}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-semibold ${STATUS_COLOR[orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_ICON[orderStatus]}
                      {STATUS_LABEL[orderStatus] || orderStatus}
                    </span>
                    <p className="text-blue-600 font-bold text-xl">
                      {Number(order.total_price).toLocaleString('vi-VN')} đ
                    </p>
                    <span className="flex items-center gap-0.5 text-xs text-gray-400">
                      Xem chi tiết <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;