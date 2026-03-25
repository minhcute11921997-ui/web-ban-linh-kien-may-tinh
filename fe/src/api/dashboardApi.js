import axiosInstance from './config';

export const getDashboardStats = () => {
  return axiosInstance.get('/dashboard/stats');
};

export const getRevenueReport = (range = 'day', limit = 30) => {
  return axiosInstance.get(`/dashboard/revenue?range=${range}&limit=${limit}`);
};