const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUTS_DIR = path.join(ROOT, "outputs");
const REPORT_PATH = path.join(OUTPUTS_DIR, "quality-report.html");

const readJsonIfExists = (fileName) => {
  const filePath = path.join(OUTPUTS_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const reportCard = (title, report) => {
  if (!report) {
    return `
      <section class="panel">
        <h2>${escapeHtml(title)}</h2>
        <p class="muted">No report found.</p>
      </section>
    `;
  }

  const passRate = Math.round(Number(report.pass_rate || 0) * 100);
  return `
    <section class="panel">
      <div class="panel-head">
        <h2>${escapeHtml(title)}</h2>
        <span class="score ${passRate === 100 ? "ok" : passRate >= 80 ? "warn" : "bad"}">${report.passed}/${report.total} (${passRate}%)</span>
      </div>
      <p class="muted">Generated: ${escapeHtml(report.generated_at || "")}</p>
      <div class="cases">
        ${(report.results || [])
          .map(
            (item) => `
              <article class="case ${item.pass ? "pass" : "fail"}">
                <div class="case-top">
                  <strong>${item.pass ? "PASS" : "FAIL"} - ${escapeHtml(item.id || "")}</strong>
                  <span>${escapeHtml(item.source || "")}${item.latencyMs != null ? ` · ${item.latencyMs}ms` : ""}</span>
                </div>
                <p class="question">${escapeHtml(item.question || "")}</p>
                <p class="reply">${escapeHtml(item.reply || "")}</p>
                <div class="products">
                  ${(item.products || [])
                    .map(
                      (product) => `
                        <span title="${escapeHtml(product.name)}">
                          #${product.id} · ${escapeHtml(product.category_name || "")} · ${Number(product.sale_price || 0).toLocaleString("vi-VN")}đ
                        </span>
                      `
                    )
                    .join("") || `<span class="empty">No products</span>`}
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
};

const main = () => {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

  const reports = [
    ["Smoke Evaluation", readJsonIfExists("eval-report.json")],
    ["Training Evaluation", readJsonIfExists("training-eval-report.json")],
    ["Service Smoke Evaluation", readJsonIfExists("service-eval-report.json")],
    ["Service Training Evaluation", readJsonIfExists("service-training-eval-report.json")],
  ];

  const tuningReport = readJsonIfExists("tuning-report.json");

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI Lab Quality Report</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f6f8;
      --panel: #ffffff;
      --text: #17212b;
      --muted: #657282;
      --line: #d8dee6;
      --ok: #0f8a4b;
      --ok-bg: #e9f8ef;
      --warn: #9a6200;
      --warn-bg: #fff3d7;
      --bad: #b42318;
      --bad-bg: #fde8e6;
      --accent: #1455d9;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
    }
    header {
      padding: 28px 32px 18px;
      background: #17212b;
      color: white;
    }
    h1 { margin: 0 0 6px; font-size: 28px; letter-spacing: 0; }
    h2 { margin: 0; font-size: 18px; letter-spacing: 0; }
    main {
      max-width: 1180px;
      margin: 0 auto;
      padding: 24px;
      display: grid;
      gap: 18px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .metric, .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .metric { padding: 16px; }
    .metric strong { display: block; font-size: 24px; }
    .metric span, .muted { color: var(--muted); font-size: 13px; }
    .panel { padding: 16px; }
    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 4px;
    }
    .score {
      border-radius: 999px;
      padding: 5px 10px;
      font-weight: 700;
      font-size: 13px;
      white-space: nowrap;
    }
    .score.ok { color: var(--ok); background: var(--ok-bg); }
    .score.warn { color: var(--warn); background: var(--warn-bg); }
    .score.bad { color: var(--bad); background: var(--bad-bg); }
    .cases { display: grid; gap: 10px; margin-top: 14px; }
    .case {
      border: 1px solid var(--line);
      border-left-width: 4px;
      border-radius: 6px;
      padding: 12px;
      background: #fff;
    }
    .case.pass { border-left-color: var(--ok); }
    .case.fail { border-left-color: var(--bad); background: #fffafa; }
    .case-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: var(--muted);
      font-size: 13px;
    }
    .case-top strong { color: var(--text); }
    .question { font-weight: 700; margin: 10px 0 6px; }
    .reply {
      margin: 0 0 10px;
      white-space: pre-wrap;
      color: #2f3b48;
    }
    .products {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .products span {
      border: 1px solid #d9e3f7;
      background: #f5f8ff;
      color: #17458f;
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 12px;
    }
    .products .empty {
      color: var(--muted);
      border-color: var(--line);
      background: #f8fafc;
    }
    pre {
      overflow: auto;
      background: #101820;
      color: #d6e2f0;
      padding: 14px;
      border-radius: 6px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <header>
    <h1>AI Lab Quality Report</h1>
    <div>Generated at ${escapeHtml(new Date().toISOString())}</div>
  </header>
  <main>
    <section class="summary">
      ${reports
        .map(([title, report]) => {
          const passRate = report ? Math.round(Number(report.pass_rate || 0) * 100) : 0;
          return `
            <div class="metric">
              <strong>${report ? `${report.passed}/${report.total}` : "N/A"}</strong>
              <span>${escapeHtml(title)} · ${passRate}%</span>
            </div>
          `;
        })
        .join("")}
    </section>
    <section class="panel">
      <div class="panel-head">
        <h2>Tuning Summary</h2>
        <span class="score ok">${tuningReport ? `${tuningReport.examples} examples` : "No tuning"}</span>
      </div>
      <pre>${escapeHtml(JSON.stringify(tuningReport || {}, null, 2))}</pre>
    </section>
    ${reports.map(([title, report]) => reportCard(title, report)).join("")}
  </main>
</body>
</html>`;

  fs.writeFileSync(REPORT_PATH, html, "utf8");
  console.log(
    JSON.stringify(
      {
        ok: true,
        report: REPORT_PATH,
      },
      null,
      2
    )
  );
};

main();
