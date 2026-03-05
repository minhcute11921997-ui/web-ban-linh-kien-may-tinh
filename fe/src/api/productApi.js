import axiosInstance from './config';

export const getAllProducts = (params) => {
  return axiosInstance.get('/products', { params });
};

export const getProductById = (id) => {
  return axiosInstance.get(`/products/${id}`);
};

export const createProduct = (data) => {
  return axiosInstance.post('/products', data);
};

export const updateProduct = (id, data) => {
  return axiosInstance.put(`/products/${id}`, data);
};

export const deleteProduct = (id) => {
  return axiosInstance.delete(`/products/${id}`);
};
