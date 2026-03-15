import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const discountApi = {
  validateDiscount: (code, totalPrice) => {
    return axios.get(`${API_BASE_URL}/discounts/validate`, {
      params: {
        code,
        totalPrice
      }
    });
  },

  getAvailableDiscounts: () => {
    return axios.get(`${API_BASE_URL}/discounts/available`);
  }
};
