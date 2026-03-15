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

        axios.get(`/api/payments/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                if (res.data.success) {
                    setOrder(res.data.data);
                    const ps = res.data.data.paymentStatus;
                    if (ps === 'completed') {
                        setStatus('success');
                        toast.success('Thanh toán thành công!');
                    } else if (ps === 'failed') {
                        setStatus('failed');
                        toast.error('Thanh toán thất bại');
                    } else {
                        setStatus('success');
                        toast.success('Đặt hàng thành công!');
                    }
                } else {
                    setStatus('failed');
                }
            })
            .catch(() => setStatus('failed'))
            .finally(() => setLoading(false));
    }, [orderId, token, paymentMethod, failedStatus]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (status === 'failed') return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-md w-full p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
                    <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Thanh Toán Thất Bại</h1>
                <p className="text-gray-400 mb-8">Có lỗi trong quá trình thanh toán. Vui lòng thử lại.</p>
                <div className="space-y-3">
                    <Link to="/checkout" className="block bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
                        Thử Lại
                    </Link>
                    <Link to="/cart" className="block border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition">
                        Quay Lại Giỏ Hàng
                    </Link>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-2xl mx-auto px-4">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-1">Đặt Hàng Thành Công</h1>
                    <p className="text-gray-400">Cảm ơn bạn đã mua hàng tại cửa hàng</p>
                </div>

                <div className="space-y-4">

                    {order && (
                        <>
                            {/* Thông tin đơn hàng */}
                            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                                <p className="font-semibold text-gray-700 mb-4">Thông Tin Đơn Hàng</p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-400">Mã đơn hàng</p>
                                        <p className="font-bold text-xl text-gray-800">#{order.orderId}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Trạng thái</p>
                                        <p className="font-semibold text-blue-600">{STATUS_LABEL[order.orderStatus] || order.orderStatus}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Phương thức thanh toán</p>
                                        <p className="font-medium text-gray-800">{order.paymentMethod === 'cod' ? 'Tiền Mặt (COD)' : 'VNPay'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Ngày đặt</p>
                                        <p className="font-medium text-gray-800">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                                    </div>
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
                                    <p className="font-semibold text-gray-700 mb-4">Sản Phẩm Đã Đặt</p>
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
                                        <span>Tạm tính:</span>
                                        <span>{((order.totalPrice - (order.shippingFee || 0) + (order.discountAmount || 0))).toLocaleString('vi-VN')} đ</span>
                                    </div>
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
                        </>
                    )}

                    {/* Thông báo */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
                        Đội ngũ hỗ trợ sẽ liên hệ với bạn để xác nhận giao hàng.
                    </div>

                    {/* Nút hành động */}
                    <div className="space-y-3">
                        <Link to="/orders" className="block bg-blue-600 text-white py-3 rounded-xl font-bold text-center hover:bg-blue-700 transition">
                            Xem Lịch Sử Đơn Hàng
                        </Link>
                        <Link to="/" className="block border border-gray-200 text-gray-600 py-3 rounded-xl font-bold text-center hover:bg-gray-50 transition">
                            Tiếp Tục Mua Sắm
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;
