import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const menuItems = [
  { to: '/admin',            label: 'Dashboard',  end: true },
  { to: '/admin/products',   label: 'Sản phẩm'   },
  { to: '/admin/orders',     label: 'Đơn hàng'   },
  { to: '/admin/revenue',    label: 'Doanh thu'  },
  { to: '/admin/categories', label: 'Danh mục'   },
  { to: '/admin/users',      label: 'Người dùng' },
];

const AdminLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-blue-50/40" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col"
        style={{ background: 'linear-gradient(180deg, #1e3a8a 100%)' }}>

        {/* Menu */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) =>
                `flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-md shadow-blue-900/30'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`
              }>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 mb-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {(user?.full_name || user?.username || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.full_name || user?.username}</p>
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
          <div className="flex items-center gap-4">
            <button onClick={handleLogout}
              className="text-sm bg-blue-100 text-blue-500 hover:bg-blue-200 hover:text-blue-700 font-medium transition-colors cursor-pointer px-3 py-1.5 rounded-lg">
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