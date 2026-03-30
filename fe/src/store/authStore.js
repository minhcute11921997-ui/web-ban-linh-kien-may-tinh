import { create } from 'zustand';


const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  initialized: false,

  //  THÊM — LoginPage gọi setAuth sau login
  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    set({ user, token, refreshToken, initialized: true, isLoading: false });
  },

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setIsLoading: (isLoading) => set({ isLoading }),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({ user: null, token: null, refreshToken: null, initialized: true, isLoading: false });
  },

  initAuth: async () => {
    // Nếu đã initialized rồi (vừa login xong) → không gọi lại
    if (get().initialized) {
      set({ isLoading: false });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, initialized: true });
      return;
    }
    try {
      const res = await axiosInstance.get('/auth/profile');
      set({
        user: res.data.user || res.data,
        token,
        initialized: true,
      });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, initialized: true });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useAuthStore;