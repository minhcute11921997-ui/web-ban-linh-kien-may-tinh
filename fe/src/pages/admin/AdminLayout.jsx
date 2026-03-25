import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const menuItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Sản phẩm' },
  { to: '/admin/orders', label: 'Đơn hàng' },
  { to: '/admin/revenue', label: 'Doanh thu' },
];

const AdminLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* ===== Sidebar ===== */}
      <aside className="w-64 flex-shrink-0 flex flex-col"
        style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>

        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <button onClick={() => navigate('/admin')} className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            </div>
            <div>
              <h1 className="text-white text-lg font-bold leading-tight">Admin Panel</h1>
              <p className="text-gray-400 text-xs">Quản trị hệ thống</p>
            </div>
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 shadow-lg shadow-blue-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom — Back to shop */}
        <div className="px-3 py-4 border-t border-white/10">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all w-full cursor-pointer">
            Về trang chủ
          </button>
        </div>
      </aside>

      {/* ===== Main content ===== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Xin chào, {user?.full_name || user?.username}</h2>
            <p className="text-xs text-gray-400">Quản trị viên</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">● Online</span>
            <button onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors cursor-pointer">
              Đăng xuất
            </button>
          </div>
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
