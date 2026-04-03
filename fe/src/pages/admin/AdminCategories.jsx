import { useEffect, useState } from 'react';
import { getAllCategories } from '../../api/categoryApi';
import axiosInstance from '../../api/config';
import {
  LayoutGrid,
  Plus,
  Pencil,
  Trash2,
  Save,
  PlusCircle,
  X,
  AlignLeft,
  Tag,
  FolderX,
} from 'lucide-react';

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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axiosInstance.put(`/categories/${editId}`, form);
      } else {
        await axiosInstance.post('/categories', form);
      }
      setForm(emptyForm);
      setEditId(null);
      setShowForm(false);
      fetchCategories();
    } catch {
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
      fetchCategories();
    } catch {
    }
  };

  const inputCls = "w-full border border-gray-200 pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <LayoutGrid size={22} className="text-blue-600" />
          Quản lý danh mục
        </h1>
        <button
          onClick={() => { setShowForm(!showForm); setForm(emptyForm); setEditId(null); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer shadow-sm"
        >
          <Plus size={16} />
          Thêm danh mục
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-lg text-gray-800 mb-4">
            {editId ? (
              <><Pencil size={18} className="text-blue-500" /> Chỉnh sửa danh mục</>
            ) : (
              <><PlusCircle size={18} className="text-blue-500" /> Thêm danh mục mới</>
            )}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tên danh mục */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mb-1">
                <Tag size={14} className="text-blue-500" />
                Tên danh mục <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  placeholder="Nhập tên danh mục"
                  required
                />
              </div>
            </div>

            {/* Mô tả */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mb-1">
                <AlignLeft size={14} className="text-blue-500" />
                Mô tả
              </label>
              <div className="relative">
                <AlignLeft size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className={inputCls}
                  placeholder="Nhập mô tả (tuỳ chọn)"
                />
              </div>
            </div>
          </div>

          {/* Buttons form */}
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 font-medium text-sm cursor-pointer transition-colors"
            >
              {editId ? <><Save size={15} /> Cập nhật</> : <><PlusCircle size={15} /> Thêm mới</>}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl hover:bg-gray-50 font-medium text-sm cursor-pointer transition-colors"
            >
              <X size={15} />
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Table */}
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
                    <button
                      onClick={() => handleEdit(cat)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium cursor-pointer transition-colors"
                    >
                      <Pencil size={14} />
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium cursor-pointer transition-colors"
                    >
                      <Trash2 size={14} />
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <FolderX size={32} strokeWidth={1.5} />
                    <span className="text-sm">Chưa có danh mục nào</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCategories;