import { useEffect, useState } from 'react';
import { getAllCategories } from '../../api/categoryApi';
import axiosInstance from '../../api/config';
import { toast } from 'react-toastify';

const emptyForm = { name: '', description: '' };

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await getAllCategories();
      setCategories(res.data.data || []);
    } catch {
      toast.error('Không thể tải danh mục!');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axiosInstance.put(`/categories/${editId}`, form);
        toast.success('Cập nhật danh mục thành công!');
      } else {
        await axiosInstance.post('/categories', form);
        toast.success('Thêm danh mục thành công!');
      }
      setForm(emptyForm);
      setEditId(null);
      setShowForm(false);
      fetchCategories();
    } catch {
      toast.error('Có lỗi xảy ra!');
    }
  };

  const handleEdit = (cat) => {
    setForm({ name: cat.name, description: cat.description || '' });
    setEditId(cat.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa danh mục này?')) return;
    try {
      await axiosInstance.delete(`/categories/${id}`);
      toast.success('Đã xóa danh mục!');
      fetchCategories();
    } catch {
      toast.error('Xóa thất bại! Có thể danh mục đang được sử dụng.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý danh mục</h1>
        <button
          onClick={() => { setShowForm(!showForm); setForm(emptyForm); setEditId(null); }}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer shadow-sm">
          + Thêm danh mục
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-lg text-gray-800 mb-4">
            {editId ? '✏️ Chỉnh sửa danh mục' : '➕ Thêm danh mục mới'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Tên danh mục *</label>
              <input value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Mô tả</label>
              <input value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 font-medium text-sm cursor-pointer">
              {editId ? 'Cập nhật' : 'Thêm mới'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl hover:bg-gray-50 font-medium text-sm cursor-pointer">
              Hủy
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500">
              <th className="text-left px-6 py-3 font-medium">#</th>
              <th className="text-left px-6 py-3 font-medium">Tên danh mục</th>
              <th className="text-left px-6 py-3 font-medium">Mô tả</th>
              <th className="text-left px-6 py-3 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 text-gray-400">{cat.id}</td>
                <td className="px-6 py-3 font-medium text-gray-800">{cat.name}</td>
                <td className="px-6 py-3 text-gray-500">{cat.description || '—'}</td>
                <td className="px-6 py-3">
                  <div className="flex gap-3">
                    <button onClick={() => handleEdit(cat)}
                      className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer">Sửa</button>
                    <button onClick={() => handleDelete(cat.id)}
                      className="text-red-500 hover:text-red-700 font-medium cursor-pointer">Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Chưa có danh mục nào</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCategories;
