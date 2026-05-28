"use strict";

const { normalize } = require("./nlp");
const { getTuningConfig } = require("./catalog");

// ---------------------------------------------------------------------------
// Spec helpers
// ---------------------------------------------------------------------------
const specText = (product) =>
  normalize(
    (product?.specifications || [])
      .map((spec) => `${spec.spec_name || ""} ${spec.spec_value || ""}`)
      .join(" ")
  );

const getSpecValue = (product, names) => {
  const normalizedNames = names.map(normalize);
  const spec = (product?.specifications || []).find((item) =>
    normalizedNames.some((name) => normalize(item.spec_name || "").includes(name))
  );
  return spec ? normalize(spec.spec_value || "") : "";
};

// ---------------------------------------------------------------------------
// Hard token helpers
// ---------------------------------------------------------------------------
const getHardTokens = (tokens) => {
  const softTokens = new Set(getTuningConfig().soft_tokens);
  return tokens.filter(
    (token) =>
      !softTokens.has(token) &&
      (!/^\d+$/.test(token) || /^\d{3,4}$/.test(token)) &&
      !/^\d+(tr|trieu|m|cu|chai|k|nghin|ngan)$/.test(token) &&
      !/^(cu|chai|ok)$/.test(token) &&
      !/^(choi|game|gaming|aaa|2k|4k|qhd|full|hd|fps)$/.test(token) &&
      !/^\d+mhz$/.test(token) &&
      !Object.keys(getTuningConfig().category_aliases).includes(token)
  );
};

const isStrictSpecToken = (token) =>
  /^(nvme|sata|ddr4|ddr5|lga\d+|am5|ti)$/.test(token) ||
  /^\d+(gb|tb)$/.test(token) ||
  /^\d{3,4}$/.test(token) ||
  /^[a-z]\d{3,4}$/.test(token);

// ---------------------------------------------------------------------------
// Product token matching
// ---------------------------------------------------------------------------
const productMatchesHardTokens = ({ product, hardTokens }) => {
  const text = normalize(product.search_text || product.document_text || product.text || product.name);
  const conciseText = normalize(`${product.name || ""} ${product.brand || ""} ${product.category_name || ""} ${specText(product)}`);
  const compactText = text.replace(/[^a-z0-9]+/g, "");
  const compactConciseText = conciseText.replace(/[^a-z0-9]+/g, "");
  const capacityTokens = hardTokens.filter((token) => /^\d+(gb|tb)$/.test(token));
  const otherTokens = hardTokens.filter((token) => !/^\d+(gb|tb)$/.test(token));
  const tokenMatches = (token) => {
    const compactToken = token.replace(/[^a-z0-9]+/g, "");
    const socketNumber = compactToken.match(/^lga(\d+)$/)?.[1];
    if (/^(intel|amd|ryzen|i3|i5|i7|i9|rtx|gtx)$/.test(token)) {
      const category = normalize(product.category_name || "");
      if (category === "mainboard" && token === "intel") return ["1700", "1851"].includes(getMainboardSocketFromText(product));
      if (category === "mainboard" && (token === "amd" || token === "ryzen")) return getMainboardSocketFromText(product) === "am5";
      return new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`).test(conciseText);
    }
    return text.includes(token) || compactText.includes(compactToken) || (socketNumber && text.includes(socketNumber));
  };
  // Note: getMainboardSocketFromText is a local helper to avoid circular dep with compat.js
  return otherTokens.every(tokenMatches) && (!capacityTokens.length || capacityTokens.some(tokenMatches));
};

// Local helper used only in productMatchesHardTokens (avoids circular dep with compat.js)
const getMainboardSocketFromText = (product) => {
  const value = getSpecValue(product, ["socket"]);
  if (/\bam5\b/.test(value)) return "am5";
  if (/\bam4\b/.test(value)) return "am4";
  return value.match(/\b(1700|1851|1200|1151)\b/)?.[1] || "";
};

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
const scoreDocument = ({ doc, tokens, budget, categories }) => {
  const searchable = normalize(doc.search_text || doc.text || "");
  const category = normalize(doc.category_name || "");
  const isGamingIntent = tokens.some((token) =>
    ["game", "gaming", "choi", "fps", "full", "hd", "2k", "4k", "aaa", "esport"].includes(token)
  );
  const price = Number(doc.sale_price || doc.price || 0);
  let score = 0;

  for (const token of tokens) {
    if (searchable.includes(token)) score += token.length >= 4 ? 3 : 1;
  }

  if (categories.includes(category)) score += 10;
  if (budget && price <= budget) score += 5;
  if (budget && price > budget) score -= Math.min(12, Math.ceil((price - budget) / Math.max(budget, 1) * 10));
  if (Number(doc.stock || 0) > 0) score += 2;
  if (Number(doc.total_sold || 0) > 0) score += Math.min(4, Number(doc.total_sold));
  if (Number(doc.discount_percent || 0) > 0) score += 1;
  if (isGamingIntent && category === "vga") {
    if (/(geforce|gaming|rtx 30|rtx 40|rtx 50|gtx)/.test(searchable) && !/(rtx pro|workstation)/.test(searchable)) {
      score += 12;
    }
    if (/(rtx pro|workstation|quadro|leadtek nvidia rtx pro)/.test(searchable)) score -= 18;
    if (price > 50000000) score -= 10;
  }

  return score;
};

const applyBusinessRerank = ({ products, tokens, budget, categories }) =>
  products
    .map((doc) => ({
      doc,
      score:
        (Number(doc.vector_score || 0) * 100) +
        scoreDocument({ doc, tokens, budget, categories }),
    }))
    .sort((a, b) => b.score - a.score || Number(b.doc.stock || 0) - Number(a.doc.stock || 0))
    .map((item) => item.doc);


// Mentioned product score (for combo check)

const mentionedProductScore = ({ product, tokens, text }) => {
  const searchable = normalize(`${product.name || ""} ${product.brand || ""} ${product.category_name || ""} ${specText(product)}`);
  const compact = searchable.replace(/[^a-z0-9]+/g, "");
  let score = 0;
  if (text.includes(normalize(product.name || ""))) score += 100;
  for (const token of tokens) {
    if (token.length < 3) continue;
    const compactToken = token.replace(/[^a-z0-9]+/g, "");
    if (normalize(product.category_name || "") === token) score += 8;
    if (searchable.includes(token) || compact.includes(compactToken)) score += token.length >= 4 ? 6 : 2;
  }
  if (Number(product.stock || 0) > 0) score += 1;
  return score;
};

module.exports = {
  specText,
  getSpecValue,
  getHardTokens,
  isStrictSpecToken,
  productMatchesHardTokens,
  scoreDocument,
  applyBusinessRerank,
  mentionedProductScore,
};
