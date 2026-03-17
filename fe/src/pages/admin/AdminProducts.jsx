import { useEffect, useState } from 'react';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../../api/productApi';
import { getAllCategories } from '../../api/categoryApi';
import { toast } from 'react-toastify';

const emptyForm = { name: '', description: '', price: '', stock: '', image_url: '', category_id: '', brand: '' };

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    const res = await getAllProducts();
    setProducts(res.data.products || res.data);
  };

  const fetchCategories = async () => {
    try {
      const res = await getAllCategories();
      setCategories(res.data.data || []);
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateProduct(editId, form);
        toast.success('Cập nhật thành công!');
      } else {
        await createProduct(form);
        toast.success('Thêm sản phẩm thành công!');
      }
      setForm(emptyForm);
      setEditId(null);
      setShowForm(false);
      fetchProducts();
    } catch {
      toast.error('Có lỗi xảy ra!');
    }
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      image_url: product.image_url || '',
      category_id: product.category_id || '',
      brand: product.brand || '',
    });
    setEditId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa?')) return;
    try {
      await deleteProduct(id);
      toast.success('Đã xóa sản phẩm!');
      fetchProducts();
    } catch {
      toast.error('Xóa thất bại!');
    }
  };

  const getCategoryName = (catId) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : '—';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý sản phẩm</h1>
        <button
          onClick={() => { setShowForm(!showForm); setForm(emptyForm); setEditId(null); }}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer shadow-sm">
          + Thêm sản phẩm
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-lg text-gray-800 mb-4">
            {editId ? '✏️ Chỉnh sửa sản phẩm' : '➕ Thêm sản phẩm mới'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Tên sản phẩm *</label>
              <input placeholder="Nhập tên sản phẩm" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Giá (VNĐ) *</label>
              <input placeholder="0" type="number" value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Tồn kho *</label>
              <input placeholder="0" type="number" value={form.stock}
                onChange={e => setForm({ ...form, stock: e.target.value })}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Danh mục</label>
              <select value={form.category_id}
                onChange={e => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">-- Chọn danh mục --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Thương hiệu</label>
              <input placeholder="Nhập thương hiệu" value={form.brand}
                onChange={e => setForm({ ...form, brand: e.target.value })}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Mô tả sản phẩm</label>
              <textarea placeholder="Nhập mô tả chi tiết" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">URL hình ảnh</label>
              <input placeholder="https://..." value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Tên sản phẩm</th>
                <th className="text-left px-6 py-3 font-medium">Danh mục</th>
                <th className="text-left px-6 py-3 font-medium">Thương hiệu</th>
                <th className="text-left px-6 py-3 font-medium">Giá</th>
                <th className="text-left px-6 py-3 font-medium">Tồn kho</th>
                <th className="text-left px-6 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-400">{p.id}</td>
                  <td className="px-6 py-3 font-medium text-gray-800 max-w-xs truncate">{p.name}</td>
                  <td className="px-6 py-3 text-gray-500">{getCategoryName(p.category_id)}</td>
                  <td className="px-6 py-3 text-gray-500">{p.brand || '—'}</td>
                  <td className="px-6 py-3 text-blue-600 font-semibold">{Number(p.price).toLocaleString('vi-VN')}₫</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      p.stock > 10 ? 'bg-green-100 text-green-700' :
                      p.stock > 0  ? 'bg-yellow-100 text-yellow-700' :
                                     'bg-red-100 text-red-700'
                    }`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(p)}
                        className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer">Sửa</button>
                      <button onClick={() => handleDelete(p.id)}
                        className="text-red-500 hover:text-red-700 font-medium cursor-pointer">Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Chưa có sản phẩm nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
