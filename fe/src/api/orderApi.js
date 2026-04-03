import axiosInstance from './config';

export const createOrder = (data) => {
  return axiosInstance.post('/orders', data);
};

export const getMyOrders = () => {
  return axiosInstance.get('/orders/my-orders');
};

export const getOrderById = (id) => {
  return axiosInstance.get(`/orders/${id}`);
};

export const getAllOrders = (params = {}) => {
  return axiosInstance.get('/orders/admin/all', { params });
};

export const updateOrderStatus = (id, status) => {
  return axiosInstance.put(`/orders/admin/${id}/status`, { status });
};

export const deleteOrder = (id) => {
  return axiosInstance.delete(`/orders/admin/${id}`);
};
