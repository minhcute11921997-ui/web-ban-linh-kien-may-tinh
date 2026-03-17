import axiosInstance from './config';

export const getAllUsers = () => {
  return axiosInstance.get('/users');
};

export const updateUser = (id, data) => {
  return axiosInstance.put(`/users/${id}`, data);
};

export const deleteUser = (id) => {
  return axiosInstance.delete(`/users/${id}`);
};
