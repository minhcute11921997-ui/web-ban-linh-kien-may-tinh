import { create } from 'zustand';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../api/cartApi';

const useCartStore = create((set, get) => ({
  items: [],
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const res = await getCart();
      set({ items: res.data.items || res.data || [] });
    } catch {
      set({ items: [] });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (productId, quantity) => {
    await addToCart({ productId, quantity });
    get().fetchCart();
  },

  updateItem: async (id, quantity) => {
    if (quantity < 1) return;
    await updateCartItem(id, { quantity });
    get().fetchCart();
  },

  removeItem: async (id) => {
    await removeFromCart(id);
    get().fetchCart();
  },

  clearAll: async () => {
    await clearCart();
    set({ items: [] });
  },
}));

export default useCartStore;
