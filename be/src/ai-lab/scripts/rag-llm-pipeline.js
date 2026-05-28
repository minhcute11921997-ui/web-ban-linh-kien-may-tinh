"use strict";

const { routeMessage } = require("./tools/router");
const {
  GEMINI_MODEL,
  generateReply,
  isGeminiAvailable,
  parseIntent,
} = require("./gemini-core");

const buildRetrievalMessage = ({ message, intent }) => {
  if (!intent || typeof intent !== "object") return message;

  const hints = [];
  if (intent.rawIntent) hints.push(`intent: ${intent.rawIntent}`);
  if (intent.budget) hints.push(`budget: ${intent.budget} VND`);
  if (Array.isArray(intent.categories) && intent.categories.length) {
    hints.push(`categories: ${intent.categories.join(", ")}`);
  }
  if (Array.isArray(intent.brandPrefs) && intent.brandPrefs.length) {
    hints.push(`brands: ${intent.brandPrefs.join(", ")}`);
  }
  if (intent.useCase) hints.push(`use case: ${intent.useCase}`);

  return hints.length ? `${message}\n${hints.join("\n")}` : message;
};

const runChatPipeline = async ({ message, history = [], limit = 8 }) => {
  const started = Date.now();
  let intent = null;
  let intentLatencyMs = 0;
  let replyLatencyMs = 0;
  let llmError = null;

  if (isGeminiAvailable()) {
    const intentStarted = Date.now();
    intent = await parseIntent(message, history);
    intentLatencyMs = Date.now() - intentStarted;
  }

  const retrievalMessage = buildRetrievalMessage({ message, intent });

  const ragStarted = Date.now();
  const ragResult = await routeMessage({ message, history, limit, intent });
  const ragLatencyMs = Date.now() - ragStarted;

  let finalReply = ragResult.reply;
  let source = ragResult.source;
  let replyProvider = "rag_fallback";

  if (isGeminiAvailable() && ragResult.products.length > 0) {
    const replyStarted = Date.now();
    finalReply = await generateReply({
      intent,
      products: ragResult.products,
      ragReply: ragResult.reply,
      source: ragResult.source,
      message,
      history,
    });
    replyLatencyMs = Date.now() - replyStarted;
    if (finalReply !== ragResult.reply) {
      source = "gemini_rag";
      replyProvider = "gemini";
    }
  }

  if (isGeminiAvailable() && !intent && replyProvider !== "gemini") {
    llmError = "Gemini returned no structured intent; used RAG fallback.";
  }

  return {
    success: true,
    latencyMs: Date.now() - started,
    ...ragResult,
    question: message,
    reply: finalReply,
    source,
    debug: {
      ...ragResult.debug,
      tool: ragResult.tool,
      llm: {
        enabled: isGeminiAvailable(),
        provider: "gemini",
        model: isGeminiAvailable() ? GEMINI_MODEL : null,
        intent,
        retrievalMessage: retrievalMessage === message ? null : retrievalMessage,
        replyProvider,
        error: llmError,
      },
      intentLatencyMs,
      ragLatencyMs,
      replyLatencyMs,
    },
  };
};

const llmHealth = () => ({
  enabled: isGeminiAvailable(),
  provider: "gemini",
  model: GEMINI_MODEL,
});

module.exports = {
  llmHealth,
  runChatPipeline,
};
