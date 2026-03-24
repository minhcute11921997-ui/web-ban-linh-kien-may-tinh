import { Link } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const FeaturedProductCard = ({ product }) => {
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
    <div className="flex-shrink-0 w-44 bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 hover:border-blue-200 hover:-translate-y-0.5 flex flex-col">
      
      {/* Ảnh */}
      <Link to={`/products/${product.id}`} className="block">
        <div className="w-full aspect-square bg-gray-50 rounded-t-xl overflow-hidden">
          <img
            src={product.image_url || 'https://placehold.co/200x200?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>

      <div className="p-2.5 flex flex-col flex-1">
        <Link to={`/products/${product.id}`}>
          <h3 className="text-xs font-medium text-gray-700 line-clamp-2 hover:text-blue-600 transition mb-1">
            {product.name}
          </h3>
        </Link>
        {product.discount_percent > 0 ? (
        <div className="mb-2">
          <div className="flex items-center gap-1 flex-wrap">
            <p className="text-blue-600 font-bold text-sm">
              {Math.round(product.price * (1 - product.discount_percent / 100)).toLocaleString('vi-VN')}₫
            </p>
            <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-medium">
              -{product.discount_percent}%
            </span>
          </div>
          <p className="text-gray-400 line-through text-xs">
            {Number(product.price).toLocaleString('vi-VN')}₫
          </p>
        </div>
      ) : (
        <p className="text-blue-600 font-bold text-sm mb-2">
          {Number(product.price).toLocaleString('vi-VN')}₫
        </p>
      )}
        {/* Nút ghim đáy */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full mt-auto bg-blue-600 text-white text-xs py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-40"
        >
          {product.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ '}
        </button>
      </div>

    </div>
  );
};

export default FeaturedProductCard;