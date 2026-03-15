import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyOrders, getOrderById } from '../api/orderApi';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';

const STATUS_COLOR = {
    pending:    'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    shipped:    'bg-purple-100 text-purple-700',
    delivered:  'bg-green-100 text-green-700',
    cancelled:  'bg-red-100 text-red-700',
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
    completed: { label: 'Đã thanh toán',  color: 'text-green-600' },
    failed:    { label: 'Thất bại',        color: 'text-red-600' },
};

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [orderDetails, setOrderDetails] = useState({});
    const [detailLoading, setDetailLoading] = useState(null);
    const { token } = useAuthStore();

    useEffect(() => {
        getMyOrders()
            .then(res => setOrders(res.data.data || []))
            .catch(() => toast.error('Không thể tải đơn hàng!'))
            .finally(() => setLoading(false));
    }, []);

    const toggleDetail = async (orderId) => {
        if (expandedId === orderId) { setExpandedId(null); return; }
        setExpandedId(orderId);
        if (orderDetails[orderId]) return;
        setDetailLoading(orderId);
        try {
            const res = await axios.get(`/api/payments/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setOrderDetails(prev => ({ ...prev, [orderId]: res.data.data }));
            }
        } catch {
            toast.error('Không thể tải chi tiết đơn hàng');
        } finally {
            setDetailLoading(null);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">📦 Đơn Hàng Của Bạn</h1>

            {orders.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-gray-400 text-lg mb-4">Bạn chưa có đơn hàng nào</p>
                    <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                        Mua Sắm Ngay
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => {
                        const detail = orderDetails[order.id];
                        const isExpanded = expandedId === order.id;
                        const orderStatus = order.order_status || order.status;
                        const payStatus = PAYMENT_STATUS[order.payment_status] || PAYMENT_STATUS.pending;

                        return (
                            <div key={order.id} className="border rounded-xl bg-white shadow-sm overflow-hidden">
                                {/* Header đơn hàng */}
                                <div className="p-5">
                                    <div className="flex justify-between items-start flex-wrap gap-3">
                                        <div>
                                            <p className="font-bold text-lg">Đơn hàng #{order.id}</p>
                                            <p className="text-gray-400 text-sm mt-1">
                                                🕐 {new Date(order.created_at).toLocaleString('vi-VN')}
                                            </p>
                                            <p className="text-sm mt-1">
                                                Thanh toán:{' '}
                                                <span className={`font-semibold ${payStatus.color}`}>{payStatus.label}</span>
                                                {' · '}
                                                <span className="font-semibold">
                                                    {order.payment_method === 'cod' ? '💵 COD' : '🏦 VNPay'}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLOR[orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                                                {STATUS_LABEL[orderStatus] || orderStatus}
                                            </span>
                                            <p className="text-blue-600 font-bold text-lg">
                                                {Number(order.total_price).toLocaleString('vi-VN')} ₫
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => toggleDetail(order.id)}
                                        className="mt-4 text-sm text-blue-600 hover:underline font-medium">
                                        {isExpanded ? '▲ Ẩn chi tiết' : '▼ Xem chi tiết'}
                                    </button>
                                </div>

                                {/* Chi tiết đơn hàng (expandable) */}
                                {isExpanded && (
                                    <div className="border-t bg-gray-50 p-5 space-y-5">
                                        {detailLoading === order.id ? (
                                            <p className="text-center text-gray-400">Đang tải...</p>
                                        ) : detail ? (
                                            <>
                                                {/* Thông tin giao hàng */}
                                                <div>
                                                    <h3 className="font-semibold text-gray-700 mb-2">🚚 Thông Tin Giao Hàng</h3>
                                                    <div className="text-sm space-y-1">
                                                        <p><span className="text-gray-500">Người nhận:</span> <span className="font-medium">{detail.customerName}</span></p>
                                                        <p><span className="text-gray-500">Điện thoại:</span> <span className="font-medium">{detail.customerPhone}</span></p>
                                                        <p><span className="text-gray-500">Địa chỉ:</span> <span className="font-medium">{detail.shippingAddress}</span></p>
                                                        {detail.notes && <p><span className="text-gray-500">Ghi chú:</span> {detail.notes}</p>}
                                                    </div>
                                                </div>

                                                {/* Sản phẩm */}
                                                {detail.items && detail.items.length > 0 && (
                                                    <div>
                                                        <h3 className="font-semibold text-gray-700 mb-2">🛍️ Sản Phẩm</h3>
                                                        <div className="space-y-2">
                                                            {detail.items.map(item => (
                                                                <div key={item.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border">
                                                                    <img src={item.image_url || 'https://via.placeholder.com/50'}
                                                                        alt={item.product_name}
                                                                        className="w-12 h-12 object-cover rounded bg-gray-100" />
                                                                    <div className="flex-1">
                                                                        <p className="font-semibold text-sm">{item.product_name}</p>
                                                                        <p className="text-gray-500 text-xs">x{item.quantity} · {Number(item.price).toLocaleString('vi-VN')} ₫/cái</p>
                                                                    </div>
                                                                    <p className="font-bold text-blue-600 text-sm">
                                                                        {(item.price * item.quantity).toLocaleString('vi-VN')} ₫
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Chi tiết giá */}
                                                <div className="bg-white rounded-lg p-4 border text-sm">
                                                    <h3 className="font-semibold text-gray-700 mb-2">💰 Chi Tiết Thanh Toán</h3>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">Phí vận chuyển:</span>
                                                            <span>{Number(detail.shippingFee || 0).toLocaleString('vi-VN')} ₫</span>
                                                        </div>
                                                        {Number(detail.discountAmount) > 0 && (
                                                            <div className="flex justify-between text-green-600">
                                                                <span>Giảm giá:</span>
                                                                <span>-{Number(detail.discountAmount).toLocaleString('vi-VN')} ₫</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between font-bold border-t pt-2 mt-1">
                                                            <span>Tổng cộng:</span>
                                                            <span className="text-blue-600">{Number(detail.totalPrice).toLocaleString('vi-VN')} ₫</span>
                                                        </div>
                                                    </div>
                                                    {detail.transactionId && (
                                                        <p className="text-xs text-gray-400 mt-2">Mã GD: {detail.transactionId}</p>
                                                    )}
                                                </div>
                                            </>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default OrdersPage;
