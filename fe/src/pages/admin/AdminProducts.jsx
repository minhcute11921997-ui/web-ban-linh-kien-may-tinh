import { useState } from "react";
import { emptyForm, useProducts } from "./hooks/useProducts";
import ProductForm from "./components/ProductForm";
import ProductTable from "./components/ProductTable";
import FlashSaleModal from "./components/FlashSaleModal";
import {
  Package,
  Zap,
  Plus,
  Pencil,
  X,
} from "lucide-react";

const AdminProducts = () => {
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);

  const {
    products,
    categories,
    getCategoryName,
    handleSubmit,
    handleDelete,
    handleStopSale,
    handleToggleActive,
    handleFlashSaleSubmit,
  } = useProducts();

  const openEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description || "",
      price: product.price,
      stock: product.stock,
      image_url: product.image_url || "",
      category_id: product.category_id ? product.category_id.toString() : categories[0]?.id?.toString() || "",
      brand: product.brand || "",
    });
    setEditId(product.id);
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setEditId(null);
    setForm(emptyForm);
  };

  return (
    <div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <Package size={24} className="text-blue-600" />
          Quản lý sản phẩm
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSaleModal(true)}
            className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl hover:bg-orange-600 transition-colors font-medium text-sm cursor-pointer shadow-sm"
          >
            <Zap size={16} className="fill-white" />
            Flash Sale
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setForm(emptyForm); setEditId(null); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer shadow-sm"
          >
            <Plus size={16} />
            Thêm sản phẩm
          </button>
        </div>
      </div>

      {/* Form thêm mới inline */}
      {showForm && !editId && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-lg text-gray-800 mb-4">
            <Plus size={18} className="text-blue-500" />
            Thêm sản phẩm mới
          </h2>
          <ProductForm
            form={form}
            setForm={setForm}
            editId={editId}
            categories={categories}
            onSubmit={(e) =>
              handleSubmit(e, form, editId, () => {
                setShowForm(false);
                setForm(emptyForm);
              })
            }
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Bảng sản phẩm */}
      <ProductTable
        products={products}
        getCategoryName={getCategoryName}
        onEdit={openEdit}
        onDelete={handleDelete}
        onStopSale={handleStopSale}
        onToggleActive={handleToggleActive}
      />

      {/* Modal chỉnh sửa */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                <Pencil size={18} className="text-blue-500" />
                Chỉnh sửa sản phẩm
              </h2>
              <button
                onClick={closeEdit}
                aria-label="Đóng"
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <ProductForm
                form={form}
                setForm={setForm}
                editId={editId}
                categories={categories}
                onSubmit={(e) => handleSubmit(e, form, editId, closeEdit)}
                onCancel={closeEdit}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Flash Sale */}
      {showSaleModal && (
        <FlashSaleModal
          products={products}
          getCategoryName={getCategoryName}
          onClose={() => setShowSaleModal(false)}
          onSubmit={handleFlashSaleSubmit}
        />
      )}
    </div>
  );
};

export default AdminProducts;