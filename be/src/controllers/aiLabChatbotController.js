const AI_LAB_URL = process.env.AI_LAB_URL || "http://127.0.0.1:4001";
const AI_LAB_TIMEOUT_MS = Number(process.env.AI_LAB_TIMEOUT_MS || 15000);

const normalizeProduct = (product) => ({
  id: product.id,
  name: product.name,
  brand: product.brand,
  category_name: product.category_name,
  image_url: product.image_url,
  price: Number(product.price || product.sale_price || 0),
  sale_price: Number(product.sale_price || product.price || 0),
  discount_percent: Number(product.discount_percent || 0),
  stock: Number(product.stock || 0),
});

const normalizeHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => ["user", "assistant"].includes(item?.role) && item?.text)
    .slice(-6)
    .map((item) => ({
      role: item.role,
      text: String(item.text).slice(0, 1000),
      products: Array.isArray(item.products)
        ? item.products.slice(0, 8).map(normalizeProduct)
        : [],
    }));
};

exports.chat = async (req, res) => {
  const message = String(req.body.message || "").trim();
  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Vui long nhap noi dung can tu van",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_LAB_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_LAB_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: normalizeHistory(req.body.history),
        limit: Number(req.body.limit || 8),
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      return res.status(response.status >= 400 && response.status < 500 ? response.status : 502).json({
        success: false,
        message: data.message || "AI lab chat service khong phan hoi hop le",
      });
    }

    return res.json({
      success: true,
      reply: data.reply || "",
      products: Array.isArray(data.products) ? data.products.map(normalizeProduct) : [],
      suggestions: data.suggestions || [],
      source: data.source,
      latencyMs: data.latencyMs,
    });
  } catch (error) {
    const isTimeout = error.name === "AbortError";
    return res.status(502).json({
      success: false,
      message: isTimeout
        ? "AI lab chat service phan hoi qua lau"
        : "Khong ket noi duoc AI lab chat service",
    });
  } finally {
    clearTimeout(timeout);
  }
};
