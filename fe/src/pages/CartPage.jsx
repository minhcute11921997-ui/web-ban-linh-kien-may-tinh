import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import { createOrder } from '../api/orderApi';
import { toast } from 'react-toastify';

const CartPage = () => {
  const { items, loading, fetchCart, updateItem, removeItem, clearAll } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => { fetchCart(); }, []);

  const totalPrice = items.reduce((sum, item) => 
    sum + Number(item.price) * item.quantity, 0
  );

  const handleOrder = async () => {
    if (items.length === 0) return;
    try {
      await createOrder({ items });
      await clearAll();
      toast.success('Đặt hàng thành công!');
      navigate('/orders');
    } catch {
      toast.error('Đặt hàng thất bại, vui lòng thử lại!');
    }
  };

  if (loading) return (
    <p className="text-center py-20 text-gray-400">Đang tải giỏ hàng...</p>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Giỏ hàng của bạn</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg mb-4">Giỏ hàng đang trống</p>
          <a href="/products" className="text-blue-600 hover:underline">
            → Tiếp tục mua sắm
          </a>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {items.map(item => (
              <div key={item.id} className="flex items-center border rounded-xl p-4 gap-4 bg-white shadow-sm">
                <img
                  src={item.image || 'https://placehold.co/80x80?text=No+Img'}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-blue-600 font-bold">
                    {Number(item.price).toLocaleString('vi-VN')}₫
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateItem(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-8 h-8 border rounded-full hover:bg-gray-100 disabled:opacity-30"
                  >-</button>
                  <span className="w-8 text-center font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateItem(item.id, item.quantity + 1)}
                    className="w-8 h-8 border rounded-full hover:bg-gray-100"
                  >+</button>
                </div>
                <p className="w-32 text-right font-semibold">
                  {(Number(item.price) * item.quantity).toLocaleString('vi-VN')}₫
                </p>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-400 hover:text-red-600 text-xl"
                >✕</button>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 flex justify-between items-center">
            <p className="text-xl font-bold">
              Tổng cộng:{' '}
              <span className="text-blue-600">
                {totalPrice.toLocaleString('vi-VN')}₫
              </span>
            </p>
            <button
              onClick={handleOrder}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Đặt hàng ngay
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;
