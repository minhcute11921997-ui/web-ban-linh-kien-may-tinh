import { useEffect, useState } from 'react';
import { getMyOrders } from '../api/orderApi';
import { toast } from 'react-toastify';

const STATUS_COLOR = {
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped:    'bg-purple-100 text-purple-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyOrders()
      .then(res => setOrders(res.data.data))  // ✅ fix res.data.data
      .catch(() => toast.error('Không thể tải đơn hàng!'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <p className="text-center py-20 text-gray-400">Đang tải đơn hàng...</p>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Đơn hàng của bạn</h1>

      {orders.length === 0 ? (
        <p className="text-center text-gray-400 py-20">Bạn chưa có đơn hàng nào</p>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="border rounded-xl p-5 bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg">Đơn hàng #{order.id}</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {new Date(order.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLOR[order.status] || 'bg-gray-100 text-gray-600'}`}>
                  {order.status_label}
                </span>
              </div>
              <div className="border-t mt-3 pt-3">
                <p className="text-blue-600 font-bold text-lg">
                  {Number(order.total_price).toLocaleString('vi-VN')}₫
                  
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
