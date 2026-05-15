import axiosInstance from './config';

export const register = (data) => {
    return axiosInstance.post('/auth/register', data);
};

export const login = (data) => {
    return axiosInstance.post('/auth/login', data);

};

export const googleLogin = (credential) => {
    return axiosInstance.post('/auth/google', { credential });
};

export const refreshToken = (refreshToken) => {
    return axiosInstance.post('/auth/refresh', { refreshToken });
};
