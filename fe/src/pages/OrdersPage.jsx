import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyOrders } from '../api/orderApi';
import { toast } from 'react-toastify';

const TABS = [
    { key: 'active',    label: 'Chờ xác nhận',  statuses: ['pending', 'processing'] },
    { key: 'shipping',  label: 'Chờ giao hàng', statuses: ['shipped'] },
    { key: 'delivered', label: 'Đã giao',        statuses: ['delivered'] },
    { key: 'cancelled', label: 'Đã hủy',         statuses: ['cancelled'] },
];

const STATUS_COLOR = {
    pending:    'bg-yellow-100 text-yellow-700 border border-yellow-200',
    processing: 'bg-blue-100 text-blue-700 border border-blue-200',
    shipped:    'bg-blue-100 text-blue-700 border border-blue-200',
    delivered:  'bg-blue-100 text-blue-700 border border-blue-200',
    cancelled:  'bg-red-100 text-red-700 border border-red-200',
};

const STATUS_LABEL = {
    pending:    'Chờ xử lý',
    processing: 'Đang xử lý',
    shipped:    'Đang giao',
    delivered:  'Đã giao',
    cancelled:  'Đã hủy',
};

const PAYMENT_STATUS = {
    pending:   { label: 'Chờ thanh toán', color: 'text-yellow-600' },
    completed: { label: 'Đã thanh toán',  color: 'text-blue-600' },
    failed:    { label: 'Thất bại',       color: 'text-red-600' },
};

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active');
    const navigate = useNavigate();

    useEffect(() => {
        getMyOrders()
            .then(res => setOrders(res.data.data || []))
            .catch(() => toast.error('Không thể tải đơn hàng!'))
            .finally(() => setLoading(false));
    }, []);

    const getTabOrders = (tabKey) => {
        const tab = TABS.find(t => t.key === tabKey);
        return orders.filter(o => tab.statuses.includes(o.status || o.order_status));
    };

    const getTabCount = (tabKey) => getTabOrders(tabKey).length;

    const filteredOrders = getTabOrders(activeTab);

    if (loading) return (
        <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto px-4 py-10">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Đơn Hàng Của Bạn</h1>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`relative px-4 py-3 text-sm font-semibold transition-colors
                            ${activeTab === tab.key
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                        {getTabCount(tab.key) > 0 && (
                            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold
                                ${activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                {getTabCount(tab.key)}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Danh sách đơn hàng */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                    <p className="text-gray-400 mb-6">Không có đơn hàng nào</p>
                    <Link to="/" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
                        Mua Sắm Ngay
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map(order => {
                        const orderStatus = order.status || order.order_status;
                        const payStatus = PAYMENT_STATUS[order.payment_status] || PAYMENT_STATUS.pending;

                        return (
                            <div
                                key={order.id}
                                onClick={() => navigate(`/orders/${order.id}`)}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1">
                                        <p className="font-bold text-gray-800 text-lg">Đơn hàng #{order.id}</p>
                                        <p className="text-gray-400 text-sm">
                                            {new Date(order.created_at).toLocaleString('vi-VN')}
                                        </p>
                                        <p className="text-sm">
                                            Thanh toán:{' '}
                                            <span className={`font-semibold ${payStatus.color}`}>{payStatus.label}</span>
                                            <span className="text-gray-300 mx-2">|</span>
                                            <span className="text-gray-600 font-medium">
                                                {order.payment_method === 'cod' ? 'Tiền Mặt (COD)' : 'VNPay'}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_COLOR[orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                                            {STATUS_LABEL[orderStatus] || orderStatus}
                                        </span>
                                        <p className="text-blue-600 font-bold text-xl">
                                            {Number(order.total_price).toLocaleString('vi-VN')} đ
                                        </p>
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
