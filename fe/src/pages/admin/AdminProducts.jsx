import { useEffect, useState } from 'react';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../../api/productApi';
import { toast } from 'react-toastify';

const emptyForm = { name: '', description: '', price: '', stock: '', image: '' };

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const res = await getAllProducts();
    setProducts(res.data.products || res.data);
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
      image: product.image || '',
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý sản phẩm</h1>
        <button
          onClick={() => { setShowForm(!showForm); setForm(emptyForm); setEditId(null); }}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
        >
          + Thêm sản phẩm
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border rounded-xl p-5 mb-6 grid grid-cols-2 gap-4">
          <h2 className="col-span-2 font-semibold text-lg">
            {editId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
          </h2>
          <input placeholder="Tên sản phẩm *" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="border px-3 py-2 rounded-lg col-span-2" required />
          <input placeholder="Giá (VNĐ) *" type="number" value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })}
            className="border px-3 py-2 rounded-lg" required />
          <input placeholder="Tồn kho *" type="number" value={form.stock}
            onChange={e => setForm({ ...form, stock: e.target.value })}
            className="border px-3 py-2 rounded-lg" required />
          <textarea placeholder="Mô tả sản phẩm" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="border px-3 py-2 rounded-lg col-span-2" rows={3} />
          <input placeholder="URL hình ảnh" value={form.image}
            onChange={e => setForm({ ...form, image: e.target.value })}
            className="border px-3 py-2 rounded-lg col-span-2" />
          <div className="col-span-2 flex gap-3">
            <button type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              {editId ? 'Cập nhật' : 'Thêm mới'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="border px-6 py-2 rounded-lg hover:bg-gray-100">
              Hủy
            </button>
          </div>
        </form>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-3 border">#</th>
            <th className="text-left p-3 border">Tên sản phẩm</th>
            <th className="text-left p-3 border">Giá</th>
            <th className="text-left p-3 border">Tồn kho</th>
            <th className="text-left p-3 border">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="p-3 border text-gray-400">{p.id}</td>
              <td className="p-3 border font-medium">{p.name}</td>
              <td className="p-3 border text-blue-600">{Number(p.price).toLocaleString('vi-VN')}₫</td>
              <td className="p-3 border">{p.stock}</td>
              <td className="p-3 border">
                <div className="flex gap-3">
                  <button onClick={() => handleEdit(p)}
                    className="text-blue-600 hover:underline">Sửa</button>
                  <button onClick={() => handleDelete(p.id)}
                    className="text-red-500 hover:underline">Xóa</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminProducts;
