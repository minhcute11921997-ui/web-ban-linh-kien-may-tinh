"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const rootDir = path.resolve(__dirname, "..", "..");
const dotenv = require(path.join(rootDir, "be", "node_modules", "dotenv"));
dotenv.config({ path: path.join(rootDir, "be", ".env"), quiet: true });

const { loadKnowledgeBase, loadVectorIndex } = require("./embedding-core");
const { llmHealth, runChatPipeline } = require("./rag-llm-pipeline");

const PORT = Number(process.env.AI_LAB_PORT || 4001);
const HOST = process.env.AI_LAB_HOST || "127.0.0.1";
const OUTPUTS_DIR = path.resolve(__dirname, "..", "outputs");
const LOG_PATH = path.join(OUTPUTS_DIR, "chat-logs.jsonl");

fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

let state = {
  startedAt: new Date().toISOString(),
  reloadCount: 0,
  lastReloadAt: null,
  knowledgeBase: null,
  vectorIndex: null,
};

const safeLoad = () => {
  const result = {
    knowledgeBase: null,
    vectorIndex: null,
    errors: [],
  };

  try {
    result.knowledgeBase = loadKnowledgeBase();
  } catch (error) {
    result.errors.push(`knowledge_base: ${error.message}`);
  }

  try {
    result.vectorIndex = loadVectorIndex();
  } catch (error) {
    result.errors.push(`vector_index: ${error.message}`);
  }

  state = {
    ...state,
    knowledgeBase: result.knowledgeBase,
    vectorIndex: result.vectorIndex,
    reloadCount: state.reloadCount + 1,
    lastReloadAt: new Date().toISOString(),
  };

  return result;
};

safeLoad();

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
};

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (_) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });

const toBase64 = (value) => Buffer.from(String(value || ""), "utf8").toString("base64");

const appendLog = (entry) => {
  fs.appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
};

const normalizeProduct = (product) => ({
  id: product.id,
  name: product.name,
  brand: product.brand,
  category_name: product.category_name,
  price: product.price,
  sale_price: product.sale_price,
  discount_percent: product.discount_percent,
  stock: product.stock,
  image_url: product.image_url,
});

const normalizeHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => ["user", "assistant"].includes(item?.role) && item?.text)
    .slice(-6)
    .map((item) => ({
      role: item.role,
      text: String(item.text).slice(0, 1000),
      products: Array.isArray(item.products) ? item.products.slice(0, 8).map(normalizeProduct) : [],
    }));
};

const healthPayload = () => ({
  ok: Boolean(state.knowledgeBase && state.vectorIndex),
  service: "ai-lab-chat-service",
  architecture: "rag_with_gemini",
  llm: llmHealth(),
  startedAt: state.startedAt,
  lastReloadAt: state.lastReloadAt,
  reloadCount: state.reloadCount,
  knowledgeBase: state.knowledgeBase
    ? {
        generatedAt: state.knowledgeBase.generated_at,
        products: state.knowledgeBase.source?.product_count || state.knowledgeBase.products?.length || 0,
        categories: state.knowledgeBase.source?.category_count || state.knowledgeBase.categories?.length || 0,
        activeDiscounts: state.knowledgeBase.source?.active_discount_count || state.knowledgeBase.discounts?.length || 0,
      }
    : null,
  vectorIndex: state.vectorIndex
    ? {
        generatedAt: state.vectorIndex.generated_at,
        provider: state.vectorIndex.provider,
        model: state.vectorIndex.model,
        dimensions: state.vectorIndex.dimensions,
        count: state.vectorIndex.count,
      }
    : null,
  endpoints: {
    health: "GET /health",
    chat: "POST /chat",
    reload: "POST /reload",
  },
});

const handleChat = async (req, res) => {
  const started = Date.now();
  let body;

  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, { success: false, message: error.message });
  }

  const message = String(body.message || "").trim();
  if (!message) {
    return sendJson(res, 400, {
      success: false,
      message: "Missing message",
    });
  }

  const limit = Math.min(Math.max(Number(body.limit || 8), 1), 20);
  const history = normalizeHistory(body.history);

  try {
    const payload = await runChatPipeline({ message, history, limit });

    appendLog({
      ts: new Date().toISOString(),
      route: "/chat",
      latencyMs: payload.latencyMs,
      request: {
        message,
        messageBase64: toBase64(message),
        limit,
        historyCount: history.length,
      },
      response: {
        source: payload.source,
        reply: payload.reply,
        replyBase64: toBase64(payload.reply),
        productIds: payload.products.map((product) => product.id),
        debug: payload.debug,
      },
    });

    return sendJson(res, 200, payload);
  } catch (error) {
    const latencyMs = Date.now() - started;
    appendLog({
      ts: new Date().toISOString(),
      route: "/chat",
      latencyMs,
      request: { message, limit, historyCount: history.length },
      requestBase64: { message: toBase64(message) },
      error: error.message,
    });
    return sendJson(res, 500, {
      success: false,
      message: error.message,
      latencyMs,
    });
  }
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, healthPayload());
  }

  if (req.method === "POST" && url.pathname === "/reload") {
    const result = safeLoad();
    return sendJson(res, result.errors.length ? 207 : 200, {
      success: result.errors.length === 0,
      errors: result.errors,
      health: healthPayload(),
    });
  }

  if (req.method === "POST" && url.pathname === "/chat") {
    return handleChat(req, res);
  }

  return sendJson(res, 404, {
    success: false,
    message: "Not found",
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`AI lab chat service cannot start because http://${HOST}:${PORT} is already in use.`);
    console.error("Stop the existing service or start this one with another port, for example:");
    console.error("$env:AI_LAB_PORT='4003'; npm start");
    process.exit(1);
  }

  console.error("AI lab chat service failed to start:", error.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const llm = llmHealth();
  console.log(`AI lab chat service running at http://${HOST}:${PORT}`);
  console.log(`Architecture: RAG + ${llm.provider}`);
  console.log(`LLM: ${llm.enabled ? llm.model : "disabled or missing API key; using RAG fallback"}`);
});
