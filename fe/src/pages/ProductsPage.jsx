import { useEffect, useState } from 'react';
import { getAllProducts } from '../api/productApi';
import ProductCard from '../components/ProductCard';
import { toast } from 'react-toastify';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAllProducts()
      .then(res =>{ console.log('API response:', res.data);setProducts(res.data.data || [])})
      .catch(() => toast.error('Không thể tải sản phẩm!'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Danh sách sản phẩm</h1>
      <input
        type="text"
        placeholder="🔍 Tìm kiếm sản phẩm..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border px-4 py-2 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {loading ? (
        <p className="text-center text-gray-400 py-20">Đang tải sản phẩm...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-20">Không tìm thấy sản phẩm nào</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
