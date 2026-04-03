import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import axiosInstance from "../api/config";
import useAuthStore from "../store/authStore";
import useCartStore from "../store/cartStore";
import logo2 from "../assets/logo1.png";
import {
  ShoppingCart,
  Package,
  ShieldCheck,
  User,
  LogOut,
  Settings,
  ClipboardList,
  ChevronDown,
  LogIn,
  UserPlus,
} from "lucide-react";

const Navbar = () => {
  const { user, logout, token } = useAuthStore();
  const { items } = useCartStore();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user || !token) {
      setActiveOrderCount(0);
      return;
    }
    const fetchOrderCount = () => {
      axiosInstance
        .get("/orders/my-orders")
        .then((res) => {
          const orders = res.data.data || [];
          const count = orders.filter((o) => {
            const s = o.status || o.order_status;
            return ["pending", "processing", "shipped"].includes(s);
          }).length;
          setActiveOrderCount(count);
        })
        .catch(() => { });
    };
    fetchOrderCount();
  }, [user, token]);

  useEffect(() => {
    if (items.length > 0 && user && token) {
      axiosInstance
        .get("/orders/my-orders")
        .then((res) => {
          const orders = res.data.data || [];
          const count = orders.filter((o) => {
            const s = o.status || o.order_status;
            return ["pending", "processing", "shipped"].includes(s);
          }).length;
          setActiveOrderCount(count);
        })
        .catch(() => { });
    }
  }, [items, user, token]);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate("/login");
  };

  const handleLogoClick = () => {
    window.dispatchEvent(new Event("resetHomeFilters"));
    navigate("/");
  };

  return (
    <nav className="bg-blue-600 text-white shadow">
      <div className="max-w-5xl mx-auto px-6 py-2 flex items-center justify-between">
        {/* Logo */}
        <button onClick={handleLogoClick} className="cursor-pointer">
          <img
            src={logo2}
            alt="PC Shop"
            className="h-14 w-auto object-contain"
          />
        </button>

        <div className="flex items-center gap-1">
          {user ? (
            <>
              {/* Giỏ hàng */}
              <Link
                to="/cart"
                aria-label={`Giỏ hàng (${items.length})`}
                className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors relative min-w-[70px]"
              >
                <ShoppingCart size={20} strokeWidth={1.8} />
                <span className="text-xs font-medium">Giỏ Hàng</span>
                {items.length > 0 && (
                  <span className="absolute top-1 right-3 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {items.length > 9 ? "9+" : items.length}
                  </span>
                )}
              </Link>

              {/* Đơn hàng */}
              <Link
                to="/orders"
                aria-label={`Đơn hàng (${activeOrderCount})`}
                className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors relative min-w-[70px]"
              >
                <Package size={20} strokeWidth={1.8} />
                <span className="text-xs font-medium">Đơn Hàng</span>
                {activeOrderCount > 0 && (
                  <span className="absolute top-1 right-3 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {activeOrderCount > 9 ? "9+" : activeOrderCount}
                  </span>
                )}
              </Link>

              {/* Admin */}
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors min-w-[70px]"
                >
                  <ShieldCheck
                    size={20}
                    strokeWidth={1.8}
                    className="text-yellow-300"
                  />
                  <span className="text-xs font-medium text-yellow-300">
                    Admin
                  </span>
                </Link>
              )}

              {/* Tài khoản dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors min-w-[70px]"
                >
                  <div className="relative">
                    <User size={20} strokeWidth={1.8} />
                    <ChevronDown
                      size={10}
                      className={`absolute -bottom-1 -right-2 transition-transform duration-200 ${showDropdown ? "rotate-180" : ""
                        }`}
                    />
                  </div>
                  <span className="text-xs font-medium truncate max-w-[80px]">
                    {user.full_name || user.username}
                  </span>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 top-16 bg-white text-gray-800 rounded-2xl shadow-2xl w-56 z-50 overflow-hidden border border-gray-100">
                    {/* Header dropdown */}
                    <div className="px-4 py-4 bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                          {(user.full_name || user.username)
                            ?.trim()
                            ?.split(" ")
                            ?.at(-1)
                            ?.charAt(0)
                            ?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight">
                            {user.full_name || user.username}
                          </p>
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full mt-1 inline-block">
                            {user.role === "admin"
                              ? "Quản trị viên"
                              : "Khách hàng"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-2">
                      <Link
                        to="/profile"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <User
                          size={16}
                          className="text-gray-400 group-hover:text-blue-500"
                        />
                        Thông tin tài khoản
                      </Link>

                      {user.role === "admin" && (
                        <>
                          <Link
                            to="/admin/products"
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <Settings size={16} className="text-gray-400" />
                            Quản lý sản phẩm
                          </Link>
                          <Link
                            to="/admin/orders"
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <ClipboardList
                              size={16}
                              className="text-gray-400"
                            />
                            Quản lý đơn hàng
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Đăng xuất */}
                    <div className="border-t border-gray-100 py-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 w-full text-left transition-colors"
                      >
                        <LogOut size={16} />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors min-w-[70px]"
              >
                <LogIn size={20} strokeWidth={1.8} />
                <span className="text-xs font-medium">Đăng Nhập</span>
              </Link>
              <Link
                to="/register"
                className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl hover:bg-white/20 transition-colors min-w-[70px]"
              >
                <UserPlus size={20} strokeWidth={1.8} />
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
