import api from './config';

//Public
export const validateDiscount = (code, totalPrice) =>
  api.get('/discounts/validate', { params: { code, totalPrice } });

export const getAvailableDiscounts = () =>
  api.get('/discounts/available');

//Admin
export const adminGetAllDiscounts = () =>
  api.get('/discounts/admin/all');

export const adminCreateDiscount = (data) =>
  api.post('/discounts/admin', data);

export const adminUpdateDiscount = (id, data) =>
  api.put(`/discounts/admin/${id}`, data);

export const adminDeleteDiscount = (id) =>
  api.delete(`/discounts/admin/${id}`);