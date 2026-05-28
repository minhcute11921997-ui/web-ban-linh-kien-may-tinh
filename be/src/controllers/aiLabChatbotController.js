const AI_LAB_TIMEOUT_MS = Number(process.env.AI_LAB_TIMEOUT_MS || 15000);
const { runChatPipeline } = require("../ai-lab/scripts/rag-llm-pipeline");

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

const withTimeout = (promise, timeoutMs) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("AI_LAB_TIMEOUT")), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

exports.chat = async (req, res) => {
  const message = String(req.body.message || "").trim();
  if (!message) {
    return res.status(400).json({
      success: false,
      message: "Vui long nhap noi dung can tu van",
    });
  }

  try {
    const data = await withTimeout(
      runChatPipeline({
        message,
        history: normalizeHistory(req.body.history),
        limit: Number(req.body.limit || 8),
      }),
      AI_LAB_TIMEOUT_MS
    );

    return res.json({
      success: true,
      reply: data.reply || "",
      products: Array.isArray(data.products) ? data.products.map(normalizeProduct) : [],
      suggestions: data.suggestions || [],
      source: data.source,
      latencyMs: data.latencyMs,
    });
  } catch (error) {
    const isTimeout = error.message === "AI_LAB_TIMEOUT";
    return res.status(502).json({
      success: false,
      message: isTimeout
        ? "AI lab chatbot phan hoi qua lau"
        : "Khong chay duoc AI lab chatbot noi bo",
    });
  }
};
