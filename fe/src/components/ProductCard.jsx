import { Link, useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';

// Hàm strip HTML tags khỏi description
const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
};

const ProductCard = ({ product }) => {
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleAddToCart = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await addItem(product.id, 1);
      toast.success('Đã thêm vào giỏ hàng!');
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error(error?.message || 'Có lỗi xảy ra!');
    }
  };

  const cleanDescription = stripHtml(product.description);

  return (
    <div className="border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 bg-white flex flex-col h-full group">

      {/* Ảnh sản phẩm */}
      <Link to={`/products/${product.id}`} className="block p-4 flex-1">
        <div className="w-full aspect-square bg-gray-50 rounded-xl mb-3 overflow-hidden">
          <img
            src={product.image_url || 'https://placehold.co/300x300?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Tên sản phẩm */}
        <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-2 text-gray-800 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        {/* Description đã strip HTML */}

        {/* Giá */}
        <p className="text-blue-600 font-bold text-base mt-1">
          {Number(product.price).toLocaleString('vi-VN')}₫
        </p>

      </Link>

      {/* Nút thêm giỏ hàng - luôn ở đáy */}
      <div className="px-4 pb-4">
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full bg-blue-600 text-white text-sm py-2 rounded-xl hover:bg-blue-700 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
        >
          {product.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
        </button>
      </div>

    </div>
  );
};

export default ProductCard;