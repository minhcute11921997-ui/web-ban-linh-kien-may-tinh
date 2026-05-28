"use strict";

/**
 * router.js — Pure-function message router (Phương án B)
 *
 * Routing order (priority từ cao xuống thấp):
 *  1. policy-guard   → casual, AIO cooler, safety, policy, account, unsupported catalog
 *  2. compatibility  → combo_check (user đưa linh kiện cụ thể để check)
 *  3. build-pc       → swap intent (đổi linh kiện trong combo cũ)
 *  4. compatibility  → general compatibility question
 *  5. build-pc       → build PC / combo suggestion
 *  6. catalog-search → ranking, sales advisory, sale, cheap browse, exact match, hybrid
 */

const {
  isBuildQuestion,
  isCompatibilityQuestion,
  isComboCheckQuestion,
  detectSwapIntent,
} = require("./shared/nlp");
const { runGuard } = require("./policy-guard");
const { checkCombo, checkCompatibility } = require("./compatibility-check");
const { buildPc } = require("./build-pc");
const { searchCatalog } = require("./catalog-search");

/**
 * routeMessage — selects and runs the appropriate tool.
 *
 * @param {{ message: string, history: Array, limit: number }} params
 * @returns {Promise<object>} — standard RAG result shape
 */
const routeMessage = async ({ message, history = [], limit = 8, intent = null }) => {
  // ── 1. Guard layer (early exits, no product retrieval) ──────────────────
  const guard = runGuard({ message });
  if (guard.handled) return guard.result;

  // ── 2. Combo check (user lists specific parts to validate) ──────────────
  const isCombo = intent ? (intent.categories.length >= 2 && !intent.isBuildQuestion) : isComboCheckQuestion(message);
  if (isCombo) {
    return checkCombo({ message, history, limit });
  }

  // ── 3. Swap intent (change a component inside a previous build) ──────────
  const swapIntent = detectSwapIntent(message, history);
  if (swapIntent) {
    return buildPc({ message, history, limit, swapIntent });
  }

  // ── 4. General compatibility question ────────────────────────────────────
  const isCompat = intent ? (intent.categories.length === 1 && !intent.isBuildQuestion) : isCompatibilityQuestion(message);
  if (isCompat) {
    return checkCompatibility({ message, history, limit });
  }

  // ── 5. Build PC / combo suggestion ───────────────────────────────────────
  const isBuild = intent ? intent.isBuildQuestion : isBuildQuestion(message);
  if (isBuild) {
    return buildPc({ message, history, limit, intent });
  }

  // ── 6. Catalog search (ranking, sale, advisory, hybrid retrieval…) ───────
  return searchCatalog({ message, history, limit });
};

module.exports = { routeMessage };
