import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import useAuthStore from '../store/authStore';
import { toast } from 'react-toastify';

const LoginPage = () => {
  const [form, setForm] = useState({ login: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.login.trim()) newErrors.login = 'Vui lòng nhập email hoặc tên đăng nhập';
    if (!form.password) newErrors.password = 'Vui lòng nhập mật khẩu';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      
      const payload = { username: form.login, password: form.password };
      const res = await login(payload);
      setAuth(res.data.user, res.data.token);
      toast.success('Đăng nhập thành công!');
      navigate(res.data.user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại!';
      if (msg.toLowerCase().includes('password')) setErrors({ password: msg });
      else setErrors({ login: msg });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
      errors[field] ? 'border-red-400 focus:ring-red-400' : 'focus:ring-blue-500'
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Đăng nhập</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium mb-1">
              Email hoặc tên đăng nhập
            </label>
            
            <input
              type="text"
              placeholder="you@example.com hoặc minhcute123"
              value={form.login}
              onChange={handleChange('login')}
              className={inputClass('login')}
            />
            {errors.login && (
              <p className="text-red-500 text-xs mt-1">⚠ {errors.login}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mật khẩu</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange('password')}
              className={inputClass('password')}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">⚠ {errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <p className="text-center mt-4 text-sm text-gray-500">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-medium">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
