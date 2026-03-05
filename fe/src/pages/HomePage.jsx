import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <h1 className="text-5xl font-bold text-blue-600 mb-4">🖥️ PC Shop</h1>
      <p className="text-gray-500 text-xl mb-10 text-center">
        Mua sắm linh kiện máy tính chính hãng, giá tốt nhất
      </p>
      <Link
        to="/products"
        className="bg-blue-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition"
      >
        Xem sản phẩm ngay →
      </Link>
    </div>
  );
};

export default HomePage;
