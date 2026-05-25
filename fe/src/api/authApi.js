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

export const verifyEmail = (data) => {
    return axiosInstance.post('/auth/verify-email', data);
};

export const resendVerification = (email) => {
    return axiosInstance.post('/auth/resend-verification', { email });
};

export const refreshToken = (refreshToken) => {
    return axiosInstance.post('/auth/refresh', { refreshToken });
};
