import { create } from "zustand";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../api/cartApi";

const SELECTED_CART_ITEMS_KEY = "selectedCartItems";

const loadSelectedItems = () => {
  try {
    const raw = localStorage.getItem(SELECTED_CART_ITEMS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const saveSelectedItems = (selectedItems) => {
  localStorage.setItem(SELECTED_CART_ITEMS_KEY, JSON.stringify(selectedItems));
};

const initialSelectedItems = loadSelectedItems();

const useCartStore = create((set, get) => ({
  items: [],
  loading: false,
  selectedItems: initialSelectedItems || [],
  hasSavedSelection: Array.isArray(initialSelectedItems),

  fetchCart: async () => {
    set({ loading: true });
    try {
      const res = await getCart();
      const items = res.data.data?.items || [];
      const currentSelected = get().selectedItems;
      const hasSavedSelection = get().hasSavedSelection;
      const newItemIds = items.map((item) => item.id);
      const updatedSelected =
        !hasSavedSelection && currentSelected.length === 0
          ? newItemIds
          : currentSelected.filter((id) => newItemIds.includes(id));
      saveSelectedItems(updatedSelected);
      set({ items, selectedItems: updatedSelected, hasSavedSelection: true });
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
    const nextSelected = prevSelected.filter((sid) => sid !== id);
    set({
      items: prevItems.filter((item) => item.id !== id),
      selectedItems: nextSelected,
      hasSavedSelection: true,
    });
    saveSelectedItems(nextSelected);

    try {
      await removeFromCart(id);
    } catch {
      // Rollback nếu lỗi
      set({ items: prevItems, selectedItems: prevSelected, hasSavedSelection: true });
      saveSelectedItems(prevSelected);
    }
  },

  clearAll: async () => {
    await clearCart();
    saveSelectedItems([]);
    set({ items: [], selectedItems: [], hasSavedSelection: true });
  },

  toggleSelectedItem: (itemId) => {
    const selectedItems = get().selectedItems;
    if (selectedItems.includes(itemId)) {
      const nextSelected = selectedItems.filter((id) => id !== itemId);
      saveSelectedItems(nextSelected);
      set({ selectedItems: nextSelected, hasSavedSelection: true });
    } else {
      const nextSelected = [...selectedItems, itemId];
      saveSelectedItems(nextSelected);
      set({ selectedItems: nextSelected, hasSavedSelection: true });
    }
  },

  toggleSelectAll: () => {
    const { items, selectedItems } = get();
    if (selectedItems.length === items.length) {
      saveSelectedItems([]);
      set({ selectedItems: [], hasSavedSelection: true });
    } else {
      const nextSelected = items.map((item) => item.id);
      saveSelectedItems(nextSelected);
      set({ selectedItems: nextSelected, hasSavedSelection: true });
    }
  },
}));

export default useCartStore;
