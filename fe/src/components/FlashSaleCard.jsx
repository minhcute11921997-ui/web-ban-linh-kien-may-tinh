import { Link, useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

const FlashSaleCard = ({ product }) => {
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
 const discountPercent = product.discount_percent || product.discountPercent || 0;
  
 const stockTotal = product.stockTotal || product.stock || 10;
  const stockLeft = product.stockLeft ?? product.stock ?? 0;
  const handleAddToCart = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    try {
      await addItem(product.id, 1);
    } catch (error) {
      toast.error(error?.message || 'Có lỗi xảy ra!');
    }
  };

  return (
    <div className="flex-shrink-0 w-44 bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 hover:border-red-200 flex flex-col">
      
      {/* Ảnh + Badge giảm giá */}
      <div className="relative">
        <Link to={`/products/${product.id}`} className="block">
          <div className="w-full aspect-square bg-gray-50 rounded-t-xl overflow-hidden">
            <img
              src={product.image_url || 'https://placehold.co/200x200?text=No+Image'}
              alt={product.name}
              className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-md">
          -{product.discount_percent}%
        </span>
      </div>

      {/* Nội dung */}
      <div className="p-2.5 flex flex-col flex-1">
        <Link to={`/products/${product.id}`}>
          <h3 className="text-xs font-medium text-gray-700 line-clamp-2 hover:text-red-500 transition mb-1">
            {product.name}
          </h3>
        </Link>

        {/* Giá */}
        <div className="mb-2">
  <p className="text-red-500 font-bold text-sm">
    {Number(product.salePrice).toLocaleString('vi-VN')}₫
  </p>
  <p className="text-gray-400 text-xs line-through">
    {Number(product.originalPrice).toLocaleString('vi-VN')}₫
  </p>
</div>

{/* Thanh tiến độ còn hàng */}
<div className="w-full h-1.5 bg-gray-100 rounded-full mb-1">
  <div
    className="h-full bg-red-400 rounded-full transition-all"
    style={{ width: stockTotal > 0 ? `${Math.min(100, (stockLeft / stockTotal) * 100)}%` : '0%' }}
  />
</div> 
  <p className="text-xs text-gray-400 mt-0.5">Còn {stockLeft} suất</p>
</div>

        {/* Nút */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full mt-auto bg-red-500 text-white text-xs py-1.5 rounded-lg hover:bg-red-600 transition disabled:opacity-40"
        >
          {product.stock === 0 ? 'Hết hàng' : ' Mua ngay'}
        </button>
      </div>
  );
};

export default FlashSaleCard;