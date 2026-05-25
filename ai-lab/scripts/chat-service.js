const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const rootDir = path.resolve(__dirname, "..", "..");
const dotenv = require(path.join(rootDir, "be", "node_modules", "dotenv"));
dotenv.config({ path: path.join(rootDir, "be", ".env"), quiet: true });

const { answerQuestion } = require("./rag-core");
const { loadKnowledgeBase, loadVectorIndex } = require("./embedding-core");

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
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });

const appendLog = (entry) => {
  fs.appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
};

const toBase64 = (value) => Buffer.from(String(value || ""), "utf8").toString("base64");

const healthPayload = () => ({
  ok: Boolean(state.knowledgeBase),
  service: "ai-lab-chat-service",
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

  const useGemini = body.useGemini !== false;
  const limit = Math.min(Math.max(Number(body.limit || 8), 1), 20);

  try {
    const result = await answerQuestion({ message, useGemini, limit });
    const latencyMs = Date.now() - started;
    const payload = {
      success: true,
      latencyMs,
      ...result,
    };

    appendLog({
      ts: new Date().toISOString(),
      route: "/chat",
      latencyMs,
      request: {
        message,
        messageBase64: toBase64(message),
        useGemini,
        limit,
      },
      response: {
        source: result.source,
        reply: result.reply,
        replyBase64: toBase64(result.reply),
        productIds: result.products.map((product) => product.id),
        debug: result.debug,
      },
    });

    return sendJson(res, 200, payload);
  } catch (error) {
    const latencyMs = Date.now() - started;
    appendLog({
      ts: new Date().toISOString(),
      route: "/chat",
      latencyMs,
      request: { message, useGemini, limit },
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

server.listen(PORT, HOST, () => {
  console.log(`AI lab chat service running at http://${HOST}:${PORT}`);
});
