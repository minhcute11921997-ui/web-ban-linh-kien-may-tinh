import axiosInstance from './config';

const reviewApi = {
    getByProduct: (productId, page = 1, limit = 10) =>
        axiosInstance.get(`/reviews/product/${productId}?page=${page}&limit=${limit}`),

    checkUserReview: (productId) =>
        axiosInstance.get(`/reviews/check/${productId}`),

    create: (data) =>
        axiosInstance.post('/reviews', data),

    update: (id, data) =>
        axiosInstance.put(`/reviews/${id}`, data),

    delete: (id) =>
        axiosInstance.delete(`/reviews/${id}`),
};

export default reviewApi;