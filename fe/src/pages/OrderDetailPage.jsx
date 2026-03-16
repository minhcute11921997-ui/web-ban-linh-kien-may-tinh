import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';

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

const OrderDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        axios.get(`/api/payments/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                if (res.data.success) setOrder(res.data.data);
                else toast.error('Không tìm thấy đơn hàng');
            })
            .catch(() => toast.error('Lỗi tải đơn hàng'))
            .finally(() => setLoading(false));
    }, [id, token]);

    const handleCancel = async () => {
        setCancelling(true);
        setShowConfirm(false);
        try {
            await axios.put(`/api/orders/${id}/cancel`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Hủy đơn hàng thành công');
            setOrder(prev => ({ ...prev, orderStatus: 'cancelled' }));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể hủy đơn hàng');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!order) return (
        <div className="text-center py-24 text-gray-400">Không tìm thấy đơn hàng</div>
    );

    const orderStatus = order.orderStatus || order.status;

    return (
        <>
            {/* Modal xác nhận hủy */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Xác Nhận Hủy Đơn</h2>
                        <p className="text-gray-400 text-sm mb-8">
                            Bạn có chắc muốn hủy đơn hàng #{order.orderId} không? Hành động này không thể hoàn tác.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
                            >
                                Quay Lại
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={cancelling}
                                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition disabled:opacity-50"
                            >
                                {cancelling ? 'Đang hủy...' : 'Xác Nhận Hủy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-3xl mx-auto px-4 py-10">
                <button
                    onClick={() => navigate('/orders')}
                    className="text-blue-600 font-semibold text-sm mb-6 hover:underline"
                >
                    ← Quay lại danh sách đơn hàng
                </button>

                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Đơn Hàng #{order.orderId}</h1>
                    <span className={`text-sm px-3 py-1 rounded-full font-semibold ${STATUS_COLOR[orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[orderStatus] || orderStatus}
                    </span>
                </div>

                <div className="space-y-5">

                    {/* Thông tin đơn hàng */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <p className="font-semibold text-gray-700 mb-4">Thông Tin Đơn Hàng</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400">Ngày đặt</p>
                                <p className="font-medium text-gray-800">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Phương thức thanh toán</p>
                                <p className="font-medium text-gray-800">{order.paymentMethod === 'cod' ? 'Tiền Mặt (COD)' : 'VNPay'}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Trạng thái thanh toán</p>
                                <p className={`font-semibold ${
                                    order.paymentStatus === 'completed' ? 'text-blue-600' :
                                    order.paymentStatus === 'failed' ? 'text-red-600' : 'text-yellow-600'
                                }`}>
                                    {order.paymentStatus === 'completed' ? 'Đã thanh toán' :
                                     order.paymentStatus === 'failed' ? 'Thất bại' : 'Chờ thanh toán'}
                                </p>
                            </div>
                            {order.transactionId && (
                                <div>
                                    <p className="text-gray-400">Mã giao dịch</p>
                                    <p className="font-mono text-xs text-gray-600">{order.transactionId}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Thông tin giao hàng */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <p className="font-semibold text-gray-700 mb-4">Thông Tin Giao Hàng</p>
                        <div className="space-y-2 text-sm">
                            <div className="flex gap-2">
                                <span className="text-gray-400 w-28">Người nhận:</span>
                                <span className="font-medium text-gray-800">{order.customerName}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-gray-400 w-28">Điện thoại:</span>
                                <span className="font-medium text-gray-800">{order.customerPhone}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-gray-400 w-28">Địa chỉ:</span>
                                <span className="font-medium text-gray-800">{order.shippingAddress}</span>
                            </div>
                            {order.notes && (
                                <div className="flex gap-2">
                                    <span className="text-gray-400 w-28">Ghi chú:</span>
                                    <span className="text-gray-600">{order.notes}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sản phẩm */}
                    {order.items && order.items.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-6">
                            <p className="font-semibold text-gray-700 mb-4">Sản Phẩm</p>
                            <div className="space-y-4">
                                {order.items.map(item => (
                                    <div key={item.id} className="flex items-center gap-4">
                                        <img
                                            src={item.image_url || 'https://via.placeholder.com/56'}
                                            alt={item.product_name}
                                            className="w-16 h-16 object-cover rounded-xl bg-gray-100 border border-gray-200"
                                        />
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

                    {/* Chi tiết giá */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <p className="font-semibold text-gray-700 mb-4">Chi Tiết Thanh Toán</p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Phí vận chuyển:</span>
                                <span>{Number(order.shippingFee || 0).toLocaleString('vi-VN')} đ</span>
                            </div>
                            {Number(order.discountAmount) > 0 && (
                                <div className="flex justify-between text-blue-600">
                                    <span>Giảm giá:</span>
                                    <span>-{Number(order.discountAmount).toLocaleString('vi-VN')} đ</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-gray-800 border-t border-gray-100 pt-3 mt-1 text-base">
                                <span>Tổng cộng:</span>
                                <span className="text-blue-600">{Number(order.totalPrice).toLocaleString('vi-VN')} đ</span>
                            </div>
                        </div>
                        {order.transactionId && (
                            <p className="text-xs text-gray-400 mt-3">Mã GD: {order.transactionId}</p>
                        )}
                    </div>

                    {/* Nút hành động */}
                    <div className="space-y-3">
                        {['pending', 'processing'].includes(orderStatus) && (
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={cancelling}
                                className="w-full border border-red-300 text-red-500 py-3 rounded-xl font-bold hover:bg-red-50 transition disabled:opacity-50"
                            >
                                {cancelling ? 'Đang hủy...' : 'Hủy Đơn Hàng'}
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </>
    );
};

export default OrderDetailPage;
