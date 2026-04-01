import { create } from 'zustand';
import axiosInstance from '../api/config';

const useAuthStore = create((set, get) => ({
  user:         null,
  token:        null,
  refreshToken: null,
  isLoading:    true,
  initialized:  false,

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    set({ user, token, refreshToken, initialized: true, isLoading: false });
  },

  setUser:      (user)  => set({ user }),
  setToken:     (token) => set({ token }),
  setIsLoading: (v)     => set({ isLoading: v }),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({ user: null, token: null, refreshToken: null, initialized: true, isLoading: false });
  },

  initAuth: async () => {
    if (get().initialized) {
      set({ isLoading: false });
      return;
    }

    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      set({ isLoading: false, initialized: true });
      return;
    }

    try {
      const res = await axiosInstance.get('/auth/profile');


      const currentToken        = localStorage.getItem('token');
      const currentRefreshToken = localStorage.getItem('refreshToken');

      set({
        user:         res.data.user || res.data,
        token:        currentToken,
        refreshToken: currentRefreshToken,
        initialized:  true,
      });
    } catch {
      // Interceptor đã xử lý redirect nếu refresh thất bại
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      set({ user: null, token: null, refreshToken: null, initialized: true });
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default useAuthStore;