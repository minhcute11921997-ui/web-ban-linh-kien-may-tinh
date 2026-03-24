import { useEffect, useState } from 'react';
import { getAllProducts, createProduct, updateProduct, deleteProduct, setFlashSaleApi } from '../../api/productApi';
import { getAllCategories } from '../../api/categoryApi';
import { toast } from 'react-toastify';

const emptyForm = { name: '', description: '', price: '', stock: '', image_url: '', category_id: '', brand: '' };

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [discountPercent, setDiscountPercent] = useState(10);
  const [durationHours, setDurationHours] = useState(24);
  const [submittingSale, setSubmittingSale] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await getAllProducts({ limit: 100 });
      const data = res.data?.data;
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi load sản phẩm:', err);
      setProducts([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getAllCategories();
      setCategories(res.data.data || []);
    } catch (err) {
      console.error('Lỗi load danh mục:', err);
      setCategories([]);
    }
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

  const handleStopSale = async (p) => {
    if (!window.confirm(`Tắt flash sale cho "${p.name}"?`)) return;
    try {
      await updateProduct(p.id, {
        name: p.name, description: p.description, price: p.price,
        stock: p.stock, image_url: p.image_url, category_id: p.category_id,
        brand: p.brand, discount_percent: 0, discount_expires_at: null,
      });
      toast.success('Đã tắt flash sale!');
      fetchProducts();
    } catch {
      toast.error('Lỗi khi tắt flash sale!');
    }
  };

  const getCategoryName = (catId) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? cat.name : '—';
  };

  const openSaleModal = () => {
    const init = {};
    (products || []).forEach(p => {
      init[p.id] = { checked: false, qty: 1, discount: 10 };
    });
    setSelectedItems(init);
    setDiscountPercent(10);
    setDurationHours(24);
    setShowSaleModal(true);
  };

  const toggleCheck = (id, checked) => {
    setSelectedItems(prev => ({ ...prev, [id]: { ...prev[id], checked } }));
  };

  const changeQty = (id, val, maxStock) => {
    const qty = Math.min(Math.max(1, Number(val)), maxStock);
    setSelectedItems(prev => ({ ...prev, [id]: { ...prev[id], qty } }));
  };

  const changeDiscount = (id, val) => {
    const discount = Math.min(99, Math.max(1, Number(val)));
    setSelectedItems(prev => ({ ...prev, [id]: { ...prev[id], discount } }));
  };

  const applyDiscountToAll = () => {
    if (!discountPercent || discountPercent < 1) return toast.warning('Nhập % giảm hợp lệ trước!');
    setSelectedItems(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = { ...next[id], discount: discountPercent };
      });
      return next;
    });
    toast.info(`Đã áp dụng ${discountPercent}% cho tất cả sản phẩm`);
  };

