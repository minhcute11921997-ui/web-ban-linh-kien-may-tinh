const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const KB_PATH = path.join(DATA_DIR, "knowledge-base.json");
const VECTOR_INDEX_PATH = path.join(DATA_DIR, "vector-index.json");

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";
const EMBEDDING_DIMENSIONS = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS || 768);
const LOCAL_EMBEDDING_MODEL = "local-hash-embedding-v1";
const LOCAL_EMBEDDING_DIMENSIONS = Number(process.env.LOCAL_EMBEDDING_DIMENSIONS || 512);
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const normalizeText = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const localTokens = (text) => {
  const baseTokens = normalizeText(text)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 2);
  const bigrams = [];
  for (let index = 0; index < baseTokens.length - 1; index += 1) {
    bigrams.push(`${baseTokens[index]}_${baseTokens[index + 1]}`);
  }
  return [...baseTokens, ...bigrams];
};

const hashToken = (token) => {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const normalizeVector = (values) => {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return values;
  return values.map((value) => value / norm);
};

const cosineSimilarity = (left, right) => {
  const length = Math.min(left.length, right.length);
  let score = 0;
  for (let index = 0; index < length; index += 1) {
    score += left[index] * right[index];
  }
  return score;
};

const loadKnowledgeBase = () => {
  if (!fs.existsSync(KB_PATH)) {
    throw new Error(`Missing ${KB_PATH}. Run: node ai-lab/scripts/export-knowledge-base.js`);
  }
  return JSON.parse(fs.readFileSync(KB_PATH, "utf8"));
};

const loadVectorIndex = () => {
  if (!fs.existsSync(VECTOR_INDEX_PATH)) {
    throw new Error(`Missing ${VECTOR_INDEX_PATH}. Run: node ai-lab/scripts/build-vector-index.js`);
  }
  return JSON.parse(fs.readFileSync(VECTOR_INDEX_PATH, "utf8"));
};

const buildDocumentText = (product) => {
  const specs = (product.specifications || [])
    .map((spec) => `${spec.spec_name}: ${spec.spec_value}`)
    .join("; ");

  return [
    "Task: Retrieve computer hardware products that answer Vietnamese ecommerce customer questions.",
    `Product name: ${product.name}`,
    `Category: ${product.category_name || ""}`,
    `Brand: ${product.brand || ""}`,
    `Current price VND: ${product.sale_price || product.price || 0}`,
    `Stock: ${product.stock || 0}`,
    `Sold count: ${product.total_sold || 0}`,
    `Description: ${product.description || ""}`,
    `Specifications: ${specs}`,
  ].join("\n");
};

const buildQueryText = (message) =>
  [
    "Task: Find computer hardware products in a Vietnamese ecommerce shop that best answer this customer query.",
    `Customer query: ${message}`,
  ].join("\n");

const embedLocalText = ({ text, dimensions = LOCAL_EMBEDDING_DIMENSIONS }) => {
  const vector = Array.from({ length: dimensions }, () => 0);
  for (const token of localTokens(text)) {
    const hash = hashToken(token);
    const index = hash % dimensions;
    const sign = hash & 1 ? 1 : -1;
    vector[index] += sign * (token.includes("_") ? 1.3 : 1);
  }
  return normalizeVector(vector);
};

const embedText = async ({ text }) => {
  if (process.env.LOCAL_EMBEDDING === "1") {
    return embedLocalText({ text });
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in be/.env");
  }

  const response = await fetch(
    `${GEMINI_ENDPOINT}/${encodeURIComponent(EMBEDDING_MODEL)}:embedContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        content: {
          parts: [{ text }],
        },
        output_dimensionality: EMBEDDING_DIMENSIONS,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const values = data.embedding?.values || data.embeddings?.[0]?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Embedding API returned no vector values");
  }

  return normalizeVector(values.map(Number));
};

const searchVectorIndex = async ({ message, limit = 12 }) => {
  const index = loadVectorIndex();
  const queryEmbedding =
    index.provider === "local"
      ? embedLocalText({ text: buildQueryText(message), dimensions: index.dimensions })
      : await embedText({ text: buildQueryText(message) });
  const scored = index.items
    .map((item) => ({
      ...item,
      vector_score: cosineSimilarity(queryEmbedding, item.embedding),
    }))
    .sort((a, b) => b.vector_score - a.vector_score)
    .slice(0, limit);

  return {
    model: index.model,
    dimensions: index.dimensions,
    queryEmbeddingDimensions: queryEmbedding.length,
    items: scored,
  };
};

module.exports = {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  LOCAL_EMBEDDING_DIMENSIONS,
  LOCAL_EMBEDDING_MODEL,
  VECTOR_INDEX_PATH,
  buildDocumentText,
  buildQueryText,
  cosineSimilarity,
  embedLocalText,
  embedText,
  loadKnowledgeBase,
  loadVectorIndex,
  normalizeVector,
  searchVectorIndex,
};
