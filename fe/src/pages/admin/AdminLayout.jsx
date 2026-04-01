import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  TrendingUp,
  LayoutGrid,
  Users,
  LogOut,
  ShieldCheck,
} from "lucide-react";

const menuItems = [
  {
    to: "/admin",
    label: "Dashboard",
    icon: <LayoutDashboard size={17} />,
    end: true,
  },
  { to: "/admin/products", label: "Sản phẩm", icon: <Package size={17} /> },
  { to: "/admin/orders", label: "Đơn hàng", icon: <ShoppingBag size={17} /> },
  { to: "/admin/revenue", label: "Doanh thu", icon: <TrendingUp size={17} /> },
  {
    to: "/admin/categories",
    label: "Danh mục",
    icon: <LayoutGrid size={17} />,
  },
  { to: "/admin/users", label: "Người dùng", icon: <Users size={17} /> },
];

const AdminLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      className="flex h-screen bg-blue-50/40"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* Sidebar */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col"
        style={{ background: "linear-gradient(180deg, #1e3a8a 100%)" }}
      >
        {/* Logo / Brand */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-wide">
              Admin Panel
            </span>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              // SAU
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[15px] font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-white text-blue-700 shadow-md shadow-blue-900/30"
                    : "text-white hover:text-white hover:bg-white/10"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={isActive ? "text-blue-600" : "text-white/70"}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {(user?.full_name || user?.username || "A")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {user?.full_name || user?.username}
              </p>
              <p className="text-blue-200 text-xs">Quản trị viên</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-blue-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Xin chào, {user?.full_name || user?.username}
            </h2>
            <p className="text-xs text-gray-400">Quản trị viên hệ thống</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm bg-blue-100 text-blue-500 hover:bg-blue-200 hover:text-blue-700 font-medium transition-colors cursor-pointer px-3 py-1.5 rounded-lg"
          >
            <LogOut size={15} />
            Đăng xuất
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
