import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import useAuthStore from '../store/authStore';

const STATUS_LABEL = {
    pending:    'Chờ xử lý',
    processing: 'Đang xử lý',
    shipped:    'Đang giao',
    delivered:  'Đã giao',
    cancelled:  'Đã hủy',
};

const PaymentSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('checking');

    const orderId = searchParams.get('orderId');
    const paymentMethod = searchParams.get('method') || 'cod';
    const failedStatus = searchParams.get('status');

    useEffect(() => {
        // VNPay callback trả về status=failed
        if (failedStatus === 'failed') {
            setStatus('failed');
            setLoading(false);
            return;
        }

        if (!orderId) {
            setStatus('failed');
            setLoading(false);
            return;
        }

        const fetchOrderStatus = async () => {
            try {
                const response = await axios.get(`/api/payments/${orderId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success) {
                    setOrder(response.data.data);
                    const ps = response.data.data.paymentStatus;
                    if (ps === 'completed') {
                        setStatus('success');
                        toast.success('✅ Thanh toán thành công!');
                    } else if (ps === 'failed') {
                        setStatus('failed');
                        toast.error('❌ Thanh toán thất bại');
                    } else if (paymentMethod === 'cod') {
                        setStatus('success');
                        toast.success('✅ Đơn hàng đã được tạo!');
                    } else {
                        setStatus('pending');
                    }
                } else {
                    setStatus('failed');
                }
            } catch (error) {
                console.error('Lỗi lấy thông tin đơn hàng:', error);
                setStatus('failed');
            } finally {
                setLoading(false);
            }
        };

        fetchOrderStatus();
    }, [orderId, token, paymentMethod, failedStatus]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600">Đang xử lý thông tin...</p>
                </div>
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
                    <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">❌ Thanh Toán Thất Bại</h1>
                    <p className="text-gray-600 mb-6">Có lỗi trong quá trình thanh toán. Vui lòng thử lại.</p>
                    <div className="space-y-3">
                        <Link to="/checkout" className="block bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">Thử Lại</Link>
                        <Link to="/cart" className="block border border-blue-600 text-blue-600 py-2 rounded-lg font-semibold hover:bg-blue-50">Quay Lại Giỏ Hàng</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">✅ Đặt Hàng Thành Công!</h1>
                    <p className="text-gray-600">Cảm ơn bạn đã mua hàng tại cửa hàng</p>
                </div>

                {order && (
                    <>
                        {/* Thông tin đơn hàng */}
                        <div className="bg-gray-50 rounded-lg p-6 mb-6">
                            <h2 className="font-bold text-lg mb-4 text-gray-800">📋 Thông Tin Đơn Hàng</h2>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Mã đơn hàng</p>
                                    <p className="font-bold text-xl text-gray-900">#{order.orderId}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Trạng thái</p>
                                    <p className="font-semibold text-blue-600">{STATUS_LABEL[order.orderStatus] || order.orderStatus}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Phương thức thanh toán</p>
                                    <p className="font-semibold">{order.paymentMethod === 'cod' ? '💵 Tiền Mặt (COD)' : '🏦 VNPay'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Ngày đặt</p>
                                    <p className="font-semibold">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Thông tin giao hàng */}
                        <div className="bg-blue-50 rounded-lg p-6 mb-6">
                            <h2 className="font-bold text-lg mb-4 text-gray-800">🚚 Thông Tin Giao Hàng</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex gap-2">
                                    <span className="text-gray-500 w-32">Người nhận:</span>
                                    <span className="font-semibold">{order.customerName}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-gray-500 w-32">Điện thoại:</span>
                                    <span className="font-semibold">{order.customerPhone}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-gray-500 w-32">Địa chỉ:</span>
                                    <span className="font-semibold">{order.shippingAddress}</span>
                                </div>
                                {order.notes && (
                                    <div className="flex gap-2">
                                        <span className="text-gray-500 w-32">Ghi chú:</span>
                                        <span>{order.notes}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sản phẩm */}
                        {order.items && order.items.length > 0 && (
                            <div className="bg-white border rounded-lg p-6 mb-6">
                                <h2 className="font-bold text-lg mb-4 text-gray-800">🛍️ Sản Phẩm Đã Đặt</h2>
                                <div className="space-y-3">
                                    {order.items.map(item => (
                                        <div key={item.id} className="flex items-center gap-3 border-b pb-3 last:border-0 last:pb-0">
                                            <img src={item.image_url || 'https://via.placeholder.com/60'}
                                                alt={item.product_name}
                                                className="w-14 h-14 object-cover rounded-lg bg-gray-100" />
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm">{item.product_name}</p>
                                                <p className="text-gray-500 text-sm">x{item.quantity}</p>
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
                        <div className="bg-gray-50 rounded-lg p-6 mb-6">
                            <h2 className="font-bold text-lg mb-4 text-gray-800">💰 Chi Tiết Thanh Toán</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Tạm tính:</span>
                                    <span>{((order.totalPrice - (order.shippingFee || 0) + (order.discountAmount || 0))).toLocaleString('vi-VN')} ₫</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Phí vận chuyển:</span>
                                    <span>{Number(order.shippingFee || 0).toLocaleString('vi-VN')} ₫</span>
                                </div>
                                {Number(order.discountAmount) > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Giảm giá:</span>
                                        <span>-{Number(order.discountAmount).toLocaleString('vi-VN')} ₫</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                                    <span>Tổng cộng:</span>
                                    <span className="text-blue-600">{Number(order.totalPrice).toLocaleString('vi-VN')} ₫</span>
                                </div>
                            </div>
                            {order.transactionId && (
                                <p className="text-xs text-gray-400 mt-3">Mã giao dịch: {order.transactionId}</p>
                            )}
                        </div>
                    </>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm">
                    <p className="text-yellow-900">📞 Đội ngũ hỗ trợ sẽ liên hệ với bạn để xác nhận giao hàng.</p>
                </div>

                <div className="space-y-3">
                    <Link to="/orders" className="block bg-blue-600 text-white py-3 rounded-lg font-bold text-center hover:bg-blue-700 transition">
                        📋 Xem Lịch Sử Đơn Hàng
                    </Link>
                    <Link to="/" className="block border border-blue-600 text-blue-600 py-3 rounded-lg font-bold text-center hover:bg-blue-50 transition">
                        🛍️ Tiếp Tục Mua Sắm
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;
