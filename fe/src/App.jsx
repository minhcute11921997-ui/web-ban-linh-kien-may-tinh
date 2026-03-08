import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductsPage from './pages/ProductsPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import ProfilePage from './pages/ProfilePage';
import ProductDetail from './pages/ProductDetail';

// Component banner placeholder tái sử dụng
const BannerPlaceholder = ({ gradient, icon, title, discount, to }) => (
  <a href={to || '#'}
    className="block w-full rounded-xl shadow overflow-hidden cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all duration-200">
    <div className={`w-full h-80 ${gradient} flex flex-col items-center justify-center text-white text-center p-4`}>
      <span className="text-4xl mb-3">{icon}</span>
      <p className="font-bold text-sm leading-tight">{title}</p>
      <p className="text-xs mt-2 opacity-80">Giảm đến</p>
      <p className="text-2xl font-extrabold">{discount}</p>
      <button className="mt-4 bg-white text-gray-800 text-xs font-bold px-4 py-1.5 rounded-full hover:bg-gray-100">
        MUA NGAY
      </button>
    </div>
  </a>
);

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <div className="min-h-screen bg-gray-50">
        <div className="flex gap-3 px-4 py-6 max-w-screen-2xl mx-auto">

          {/* Banner trái */}
          <div className="w-32 flex-shrink-0 hidden lg:block">
            <div className="sticky top-4 space-y-3">
              <BannerPlaceholder
                gradient="bg-gradient-to-b from-blue-600 to-blue-900"
                icon="🖥️"
                title="PC Gaming Cao Cấp"
                discount="30%"
                to="/products"
              />
              <BannerPlaceholder
                gradient="bg-gradient-to-b from-purple-500 to-pink-600"
                icon="⚡"
                title="CPU Intel Core i9"
                discount="20%"
                to="/products"
              />
            </div>
          </div>

          {/* Nội dung chính */}
          <main className="flex-1 min-w-0">
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetail />} />

              {/* Cần đăng nhập */}
              <Route path="/cart" element={
                <PrivateRoute><CartPage /></PrivateRoute>
              } />
              <Route path="/orders" element={
                <PrivateRoute><OrdersPage /></PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute><ProfilePage /></PrivateRoute>
              } />

              {/* Chỉ admin */}
              <Route path="/admin/products" element={
                <PrivateRoute adminOnly={true}><AdminProducts /></PrivateRoute>
              } />
              <Route path="/admin/orders" element={
                <PrivateRoute adminOnly={true}><AdminOrders /></PrivateRoute>
              } />
            </Routes>
          </main>

          {/* Banner phải */}
          <div className="w-32 flex-shrink-0 hidden lg:block">
            <div className="sticky top-4 space-y-3">
              <BannerPlaceholder
                gradient="bg-gradient-to-b from-red-500 to-orange-600"
                icon="🎮"
                title="VGA RTX 4090"
                discount="15%"
                to="/products"
              />
              <BannerPlaceholder
                gradient="bg-gradient-to-b from-green-500 to-teal-600"
                icon="💾"
                title="RAM DDR5 32GB"
                discount="25%"
                to="/products"
              />
            </div>
          </div>

        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;
