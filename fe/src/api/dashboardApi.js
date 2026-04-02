import axiosInstance from './config';

export const getDashboardStats = () => {
  return axiosInstance.get('/dashboard/stats');
};

export const getRevenueReport = (range = 'day', limit = 30, params = {}) => {
  return axiosInstance.get('/dashboard/revenue', {
    params: { range, limit, ...params },
  });
};