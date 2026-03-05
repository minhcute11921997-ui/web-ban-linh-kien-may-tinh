import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const { items } = useCartStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between shadow">
      <Link to="/" className="text-xl font-bold">🖥️ PC Shop</Link>

      <div className="flex items-center gap-5">
        

        {user ? (
          <>
            <Link to="/cart" className="relative hover:underline">
              🛒 Giỏ hàng
              {items.length > 0 && (
                <span className="absolute -top-2 -right-4 bg-red-500 text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Link>
            <Link to="/orders" className="hover:underline">Đơn hàng</Link>
            {user.role === 'admin' && (
              <Link to="/admin/products" className="text-yellow-300 hover:underline">
                ⚙️ Admin
              </Link>
            )}
            <span
            title={user.full_name || user.username}
            className="text-sm opacity-90 max-w-[150px] truncate"
            >
              {user.full_name || user.username}
            </span>
            <button
              onClick={handleLogout}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm hover:bg-gray-100"
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:underline">Đăng nhập</Link>
            <Link to="/register" className="bg-white text-blue-600 px-3 py-1 rounded text-sm hover:bg-gray-100">
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
