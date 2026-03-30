import axios from 'axios';

const axiosInstance = axios.create({
   baseURL: '/api',
});

axiosInstance.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// axiosInstance.interceptors.response.use(
//     response => response,
//     (error) => {
//         if (error.response?.status === 401) {
//             localStorage.removeItem('token');
//             localStorage.removeItem('refreshToken');
//             window.location.href = '/login';
//         }
//         return Promise.reject(error);
//     }
// );
axiosInstance.interceptors.response.use(
  response => response,
  (error) => {
    console.error('API 401/ERROR:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);
export default axiosInstance;