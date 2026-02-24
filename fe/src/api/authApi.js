import axiosInstance from './comfig';

export const register = (data) => {
    return axiosInstance.post('/auth/register', data);
};

export const login = (data) => {
    return axiosInstance.post('/auth/login', data);

};
export const refeshToken = (refeshToken) => {
    return axiosInstance.post('/auth/refresh',{ refreshToken });
}