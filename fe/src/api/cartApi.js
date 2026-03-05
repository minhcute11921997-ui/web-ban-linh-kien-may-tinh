import axiosInstance from './config';

export const getCart = () => {
  return axiosInstance.get('/cart');
};

export const addToCart = (data) => {
  return axiosInstance.post('/cart/add', data);
};

export const updateCartItem = (id, data) => {
  return axiosInstance.put(`/cart/item/${id}`, data);
};

export const removeFromCart = (id) => {
  return axiosInstance.delete(`/cart/item/${id}`);
};

export const clearCart = () => {
  return axiosInstance.delete('/cart/clear');
};
