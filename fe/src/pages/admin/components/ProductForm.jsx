import ImageUploader from "./ImageUploader";

const cls =
  "w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const ProductForm = ({ form, setForm, editId, categories, onSubmit, onCancel }) => (
  <form onSubmit={onSubmit}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-600 mb-1">Tên sản phẩm *</label>
        <input
          placeholder="Nhập tên sản phẩm"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={cls}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Giá (VNĐ) *</label>
        <input
          placeholder="0"
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className={cls}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Tồn kho *</label>
        <input
          placeholder="0"
          type="number"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          className={cls}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Danh mục</label>
        <select
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          className={cls}
        >
          <option value="">-- Chọn danh mục --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Thương hiệu</label>
        <input
          placeholder="Nhập thương hiệu"
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
          className={cls}
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-600 mb-1">Mô tả sản phẩm</label>
        <div
          contentEditable
          suppressContentEditableWarning
          dangerouslySetInnerHTML={{ __html: form.description }}
          onBlur={(e) =>
            setForm({ ...form, description: e.currentTarget.innerHTML })
          }
          className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 prose max-w-none"
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-600 mb-1">Hình ảnh sản phẩm</label>
        <ImageUploader
          value={form.image_url}
          onChange={(url) => setForm({ ...form, image_url: url })}
        />
      </div>

    </div>

    <div className="flex gap-3 mt-5">
      <button
        type="submit"
        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 font-medium text-sm cursor-pointer"
      >
        {editId ? "Cập nhật" : "Thêm mới"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl hover:bg-gray-50 font-medium text-sm cursor-pointer"
      >
        Hủy
      </button>
    </div>
  </form>
);

export default ProductForm;