import axiosInstance from './config';

export const addressApi = {
  getAll:     ()         => axiosInstance.get('/addresses'),
  create:     (data)     => axiosInstance.post('/addresses', data),
  update:     (id, data) => axiosInstance.put(`/addresses/${id}`, data),
  remove:     (id)       => axiosInstance.delete(`/addresses/${id}`),
  setDefault: (id)       => axiosInstance.patch(`/addresses/${id}/default`),
};