const handleFlashSaleSubmit = async () => {
  const items = Object.entries(selectedItems)
    .filter(([, v]) => v.checked)
    .map(([id, v]) => ({
      productId: Number(id),
      saleQty: v.qty,
      discountPercent: v.discount || discountPercent,
    }));

  if (!items.length) return toast.warning('Chưa chọn sản phẩm nào!');
  if (!durationHours || durationHours < 1) return toast.warning('Thời gian ít nhất 1 giờ!');

  // Cảnh báo đơn giản nếu đang có sale cũ
  const hasActiveSale = products.some(p => p.discount_percent > 0);
  if (hasActiveSale) {
    if (!window.confirm(' Đợt Flash Sale hiện tại sẽ bị tắt và thay bằng đợt mới.\nBạn có chắc không?')) return;
  }

  setSubmittingSale(true);
  try {
    await setFlashSaleApi({ items, durationHours });
    toast.success(`🎉 Flash Sale đã bắt đầu trong ${durationHours} giờ!`);
    setShowSaleModal(false);
    fetchProducts();
  } catch (err) {
    toast.error(err?.response?.data?.message || 'Lỗi khi thiết lập Flash Sale!');
  } finally {
    setSubmittingSale(false);
  }
};

  const selectedCount = Object.values(selectedItems).filter(i => i.checked).length;
  const expiresAt = new Date(Date.now() + (durationHours || 0) * 3600000).toLocaleString('vi-VN');

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý sản phẩm</h1>
        <div className="flex gap-3">
          <button onClick={openSaleModal}
            className="bg-orange-500 text-white px-5 py-2.5 rounded-xl hover:bg-orange-600 transition-colors font-medium text-sm cursor-pointer shadow-sm">
            🏷️ Flash Sale
          </button>
          <button onClick={() => { setShowForm(!showForm); setForm(emptyForm); setEditId(null); }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer shadow-sm">
            + Thêm sản phẩm
          </button>
        </div>
      </div>

      {/* Form thêm/sửa */}
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

      {/* Bảng sản phẩm */}
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
                <th className="text-left px-6 py-3 font-medium">Giảm giá</th>
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
                    {p.discount_percent > 0 && (!p.discount_expires_at || new Date(p.discount_expires_at) > new Date()) ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-600">
                          -{p.discount_percent}%
                        </span>
                        <button onClick={() => handleStopSale(p)}
                          className="text-xs text-red-400 hover:text-red-600 cursor-pointer whitespace-nowrap">
                          Tắt
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
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
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">Chưa có sản phẩm nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FLASH SALE */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">🏷️ Thiết lập Flash Sale</h2>
              <button onClick={() => setShowSaleModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer">×</button>
            </div>

            {/* Cài đặt chung */}
            <div className="px-6 py-4 border-b border-gray-100 bg-orange-50 flex flex-wrap gap-6 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Giảm giá chung (%)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number" min="1" max="99"
                    value={discountPercent === 0 ? '' : discountPercent}
                    onChange={e => {
                      const val = e.target.value;
                      setDiscountPercent(val === '' ? 0 : Math.min(99, Math.max(1, Number(val))));
                    }}
                    onBlur={() => { if (!discountPercent || discountPercent < 1) setDiscountPercent(1); }}
                    className="w-24 border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                  />
                  <button type="button" onClick={applyDiscountToAll}
                    className="text-xs bg-orange-100 text-orange-600 px-3 py-2 rounded-xl hover:bg-orange-200 cursor-pointer whitespace-nowrap transition-colors font-medium">
                    Áp dụng tất cả
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Thời gian (giờ)</label>
                <input
                  type="number" min="1" max="720"
                  value={durationHours === 0 ? '' : durationHours}
                  onChange={e => {
                    const val = e.target.value;
                    setDurationHours(val === '' ? 0 : Math.min(720, Math.max(1, Number(val))));
                  }}
                  onBlur={() => { if (!durationHours || durationHours < 1) setDurationHours(1); }}
                  className="w-28 border border-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                />
              </div>
              <div className="text-sm text-orange-600 font-medium pb-0.5">
                ⏰ Kết thúc lúc: <span className="font-bold">{expiresAt}</span>
              </div>
            </div>

            {/* Danh sách sản phẩm */}
            <div className="overflow-y-auto flex-1 px-6">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-gray-500 border-b border-gray-100">
                    <th className="py-3 text-left w-8">
                      <input type="checkbox"
                        className="w-4 h-4 accent-orange-500 cursor-pointer"
                        checked={products.length > 0 && products.every(p => selectedItems[p.id]?.checked)}
                        onChange={e => {
                          const next = {};
                          products.forEach(p => { next[p.id] = { ...selectedItems[p.id], checked: e.target.checked }; });
                          setSelectedItems(next);
                        }}
                      />
                    </th>
                    <th className="py-3 text-left">Sản phẩm</th>
                    <th className="py-3 text-right">Giá gốc</th>
                    <th className="py-3 text-right">Tồn kho</th>
                    <th className="py-3 text-right w-28">SL sale</th>
                    <th className="py-3 text-right w-24">% Giảm</th>
                    <th className="py-3 text-right">Giá sau giảm</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const item = selectedItems[p.id] || { checked: false, qty: 1, discount: 10 };
                    const salePrice = Math.round(Number(p.price) * (1 - (item.discount || 0) / 100));
                    return (
                      <tr key={p.id}
                        className={`border-b border-gray-50 last:border-0 transition-colors ${item.checked ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                        <td className="py-3">
                          <input type="checkbox" checked={item.checked}
                            onChange={e => toggleCheck(p.id, e.target.checked)}
                            className="w-4 h-4 accent-orange-500 cursor-pointer" />
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 truncate max-w-[180px]">{p.name}</span>
                            {p.discount_percent > 0 && (
                              <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-500 rounded-full whitespace-nowrap flex-shrink-0">
                                -{p.discount_percent}% đang sale
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{p.brand || '—'} · {getCategoryName(p.category_id)}</div>
                        </td>
                        <td className="py-3 text-right text-gray-500 whitespace-nowrap">
                          {Number(p.price).toLocaleString('vi-VN')}₫
                        </td>
                        <td className="py-3 text-right">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            p.stock > 10 ? 'bg-green-100 text-green-700' :
                            p.stock > 0  ? 'bg-yellow-100 text-yellow-700' :
                                           'bg-red-100 text-red-700'
                          }`}>
                            {p.stock}
                          </span>
                        </td>
                        {/* Số lượng sale */}
                        <td className="py-3 text-right">
                          <input
                            type="number" min="1" max={p.stock}
                            value={item.qty === 0 ? '' : item.qty}
                            disabled={!item.checked}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '') {
                                setSelectedItems(prev => ({ ...prev, [p.id]: { ...prev[p.id], qty: 0 } }));
                              } else {
                                changeQty(p.id, val, p.stock);
                              }
                            }}
                            onBlur={() => {
                              if (!item.qty || item.qty < 1)
                                setSelectedItems(prev => ({ ...prev, [p.id]: { ...prev[p.id], qty: 1 } }));
                            }}
                            className="w-20 border border-gray-200 px-2 py-1.5 rounded-lg text-sm text-center disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                        </td>
                        {/* % giảm riêng từng sản phẩm */}
                        <td className="py-3 text-right">
                          <input
                            type="number" min="1" max="99"
                            value={item.discount === 0 ? '' : item.discount}
                            disabled={!item.checked}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '') {
                                setSelectedItems(prev => ({ ...prev, [p.id]: { ...prev[p.id], discount: 0 } }));
                              } else {
                                changeDiscount(p.id, val);
                              }
                            }}
                            onBlur={() => {
                              if (!item.discount || item.discount < 1)
                                setSelectedItems(prev => ({ ...prev, [p.id]: { ...prev[p.id], discount: 1 } }));
                            }}
                            className="w-20 border border-gray-200 px-2 py-1.5 rounded-lg text-sm text-center disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                        </td>
                        {/* Giá sau giảm */}
                        <td className="py-3 text-right font-semibold whitespace-nowrap">
                          {item.checked
                            ? <span className="text-orange-500">{salePrice.toLocaleString('vi-VN')}₫</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-2xl">
              <div className="text-sm text-gray-500">
                Đã chọn: <strong className="text-orange-500 text-base">{selectedCount}</strong> / {products.length} sản phẩm
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowSaleModal(false)}
                  className="border border-gray-200 text-gray-600 px-5 py-2 rounded-xl text-sm hover:bg-white cursor-pointer transition-colors">
                  Hủy
                </button>
                <button
                  disabled={submittingSale || selectedCount === 0}
                  onClick={handleFlashSaleSubmit}
                  className="bg-orange-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">
                  {submittingSale ? ' Đang xử lý...' : ` Bắt đầu Flash Sale (${selectedCount})`}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;