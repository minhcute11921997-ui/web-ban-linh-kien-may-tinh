export const PRODUCT_IMAGE_PLACEHOLDER =
  "https://placehold.co/300x300?text=No+Image";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const resolveImageUrl = (
  imageUrl,
  fallback = PRODUCT_IMAGE_PLACEHOLDER
) => {
  if (!imageUrl) return fallback;

  if (/^(https?:)?\/\//i.test(imageUrl)) return imageUrl;
  if (/^(data|blob):/i.test(imageUrl)) return imageUrl;

  if (imageUrl.startsWith("/")) {
    return API_BASE ? `${API_BASE}${imageUrl}` : imageUrl;
  }

  return imageUrl;
};
