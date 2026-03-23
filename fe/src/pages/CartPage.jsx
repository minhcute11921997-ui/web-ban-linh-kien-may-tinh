import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import { createOrder } from '../api/orderApi';
import { toast } from 'react-toastify';

const CartPage = () => {
  const { items, loading, fetchCart, updateItem, removeItem, clearAll, selectedItems, toggleSelectedItem, toggleSelectAll } = useCartStore();
  const navigate = useNavigate();
  const [inputValues, setInputValues] = useState({});

  useEffect(() => { 
    fetchCart(); 
  }, []);

  const totalPrice = items.reduce((sum, item) => {
    if (selectedItems.includes(item.id)) {
      return sum + Number(item.price) * item.quantity;
    }
    return sum;
  }, 0);

  const handleOrder = async () => {
    if (items.length === 0) return;
    try {
      const selected = items.filter(i => selectedItems.includes(i.id));
      await createOrder({ items: selected });
      await clearAll();
      toast.success('Đặt hàng thành công!');
      navigate('/orders');
    } catch {
      toast.error('Đặt hàng thất bại, vui lòng thử lại!');
    }
  };

  const handleClearAll = () => {
    if (selectedItems.length === 0) {
      toast.warning('Vui lòng chọn sản phẩm để xóa!');
      return;
    }
      selectedItems.forEach(itemId => removeItem(itemId));
  };

  const handleSelectItem = (itemId) => {
    toggleSelectedItem(itemId);
  };

  const handleSelectAll = () => {
    toggleSelectAll();
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen text-gray-400">
      <p className="text-center text-lg">Đang tải giỏ hàng...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Giỏ hàng của bạn</h1>
          <p className="text-gray-500">{items.length} sản phẩm</p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg mb-6">Giỏ hàng đang trống</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Cart Items */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg text-gray-900">Chọn sản phẩm</h3>
                <div className="flex items-center gap-6">
                  <button
                    onClick={handleClearAll}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedItems.length === 0}
                  >
                    Xóa 
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === items.length && items.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-semibold text-gray-700">Chọn tất cả</span>
                  </label>
                </div>
              </div>
                <div className="space-y-4">
                  {items.map(item => (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:shadow-md transition bg-gray-50"
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="w-5 h-5 rounded cursor-pointer"
                      />

                      {/* Image */}
                      <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate(`/products/${item.id}`)}>
                        <img
                          src={item.image_url || 'https://placehold.co/100x100?text=No+Image'}
                          alt={item.name}
                          className="w-24 h-24 object-cover rounded-lg bg-white hover:opacity-80 transition"
                          onError={(e) => (e.target.src = 'https://placehold.co/100x100?text=No+Image')}
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 cursor-pointer" onClick={() => navigate(`/products/${item.id}`)}>
                        <h3 className="font-semibold text-gray-900 text-lg mb-1 hover:text-blue-600 transition">{item.name}</h3>
                        <p className="text-blue-600 font-bold text-lg">
                          {Number(item.price).toLocaleString('vi-VN')}₫
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                        <button
                          onClick={() => updateItem(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >−</button>
                        <input
                          type="number"
                          min="1"
                          value={inputValues[item.id] !== undefined ? inputValues[item.id] : item.quantity}
                          onChange={(e) => {
                            setInputValues({
                              ...inputValues,
                              [item.id]: e.target.value
                            });
                          }}
                          onBlur={(e) => {
                            let val = e.target.value;
                            if (val === '' || parseInt(val) < 1) {
                              updateItem(item.id, 1);
                            } else {
                              let numVal = parseInt(val);
                              if (!isNaN(numVal)) {
                                // Kiểm tra không vượt quá stock
                                if (numVal > item.stock) {
                                  numVal = item.stock;
                                  toast.warning(`Chỉ còn ${item.stock} sản phẩm trong kho!`);
                                }
                                updateItem(item.id, numVal);
                              }
                            }
                            setInputValues({
                              ...inputValues,
                              [item.id]: undefined
                            });
                          }}
                          className="w-12 text-center font-semibold text-gray-900 border-0 outline-none bg-transparent [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
                        />
                        <button
                          onClick={() => updateItem(item.id, item.quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
                        >+</button>
                      </div>

                      {/* Total Price */}
                      <div className="text-right">
                        <p className="font-bold text-gray-900 text-lg">
                          {(Number(item.price) * item.quantity).toLocaleString('vi-VN')}₫
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-white bg-blue-500 hover:bg-red-600 rounded-lg transition font-bold text-lg shadow-md hover:shadow-lg"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Clear All Button - MOVED UP */}
              </div>

              {/* Total Price Section */}
              <div className="mt-6 bg-white rounded-2xl shadow-sm p-6">
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-gray-600 font-semibold">Tổng cộng:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {totalPrice.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/checkout')}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
                  >
                    Tiến hành thanh toán
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
