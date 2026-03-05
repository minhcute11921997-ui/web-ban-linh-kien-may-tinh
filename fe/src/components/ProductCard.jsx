import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';

const ProductCard = ({ product }) => {
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await addItem(product.id, 1);
      toast.success('Đã thêm vào giỏ hàng!');
    } catch {
      toast.error('Có lỗi xảy ra!');
    }
  };

  return (
    <div className="border rounded-xl p-4 shadow hover:shadow-md transition bg-white">
      <img
        src={product.image || 'https://placehold.co/300x200?text=No+Image'}
        alt={product.name}
        className="w-full h-48 object-cover rounded-lg mb-3"
      />
      <h3 className="font-semibold text-base mb-1 line-clamp-2">{product.name}</h3>
      <p className="text-gray-400 text-sm mb-2 line-clamp-2">{product.description}</p>
      <p className="text-blue-600 font-bold text-lg">
        {Number(product.price).toLocaleString('vi-VN')}₫
      </p>
      <p className="text-gray-400 text-xs mb-3">Còn {product.stock} sản phẩm</p>
      <button
        onClick={handleAddToCart}
        disabled={product.stock === 0}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {product.stock === 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
      </button>
    </div>
  );
};

export default ProductCard;
