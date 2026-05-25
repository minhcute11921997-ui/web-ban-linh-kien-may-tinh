const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const OUTPUTS_DIR = path.join(ROOT, "outputs");
const TRAINING_PATH = path.join(DATA_DIR, "training-examples.json");
const REPORT_PATH = path.join(OUTPUTS_DIR, "load-test-report.json");
const SERVICE_URL = process.env.AI_LAB_SERVICE_URL || "http://127.0.0.1:4001";

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
};

const callChat = async (message) => {
  const started = Date.now();
  const response = await fetch(`${SERVICE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, limit: 8 }),
  });
  const data = await response.json();
  return {
    ok: response.ok && data.success,
    status: response.status,
    latencyMs: Date.now() - started,
    source: data.source,
    products: data.products?.length || 0,
    message,
    error: data.message,
  };
};

const runPool = async (items, concurrency) => {
  const results = [];
  let index = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      results.push(await callChat(current.question));
    }
  });
  await Promise.all(workers);
  return results;
};

const main = async () => {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
  const examples = JSON.parse(fs.readFileSync(TRAINING_PATH, "utf8"));
  const rounds = Number(process.env.AI_LAB_LOAD_ROUNDS || 3);
  const concurrency = Number(process.env.AI_LAB_LOAD_CONCURRENCY || 4);
  const items = [];
  for (let round = 0; round < rounds; round += 1) {
    items.push(...examples);
  }

  const started = Date.now();
  const results = await runPool(items, concurrency);
  const durationMs = Date.now() - started;
  const latencies = results.map((item) => item.latencyMs);
  const failed = results.filter((item) => !item.ok);
  const report = {
    generated_at: new Date().toISOString(),
    serviceUrl: SERVICE_URL,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    durationMs,
    concurrency,
    rounds,
    latency: {
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      p50: percentile(latencies, 50),
      p90: percentile(latencies, 90),
      p95: percentile(latencies, 95),
    },
    failedSamples: failed.slice(0, 10),
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ ok: failed.length === 0, report: REPORT_PATH, ...report }, null, 2));
  if (failed.length) process.exit(1);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
