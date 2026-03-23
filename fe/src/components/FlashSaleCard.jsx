import { Link, useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';

const FlashSaleCard = ({ product }) => {
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleAddToCart = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    try {
      await addItem(product.id, 1);
      toast.success('Đã thêm vào giỏ hàng!');
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
          -{product.discountPercent}%
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
            {Number(product.price).toLocaleString('vi-VN')}₫
          </p>
          <p className="text-gray-400 text-xs line-through">
            {Number(product.originalPrice).toLocaleString('vi-VN')}₫
          </p>
        </div>

        {/* Thanh tiến độ còn hàng */}
        <div className="mb-2">
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full transition-all"
              style={{ width: `${(product.stockLeft / product.stockTotal) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Còn {product.stockLeft} suất</p>
        </div>

        {/* Nút */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full mt-auto bg-red-500 text-white text-xs py-1.5 rounded-lg hover:bg-red-600 transition disabled:opacity-40"
        >
          {product.stock === 0 ? 'Hết hàng' : '🔥 Mua ngay'}
        </button>
      </div>
    </div>
  );
};

export default FlashSaleCard;