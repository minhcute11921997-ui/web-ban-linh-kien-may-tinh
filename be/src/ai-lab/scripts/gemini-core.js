"use strict";

try {
  require("dotenv").config({ quiet: true });
} catch (_) {
  // Env can be provided by the process manager.
}

const GEMINI_ENABLED = process.env.GEMINI_ENABLED !== "0";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_PARSE_TIMEOUT_MS = Number(process.env.GEMINI_PARSE_TIMEOUT_MS || 5000);
const GEMINI_REPLY_TIMEOUT_MS = Number(process.env.GEMINI_REPLY_TIMEOUT_MS || 10000);

let client = null;

const getClient = () => {
  if (!GEMINI_ENABLED || !GEMINI_API_KEY) return null;
  if (client) return client;
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    client = new GoogleGenerativeAI(GEMINI_API_KEY);
    return client;
  } catch (error) {
    console.warn("[gemini-core] init failed:", error.message);
    return null;
  }
};

const callGemini = async ({ prompt, timeoutMs }) => {
  const activeClient = getClient();
  if (!activeClient) throw new Error("Gemini is not configured");

  const model = activeClient.getGenerativeModel({ model: GEMINI_MODEL });
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Gemini timeout")), timeoutMs);
  });
  const result = await Promise.race([model.generateContent(prompt), timeout]);
  return result.response.text().trim();
};

const parseJsonObject = (raw) => {
  const cleaned = String(raw || "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return JSON.parse(cleaned.slice(start, end + 1));
};

const parseIntent = async (message, history = []) => {
  if (!isGeminiAvailable()) return null;

  const historyText = history
    .slice(-4)
    .map((item) => `${item.role === "user" ? "Khach" : "Shop"}: ${item.text}`)
    .join("\n");

  const prompt = `Ban la bo phan tich intent cho chatbot tu van linh kien PC cua shop ecommerce Viet Nam.
Chi tra ve JSON hop le, khong markdown, khong giai thich.

Lich su gan nhat:
${historyText || "(khong co)"}

Cau hoi hien tai: "${message}"

Schema:
{
  "budget": <so nguyen VND hoac null>,
  "categories": <mang trong ["CPU","RAM","SSD","VGA","Mainboard"]>,
  "isGreeting": <boolean>,
  "isPolicyQuestion": <boolean>,
  "isBuildQuestion": <boolean>,
  "isSwap": <boolean>,
  "swapCategory": <"CPU"|"RAM"|"SSD"|"VGA"|"Mainboard"|null>,
  "brandPrefs": <mang string>,
  "forbiddenBrands": <mang string>,
  "useCase": <"gaming"|"office"|"render"|"ai_ml"|"programming"|null>,
  "excludedCategories": <mang trong ["CPU","RAM","SSD","VGA","Mainboard"] neu khach muon loai tru hoac khach bao da co san linh kien do>,
  "ownedComponents": <mang doi tuong kieu [ { "category": "CPU"|"RAM"|"SSD"|"VGA"|"Mainboard", "model": "ten model linh kien co san, vi du: i5 12400F, RTX 3060..." } ] cho nhung linh kien khach da co san>,
  "rawIntent": <tom tat ngan bang tieng Viet khong dau>
}`;

  try {
    const raw = await callGemini({ prompt, timeoutMs: GEMINI_PARSE_TIMEOUT_MS });
    return parseJsonObject(raw);
  } catch (error) {
    console.warn("[gemini-core] parseIntent failed:", error.message);
    return null;
  }
};

const generateReply = async ({ intent, products, ragReply, source, message }) => {
  if (!isGeminiAvailable()) return ragReply;
  if (source === "casual_guard" || source === "policy_guard" || source === "account_order_guard") {
    return ragReply;
  }
  if (!Array.isArray(products) || products.length === 0) {
    return ragReply;
  }

  const productSummary = products
    .slice(0, 8)
    .map((product, index) => {
      const price = Number(product.sale_price || product.price || 0).toLocaleString("vi-VN");
      const stock = Number(product.stock || 0) > 0 ? "con hang" : "het hang";
      return `${index + 1}. [${product.category_name}] ${product.name} - ${price}d - ${stock}`;
    })
    .join("\n");

  const prompt = `Ban la nhan vien tu van linh kien PC cua shop ecommerce Viet Nam.
Tra loi ngan gon bang tieng Viet tu nhien, toi da 4 cau.
Khong bia san pham ngoai danh sach. Khong hua chinh sach giao hang/bao hanh neu khong co du lieu.
Luu y dac biet: Neu trong "Cau tra loi RAG fallback" co ghi nhan linh kien bi loai tru hoac linh kien khach da co san (vi du: "da co CPU...", "loai tru VGA..."), ban phai tuyet doi tuan thu va giu nguyen thong tin nay, khong duoc tu y de xuat mua moi cac linh kien do.

Cau hoi khach: "${message}"
Intent JSON: ${JSON.stringify(intent || {})}
Cau tra loi RAG fallback: ${ragReply}

San pham tim duoc:
${productSummary}

Hay viet cau tra loi tu van de khach de chon san pham.`;

  try {
    const reply = await callGemini({ prompt, timeoutMs: GEMINI_REPLY_TIMEOUT_MS });
    return reply || ragReply;
  } catch (error) {
    console.warn("[gemini-core] generateReply failed:", error.message);
    return ragReply;
  }
};

const isGeminiAvailable = () => Boolean(GEMINI_ENABLED && GEMINI_API_KEY && getClient());

module.exports = {
  GEMINI_ENABLED,
  GEMINI_MODEL,
  generateReply,
  isGeminiAvailable,
  parseIntent,
};
