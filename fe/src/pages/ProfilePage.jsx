import { useState } from 'react';
import useAuthStore from '../store/authStore';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ProfilePage = () => {
  const { user, setUser, token } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (type) => {
  setToast(type);
  setTimeout(() => setToast(null), 3000);
};
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/auth/profile`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser({ ...user, ...res.data.user });
      setEditing(false);
      showToast('success');
    } catch (err) {
        console.error(err.response?.data);
      showToast('error');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: 'Tên đăng nhập', value: user?.username,   readOnly: true },
    { label: 'Họ tên',        value: form.full_name,name: 'full_name' },
    { label: 'Email',         value: form.email,   name: 'email' },
    { label: 'Số điện thoại', value: form.phone,  name: 'phone' },
    { label: 'Địa chỉ',       value: form.address, name: 'address' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
        {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-medium
          ${toast === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
        >
          {toast === 'success' ? 'Cập nhật thông tin thành công!' : 'Cập nhật thất bại, thử lại!'}
        </div>
      )}
      <h1 className="text-2xl font-bold mb-6">Thông tin tài khoản</h1>

      <div className="bg-white rounded-2xl shadow p-6 space-y-4">

        {/* Avatar + nút chỉnh sửa */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {(user?.full_name || user?.username)?.slice(-1)?.toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-semibold">{user?.full_name || user?.username}</p>
              <span className="text-sm bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                {user?.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
              </span>
            </div>
          </div>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium transition-colors"
            >
              Chỉnh sửa
            </button>
          ) : (
            <div className="flex gap-2">
              <button
  onClick={() => {
    setEditing(false);
    setForm({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
    });
  }}
  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm font-medium transition-colors"
>
  Huỷ
</button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          )}
        </div>

        {/* Thông tin chi tiết */}
        <div className="space-y-2">
          {fields.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${item.color}`}>
                  {item.icon}
                </span>
                <span className="text-sm text-gray-500">{item.label}</span>
              </div>

              {editing && !item.readOnly ? (
                <input
                  name={item.name}
                  value={item.value}
                  onChange={handleChange}
                  className="text-sm font-semibold text-gray-800 text-right bg-white border border-blue-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
                />
              ) : (
                <span className="text-sm font-semibold text-gray-800">{item.value || '—'}</span>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
