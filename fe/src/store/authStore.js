import { create } from 'zustand';
import { refresh } from '../../../be/src/controllers/authController';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  initialized: false,

  initAuth: () => {
    const user = JSON.parse(localStorage.getItem('user')) || null;
    const token = localStorage.getItem('token') || null;
    const refreshToken = localStorage.getItem('refreshToken') || null;
    set({ user, token, refreshToken, initialized: true });
    console.log('Auth initialized:', { user: user?.username, token: token ? 'present' : 'null' });
  },

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, token, refreshToken });
    console.log('Auth updated:', { user: user?.username, token: token ? 'present' : 'null' });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    set({ user: null, token: null, refreshToken: null });
  },

  setUser: (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    set({ user: userData });
  },

  isAdmin: () => get().user?.role === 'admin',
}));

export default useAuthStore;
