import { create } from "zustand";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../api/cartApi";

const useCartStore = create((set, get) => ({
  items: [],
  loading: false,
  selectedItems: [],

  fetchCart: async () => {
    set({ loading: true });
    try {
      const res = await getCart();
      const items = res.data.data?.items || [];
      const currentSelected = get().selectedItems;
      const newItemIds = items.map((item) => item.id);
      const updatedSelected =
        currentSelected.length === 0
          ? newItemIds
          : currentSelected.filter((id) => newItemIds.includes(id));
      set({ items, selectedItems: updatedSelected });
    } catch {
      set({ items: [], selectedItems: [] });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (productId, quantity) => {
    try {
      const res = await addToCart({ productId, quantity });
      if (res.data.success) {
        await get().fetchCart();
      } else {
        throw new Error(res.data.message || "Thêm giỏ hàng thất bại");
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || "Lỗi không xác định";
      throw new Error(errorMsg);
    }
  },

  // ✅ Optimistic update — cập nhật UI ngay, KHÔNG fetch lại
  updateItem: async (id, quantity) => {
    if (quantity < 1) return;

    // 1. Lưu lại giá trị cũ để rollback nếu lỗi
    const prevItems = get().items;

    // 2. Cập nhật UI ngay lập tức (không cần chờ API)
    set({
      items: prevItems.map((item) =>
        item.id === id ? { ...item, quantity } : item
      ),
    });

    // 3. Gọi API ngầm phía sau
    try {
      await updateCartItem(id, { quantity });
    } catch {
      // 4. Nếu API lỗi → rollback về giá trị cũ
      set({ items: prevItems });
    }
  },

  // ✅ Optimistic update cho removeItem
  removeItem: async (id) => {
    const prevItems = get().items;
    const prevSelected = get().selectedItems;

    // Xóa khỏi UI ngay
    set({
      items: prevItems.filter((item) => item.id !== id),
      selectedItems: prevSelected.filter((sid) => sid !== id),
    });

    try {
      await removeFromCart(id);
    } catch {
      // Rollback nếu lỗi
      set({ items: prevItems, selectedItems: prevSelected });
    }
  },

  clearAll: async () => {
    await clearCart();
    set({ items: [], selectedItems: [] });
  },

  toggleSelectedItem: (itemId) => {
    const selectedItems = get().selectedItems;
    if (selectedItems.includes(itemId)) {
      set({ selectedItems: selectedItems.filter((id) => id !== itemId) });
    } else {
      set({ selectedItems: [...selectedItems, itemId] });
    }
  },

  toggleSelectAll: () => {
    const { items, selectedItems } = get();
    if (selectedItems.length === items.length) {
      set({ selectedItems: [] });
    } else {
      set({ selectedItems: items.map((item) => item.id) });
    }
  },
}));

export default useCartStore;
