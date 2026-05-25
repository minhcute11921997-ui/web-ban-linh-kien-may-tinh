const { spawn } = require("child_process");
const path = require("path");

const SERVICE_URL = process.env.AI_LAB_SERVICE_URL || "http://127.0.0.1:4001";
const AI_LAB_ROOT = path.resolve(__dirname, "..");
const EXPORT_SCRIPT = path.join(AI_LAB_ROOT, "scripts", "export-knowledge-base.js");
const BUILD_INDEX_SCRIPT = path.join(AI_LAB_ROOT, "scripts", "build-vector-index.js");

const runNodeScript = (script, args = []) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${script} exited with code ${code}`));
    });
  });

const reloadService = async () => {
  try {
    const response = await fetch(`${SERVICE_URL}/reload`, { method: "POST" });
    const data = await response.json();
    if (!response.ok || data.success === false) {
      throw new Error(data.message || data.errors?.join("; ") || `HTTP ${response.status}`);
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

const main = async () => {
  const skipReload = process.argv.includes("--skip-reload");

  await runNodeScript(EXPORT_SCRIPT);
  await runNodeScript(BUILD_INDEX_SCRIPT);

  const reload = skipReload ? { ok: true, skipped: true } : await reloadService();

  console.log(
    JSON.stringify(
      {
        ok: true,
        knowledgeBase: "synced",
        vectorIndex: "local_embedding",
        reload,
      },
      null,
      2
    )
  );

  if (!reload.ok && !skipReload) {
    console.warn(`AI lab service reload failed: ${reload.error}`);
    console.warn("Start service with: node ai-lab/scripts/chat-service.js");
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
