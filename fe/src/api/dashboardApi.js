import axiosInstance from './config';

export const getDashboardStats = () => {
  return axiosInstance.get('/dashboard/stats');
};

export const getRevenueReport = (range = 'day') => {
  return axiosInstance.get(`/dashboard/revenue?range=${range}`);
};