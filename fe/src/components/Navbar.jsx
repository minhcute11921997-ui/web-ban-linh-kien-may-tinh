import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import logo2 from '../assets/logo2.png';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const { items } = useCartStore();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate('/login');
  };

  return (
  <nav className="bg-blue-600 text-white shadow">
    <div className="max-w-5xl mx-auto px-6 py-2 flex items-center justify-between">

      {/* Logo bên trái */}
      <Link to="/">
        <img src={logo2} alt="PC Shop" className="h-14 w-auto object-contain" />
      </Link>

      {/* Menu bên phải — cùng 1 hàng với logo */}
      <div className="flex items-center gap-2">
        {user ? (
          <>
            {/* Giỏ hàng */}
            <Link to="/cart"
              className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors relative min-w-[70px]">
              <span className="text-xl">🛒</span>
              <span className="text-xs font-medium">Giỏ Hàng</span>
              {items.length > 0 && (
                <span className="absolute top-1 right-3 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {items.length}
                </span>
              )}
            </Link>

            {/* Đơn hàng */}
            <Link to="/orders"
              className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors min-w-[70px]">
              <span className="text-xl">📦</span>
              <span className="text-xs font-medium">Đơn Hàng</span>
            </Link>

            {/* Admin */}
            {user.role === 'admin' && (
              <Link to="/admin/products"
                className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors min-w-[70px]">
                <span className="text-xl">⚙️</span>
                <span className="text-xs font-medium text-yellow-300">Admin</span>
              </Link>
            )}

            {/* Tài khoản dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setShowDropdown(!showDropdown)}
                className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors min-w-[70px]">
                <span className="text-xl">👤</span>
                <span className="text-xs font-medium truncate max-w-[80px]">
                  {user.full_name || user.username}
                </span>
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-16 bg-white text-gray-800 rounded-2xl shadow-2xl w-56 z-50 overflow-hidden border border-gray-100">
                  <div className="px-4 py-4 bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                        {(user.full_name || user.username)?.slice(-1)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{user.full_name || user.username}</p>
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full mt-1 inline-block">
                          {user.role === 'admin' ? '⚙️ Quản trị viên' : '👤 Khách hàng'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <Link to="/profile" onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors group">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center text-base transition-colors">👤</span>
                      Thông tin tài khoản
                    </Link>
                    {user.role === 'admin' && (
                      <>
                        <Link to="/admin/products" onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors group">
                          <span className="w-7 h-7 rounded-lg bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center text-base transition-colors">🛍️</span>
                          Quản lý sản phẩm
                        </Link>
                        <Link to="/admin/orders" onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors group">
                          <span className="w-7 h-7 rounded-lg bg-green-100 group-hover:bg-green-200 flex items-center justify-center text-base transition-colors">📋</span>
                          Quản lý đơn hàng
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="border-t border-gray-100 py-2">
                    <button onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 w-full text-left transition-colors group">
                      <span className="w-7 h-7 rounded-lg bg-red-100 group-hover:bg-red-200 flex items-center justify-center text-base transition-colors">🚪</span>
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors min-w-[70px]">
              <span className="text-xl">🔑</span>
              <span className="text-xs font-medium">Đăng Nhập</span>
            </Link>
            <Link to="/register" className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors min-w-[70px]">
              <span className="text-xl">📝</span>
              <span className="text-xs font-medium">Đăng Ký</span>
            </Link>
          </>
        )}
      </div>

    </div>
  </nav>
);

};

export default Navbar;
