import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getAllCategories } from "../../../api/categoryApi";
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  setFlashSaleApi,
  toggleProductActive,
} from "../../../api/productApi";

export const emptyForm = {
  name: "",
  description: "",
  price: "",
  stock: "",
  image_url: "",
  category_id: "",
  brand: "",
};

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await getAllProducts({ limit: 100, adminView: true });
      const data = res.data?.data;
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getAllCategories();
      setCategories(res.data.data || []);
    } catch {
      setCategories([]);
    }
  };

  const handleSubmit = async (e, form, editId, onSuccess) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateProduct(editId, form);
        toast.success("Cập nhật thành công!");
      } else {
        await createProduct(form);
        toast.success("Thêm sản phẩm thành công!");
      }
      fetchProducts();
      onSuccess?.();
    } catch {
      toast.error("Có lỗi xảy ra!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa?")) return;
    try {
      await deleteProduct(id);
      toast.success("Đã xóa sản phẩm!");
      fetchProducts();
    } catch {
      toast.error("Xóa thất bại!");
    }
  };

  const handleStopSale = async (p) => {
    if (!window.confirm(`Tắt flash sale cho "${p.name}"?`)) return;
    try {
      await updateProduct(p.id, {
        ...p,
        discount_percent: 0,
        discount_expires_at: null,
      });
      toast.success("Đã tắt flash sale!");
      fetchProducts();
    } catch {
      toast.error("Lỗi khi tắt flash sale!");
    }
  };

  const handleToggleActive = async (p) => {
    const action = p.is_active ? "tắt" : "bật";
    if (!window.confirm(`Bạn muốn ${action} sản phẩm "${p.name}"?`)) return;
    try {
      await toggleProductActive(p.id);
      toast.success(p.is_active ? "Đã tắt sản phẩm!" : "Đã bật sản phẩm!");
      fetchProducts();
    } catch {
      toast.error("Lỗi khi thay đổi trạng thái!");
    }
  };

  const handleFlashSaleSubmit = async (
    selectedItems,
    durationHours,
    setSubmitting,
    onSuccess
  ) => {
    const items = Object.entries(selectedItems)
      .filter(([, v]) => v.checked)
      .map(([id, v]) => ({
        productId: Number(id),
        saleQty: v.qty,
        discountPercent: v.discount,
      }));
    if (!items.length) return toast.warning("Chưa chọn sản phẩm nào!");
    if (!durationHours || durationHours < 1)
      return toast.warning("Thời gian ít nhất 1 giờ!");
    const hasActiveSale = products.some((p) => p.discount_percent > 0);
    if (
      hasActiveSale &&
      !window.confirm("Đợt Flash Sale hiện tại sẽ bị tắt. Bạn có chắc không?")
    )
      return;
    setSubmitting(true);
    try {
      await setFlashSaleApi({ items, durationHours });
      toast.success(`🎉 Flash Sale đã bắt đầu trong ${durationHours} giờ!`);
      fetchProducts();
      onSuccess?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Lỗi khi thiết lập Flash Sale!"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryName = (catId) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : "—";
  };

  return {
    products,
    categories,
    getCategoryName,
    handleSubmit,
    handleDelete,
    handleStopSale,
    handleToggleActive,
    handleFlashSaleSubmit,
  };
};