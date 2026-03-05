import axiosInstance from './config';

export const register = (data) => {
    return axiosInstance.post('/auth/register', data);
};

export const login = (data) => {
    return axiosInstance.post('/auth/login', data);

};
export const refreshToken = (refeshToken) => {
    return axiosInstance.post('/auth/refresh',{ refreshToken });
}