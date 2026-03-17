import axiosInstance from './config';

export const getDashboardStats = () => {
  return axiosInstance.get('/dashboard/stats');
};
