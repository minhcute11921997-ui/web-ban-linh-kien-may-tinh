import axiosInstance from "./config";

export const getBanners = () => axiosInstance.get("/banners");

export const createBanner = (formData) =>
  axiosInstance.post("/banners", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateBanner = (position, formData) =>
  axiosInstance.post(`/banners/${position}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
