const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..", "..");
const dotenv = require(path.join(rootDir, "be", "node_modules", "dotenv"));
dotenv.config({ path: path.join(rootDir, "be", ".env"), quiet: true });

const { routeMessage } = require("../tools/router");

const ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT, "data");
const OUTPUTS_DIR = path.join(ROOT, "outputs");
const TRAINING_PATH = path.join(DATA_DIR, "training-examples.json");
const CHAT_LOGS_PATH = path.join(OUTPUTS_DIR, "chat-logs.jsonl");
const OUT_PATH = path.join(DATA_DIR, "finetune-chat-dataset.jsonl");
const SUMMARY_PATH = path.join(OUTPUTS_DIR, "finetune-dataset-summary.json");

const SYSTEM_PROMPT = [
  "Bạn là trợ lý tư vấn linh kiện PC cho một website thương mại điện tử.",
  "Chỉ tư vấn dựa trên dữ liệu shop đã được cung cấp bởi hệ thống RAG.",
  "Không bịa sản phẩm, giá, tồn kho hoặc mã giảm giá.",
  "Nếu dữ liệu không có danh mục/sản phẩm phù hợp, hãy nói rõ là chưa có trong catalog.",
  "Trả lời tiếng Việt ngắn gọn, thân thiện, ưu tiên sản phẩm còn hàng.",
].join(" ");

const decodeBase64 = (value) => {
  if (!value) return "";
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch (_) {
    return "";
  }
};

const readLogs = () => {
  if (!fs.existsSync(CHAT_LOGS_PATH)) return [];
  return fs
    .readFileSync(CHAT_LOGS_PATH, "utf8")
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

const makeExample = ({ user, assistant, metadata }) => ({
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: user },
    { role: "assistant", content: assistant },
  ],
  metadata,
});

const main = async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

  const examples = [];
  const training = fs.existsSync(TRAINING_PATH)
    ? JSON.parse(fs.readFileSync(TRAINING_PATH, "utf8"))
    : [];

  for (const item of training) {
    const result = await routeMessage({
      message: item.question,
      limit: 8,
    });
    examples.push(
      makeExample({
        user: item.question,
        assistant: result.reply,
        metadata: {
          source: "training",
          id: item.id,
          type: item.type,
          answerSource: result.source,
          productIds: result.products.map((product) => product.id),
        },
      })
    );
  }

  const logs = readLogs();
  const seenUserTexts = new Set(examples.map((item) => item.messages[1].content));
  for (const log of logs) {
    if (log.error) continue;
    const user =
      decodeBase64(log.request?.messageBase64) ||
      decodeBase64(log.requestBase64?.message) ||
      log.request?.message ||
      "";
    const assistant = decodeBase64(log.response?.replyBase64) || log.response?.reply || "";
    if (!user || !assistant || seenUserTexts.has(user)) continue;
    seenUserTexts.add(user);
    examples.push(
      makeExample({
        user,
        assistant,
        metadata: {
          source: "chat_log",
          ts: log.ts,
          answerSource: log.response?.source,
          retrievalSource: log.response?.debug?.retrievalSource,
          productIds: log.response?.productIds || [],
        },
      })
    );
  }

  fs.writeFileSync(OUT_PATH, examples.map((item) => JSON.stringify(item)).join("\n") + "\n", "utf8");
  const summary = {
    generated_at: new Date().toISOString(),
    output: OUT_PATH,
    total: examples.length,
    fromTraining: examples.filter((item) => item.metadata.source === "training").length,
    fromLogs: examples.filter((item) => item.metadata.source === "chat_log").length,
    note:
      "This is fine-tune-ready conversation data, but catalog facts should still come from RAG/DB instead of model memory.",
  };
  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
