const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT, "data");
const OUTPUTS_DIR = path.join(ROOT, "outputs");
const SERVICE_URL = process.env.AI_LAB_SERVICE_URL || "http://127.0.0.1:4001";

const requiredFiles = [
  "data/knowledge-base.json",
  "data/vector-index.json",
  "data/training-examples.json",
  "data/training-examples.jsonl",
  "data/tuning-config.json",
  "outputs/eval-report.json",
  "outputs/training-eval-report.json",
  "outputs/service-eval-report.json",
  "outputs/service-training-eval-report.json",
  "outputs/quality-report.html",
  "outputs/chat-log-summary.json",
  "API_CONTRACT.md",
  "PRE_INTEGRATION_CHECKLIST.md",
];

const fileExists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));

const checkReport = (relativePath) => {
  if (!fileExists(relativePath)) return { ok: false, reason: "missing" };
  const report = readJson(relativePath);
  return {
    ok: report.failed === 0,
    passed: report.passed,
    total: report.total,
    failed: report.failed,
    passRate: report.pass_rate,
  };
};

const checkService = async () => {
  const healthResponse = await fetch(`${SERVICE_URL}/health`);
  const health = await healthResponse.json();
  if (!healthResponse.ok || !health.ok) {
    return { ok: false, health };
  }

  const chatResponse = await fetch(`${SERVICE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Gợi ý CPU Intel dưới 5 triệu",
      limit: 5,
    }),
  });
  const chat = await chatResponse.json();
  return {
    ok: chatResponse.ok && chat.success && Array.isArray(chat.products) && chat.products.length > 0,
    health,
    chat: {
      status: chatResponse.status,
      success: chat.success,
      source: chat.source,
      products: chat.products?.length || 0,
      latencyMs: chat.latencyMs,
    },
  };
};

const main = async () => {
  const files = requiredFiles.map((relativePath) => ({
    path: relativePath,
    ok: fileExists(relativePath),
  }));

  const reports = {
    smoke: checkReport("outputs/eval-report.json"),
    training: checkReport("outputs/training-eval-report.json"),
    serviceSmoke: checkReport("outputs/service-eval-report.json"),
    serviceTraining: checkReport("outputs/service-training-eval-report.json"),
  };

  const kb = fileExists("data/knowledge-base.json") ? readJson("data/knowledge-base.json") : null;
  const vector = fileExists("data/vector-index.json") ? readJson("data/vector-index.json") : null;
  const logs = fileExists("outputs/chat-log-summary.json") ? readJson("outputs/chat-log-summary.json") : null;
  const service = await checkService().catch((error) => ({ ok: false, error: error.message }));

  const ok =
    files.every((item) => item.ok) &&
    Object.values(reports).every((item) => item.ok) &&
    service.ok &&
    kb?.products?.length > 0 &&
    vector?.items?.length > 0;

  const result = {
    ok,
    generated_at: new Date().toISOString(),
    serviceUrl: SERVICE_URL,
    files,
    reports,
    data: {
      products: kb?.products?.length || 0,
      categories: kb?.categories?.length || 0,
      vectorItems: vector?.items?.length || 0,
      vectorProvider: vector?.provider,
      vectorModel: vector?.model,
      logRequests: logs?.total || 0,
      logErrors: logs?.errors || 0,
    },
    service,
  };

  const outPath = path.join(OUTPUTS_DIR, "preintegration-check.json");
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify({ ok, report: outPath, data: result.data, reports, service: service.ok }, null, 2));
  if (!ok) process.exit(1);
};

main();
