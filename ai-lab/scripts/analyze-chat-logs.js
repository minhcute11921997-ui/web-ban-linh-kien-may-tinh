const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUTS_DIR = path.join(ROOT, "outputs");
const LOG_PATH = path.join(OUTPUTS_DIR, "chat-logs.jsonl");
const REPORT_PATH = path.join(OUTPUTS_DIR, "chat-log-summary.json");
const REPORT_MD_PATH = path.join(OUTPUTS_DIR, "chat-log-summary.md");

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
};

const readLogs = () => {
  if (!fs.existsSync(LOG_PATH)) return [];
  return fs
    .readFileSync(LOG_PATH, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean);
};

const main = () => {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
  const logs = readLogs();
  const latencies = logs.map((item) => Number(item.latencyMs || 0)).filter((value) => value > 0);
  const bySource = {};
  const byRetrieval = {};
  const errors = [];
  const samples = [];

  for (const item of logs) {
    if (item.error) errors.push(item);
    const source = item.response?.source || "unknown";
    bySource[source] = (bySource[source] || 0) + 1;
    const retrieval = item.response?.debug?.retrievalSource || "unknown";
    byRetrieval[retrieval] = (byRetrieval[retrieval] || 0) + 1;
    if (samples.length < 20) {
      samples.push({
        ts: item.ts,
        message: item.request?.message,
        source,
        retrieval,
        latencyMs: item.latencyMs,
        productIds: item.response?.productIds || [],
      });
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    total: logs.length,
    errors: errors.length,
    latency: {
      min: latencies.length ? Math.min(...latencies) : 0,
      max: latencies.length ? Math.max(...latencies) : 0,
      p50: percentile(latencies, 50),
      p90: percentile(latencies, 90),
      p95: percentile(latencies, 95),
    },
    bySource,
    byRetrieval,
    samples,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(
    REPORT_MD_PATH,
    [
      "# Chat Log Summary",
      "",
      `Generated at: ${report.generated_at}`,
      `Total requests: ${report.total}`,
      `Errors: ${report.errors}`,
      `Latency p50/p90/p95: ${report.latency.p50}ms / ${report.latency.p90}ms / ${report.latency.p95}ms`,
      "",
      "## By Source",
      "",
      ...Object.entries(bySource).map(([key, value]) => `- ${key}: ${value}`),
      "",
      "## By Retrieval",
      "",
      ...Object.entries(byRetrieval).map(([key, value]) => `- ${key}: ${value}`),
      "",
      "## Samples",
      "",
      ...samples.map(
        (sample) =>
          `- ${sample.ts} | ${sample.source}/${sample.retrieval} | ${sample.latencyMs}ms | ${sample.message} | products: ${sample.productIds.join(",") || "none"}`
      ),
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        total: report.total,
        errors: report.errors,
        json: REPORT_PATH,
        markdown: REPORT_MD_PATH,
      },
      null,
      2
    )
  );
};

main();
