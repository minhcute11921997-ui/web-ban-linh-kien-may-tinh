"use strict";

const { searchVectorIndex } = require("../embedding-core");
const {
  loadKnowledgeBase,
  formatMoney,
  availabilityNote,
  getTuningConfig,
  getChatbotSkills,
} = require("./shared/catalog");
const {
  normalize,
  tokenize,
  parseBudget,
  detectCategory,
  isBuildQuestion,
  isSaleQuestion,
  isCheapBrowseQuestion,
  isRankingQuestion,
  isSalesAdvisoryQuestion,
  salesIntentKind,
  complementaryCategories,
  rankingLimit,
  shouldUseHistoryContext,
} = require("./shared/nlp");
const { compatibilitySummary } = require("./shared/compat");
const {
  getHardTokens,
  isStrictSpecToken,
  scoreDocument,
  applyBusinessRerank,
  productMatchesHardTokens,
} = require("./shared/scoring");
const { selectBuildCandidatesFromCatalog, selectPerBuildCategory, getWorkloadProfile } = require("./build-pc");


// Normalize product for response

const normalizeProduct = (product) => ({
  id: product.id,
  name: product.name,
  category_name: product.category_name,
  brand: product.brand,
  price: product.price,
  sale_price: product.sale_price,
  discount_percent: product.discount_percent,
  stock: product.stock,
  image_url: product.image_url,
});

// Keyword retrieval

const retrieveProducts = ({ message, limit = 8, perCategory = false }) => {
  const kb = loadKnowledgeBase();
  const tokens = tokenize(message);
  const budget = parseBudget(message);
  const categories = detectCategory(message);

  const scored = kb.products
    .map((doc) => ({ doc, score: scoreDocument({ doc, tokens, budget, categories }) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.doc.stock || 0) - Number(a.doc.stock || 0));

  if (!perCategory) {
    return { products: scored.slice(0, limit).map((item) => item.doc), budget, tokens, categories };
  }

  const selected = [];
  for (const category of getTuningConfig().build_categories) {
    const match = scored.find(
      (item) =>
        normalize(item.doc.category_name) === normalize(category) &&
        !selected.some((product) => product.id === item.doc.id)
    );
    if (match) selected.push(match.doc);
  }

  return {
    products: selected.length ? selected : scored.slice(0, limit).map((item) => item.doc),
    budget,
    tokens,
    categories,
  };
};


// Vector retrieval

const retrieveVectorProducts = async ({ message, limit = 8, perCategory = false }) => {
  const tokens = tokenize(message);
  const budget = parseBudget(message);
  const categories = detectCategory(message);
  const vectorResult = await searchVectorIndex({ message, limit: Math.max(20, limit * 3) });
  const products = applyBusinessRerank({ products: vectorResult.items, tokens, budget, categories });

  if (!perCategory) {
    return { products: products.slice(0, limit), budget, tokens, categories, retrievalSource: "vector", vectorModel: vectorResult.model };
  }

  const selected = [];
  for (const category of getTuningConfig().build_categories) {
    const match = products.find(
      (product) =>
        normalize(product.category_name) === normalize(category) &&
        !selected.some((selectedProduct) => selectedProduct.id === product.id)
    );
    if (match) selected.push(match);
  }

  return {
    products: selected.length ? selected : products.slice(0, limit),
    budget,
    tokens,
    categories,
    retrievalSource: "vector",
    vectorModel: vectorResult.model,
  };
};

// Category candidates helper

const selectCategoryCandidatesFromCatalog = ({ categories, limit = 12 }) => {
  if (!categories.length) return [];
  const kb = loadKnowledgeBase();
  const selected = [];
  for (const category of categories) {
    const items = kb.products
      .filter(
        (product) =>
          normalize(product.category_name || "") === normalize(category) &&
          Number(product.stock || 0) > 0
      )
      .sort((a, b) => Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0))
      .slice(0, limit);
    selected.push(...items);
  }
  return selected;
};

// Hybrid retrieval

const retrieveHybridProducts = async ({ message, limit = 8, perCategory = false }) => {
  try {
    const vector = await retrieveVectorProducts({ message, limit: Math.max(limit, 12), perCategory: false });
    const keyword = retrieveProducts({ message, limit: Math.max(limit, 12), perCategory: false });
    const buildCandidates = selectBuildCandidatesFromCatalog({ message, budget: vector.budget });
    const categoryCandidates = selectCategoryCandidatesFromCatalog({ categories: vector.categories, limit: Math.max(limit, 12) });
    const merged = [];
    const seen = new Set();
    for (const product of [...buildCandidates, ...vector.products, ...keyword.products, ...categoryCandidates]) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      merged.push(product);
    }
    const reranked = applyBusinessRerank({ products: merged, tokens: vector.tokens, budget: vector.budget, categories: vector.categories });
    const selected = perCategory && buildCandidates.length
      ? buildCandidates
      : perCategory
        ? selectPerBuildCategory(reranked, message)
        : reranked.slice(0, Math.max(limit, 20));
    return {
      products: selected.length ? selected : reranked.slice(0, limit),
      budget: vector.budget,
      tokens: vector.tokens,
      categories: vector.categories,
      retrievalSource: "hybrid",
      vectorModel: vector.vectorModel,
    };
  } catch (error) {
    const fallback = retrieveProducts({ message, limit, perCategory });
    return { ...fallback, retrievalSource: "keyword", vectorError: error.message };
  }
};


// Budget / use-case inference

const inferCheapBudget = ({ message, categories }) => {
  if (!/(\\bcheap\\b|\\bre\\b|\\bgia re\\b|\\bgia tot\\b)/.test(normalize(message))) return null;
  const caps = { cpu: 5000000, ram: 5000000, ssd: 6000000, vga: 15000000, mainboard: 3000000 };
  const category = categories?.[0];
  return category ? caps[category] || null : null;
};

const inferUseCaseBudget = ({ message, categories }) => {
  const text = normalize(message);
  if (!categories?.includes("vga")) return null;
  if (/(full hd|1080p|esport|e-sport|valorant|cs2|lol|lien minh|fo4)/.test(text)) return 20000000;
  if (/(choi game|gaming|fps)/.test(text)) return 25000000;
  if (/(2k|qhd)/.test(text)) return 35000000;
  if (/(4k|aaa|game nang)/.test(text)) return 65000000;
  return null;
};


// Post-retrieval product filtering

const getResponseProducts = ({ message, products, budget, tokens, limit = 8 }) => {
  const categories = detectCategory(message);
  const effectiveBudget = budget || inferCheapBudget({ message, categories }) || inferUseCaseBudget({ message, categories });
  let categoryFiltered =
    categories.length > 0 && !isBuildQuestion(message)
      ? products.filter((product) => categories.includes(normalize(product.category_name || "")))
      : products;

  if (categories.includes("vga") && /(gaming|choi game|full hd|fps|esport|aaa|2k|4k)/.test(normalize(message))) {
    const gamingCards = categoryFiltered.filter((product) => {
      const text = normalize(`${product.name || ""}`);
      return !/(rtx pro|workstation|quadro)/.test(text);
    });
    if (gamingCards.length) categoryFiltered = gamingCards;
  }

  let hardTokens = getHardTokens(tokens);
  if (categories.length === 1 && categories[0] === "mainboard" && /(can main|co main|main .*nao|mainboard cho|main cho)/.test(normalize(message))) {
    hardTokens = hardTokens.filter((token) => !/^(i3|i5|i7|i9|ryzen|intel|amd|\d{4}f|\d{4}k|\d{4})$/.test(token));
  }
  if (isBuildQuestion(message)) {
    const buildCandidates = selectBuildCandidatesFromCatalog({ message, budget: effectiveBudget });
    return buildCandidates.length ? buildCandidates : categoryFiltered;
  }

  if (!effectiveBudget) {
    if (!hardTokens.length) return categoryFiltered.slice(0, limit);
    const strictProducts = categoryFiltered.filter((product) => productMatchesHardTokens({ product, hardTokens }));
    return (strictProducts.length ? strictProducts : categoryFiltered).slice(0, limit);
  }

  const affordable = categoryFiltered.filter((product) => Number(product.sale_price || product.price || 0) <= effectiveBudget);
  if (hardTokens.length === 0) return affordable.slice(0, limit);

  const strict = affordable.filter((product) => productMatchesHardTokens({ product, hardTokens }));
  const mustKeepHardTokens = hardTokens.some((token) =>
    ["nvme", "sata", "ddr4", "ddr5", "lga1700", "am5"].includes(token) ||
    /^\d+(gb|tb)$/.test(token) ||
    /^(intel|amd|ryzen|i3|i5|i7|i9|rtx|gtx)$/.test(token) ||
    /^[a-z]\d{3,4}$/.test(token) ||
    /^\d{4}$/.test(token)
  );
  if (strict.length || !mustKeepHardTokens) return (strict.length ? strict : affordable).slice(0, limit);

  if (categories.length > 0) {
    return loadKnowledgeBase()
      .products.filter(
        (product) =>
          categories.includes(normalize(product.category_name || "")) &&
          Number(product.sale_price || product.price || 0) <= effectiveBudget &&
          productMatchesHardTokens({ product, hardTokens })
      )
      .slice(0, limit);
  }

  return strict.slice(0, limit);
};


// History helpers
const normalizeHistoryProduct = (product) => ({
  id: product.id, name: product.name, category_name: product.category_name, brand: product.brand,
  price: product.price, sale_price: product.sale_price, discount_percent: product.discount_percent,
  stock: product.stock, image_url: product.image_url,
});

const historyProducts = (history = []) => {
  const products = [];
  for (const item of history) {
    if (item?.role !== "assistant" || !Array.isArray(item.products)) continue;
    for (const product of item.products) {
      if (!product?.id || products.some((existing) => existing.id === product.id)) continue;
      products.push(normalizeHistoryProduct(product));
    }
  }
  return products;
};

const referencedHistoryProduct = ({ message, history }) => {
  const products = historyProducts(history);
  if (!products.length) return null;

  const text = normalize(message);
  const rawText = String(message || "").toLowerCase();
  const digitMatch = rawText.match(/(?:^|[^\d])([1-5])(?:[^\d]|$)/);
  if (digitMatch && /(c|m|th|s|con|cai|mau|thu|so)/i.test(rawText)) {
    return products[Number(digitMatch[1]) - 1] || null;
  }

  const ordinalWords = [
    ["dau tien", "thu nhat", "so 1", "cai 1", "con 1", "mau 1"],
    ["thu 2", "thu hai", "so 2", "cai 2", "con 2", "mau 2"],
    ["thu 3", "thu ba", "so 3", "cai 3", "con 3", "mau 3"],
    ["thu 4", "thu tu", "so 4", "cai 4", "con 4", "mau 4"],
    ["thu 5", "thu nam", "so 5", "cai 5", "con 5", "mau 5"],
  ];
  for (let index = 0; index < ordinalWords.length; index += 1) {
    if (ordinalWords[index].some((term) => text.includes(term))) return products[index] || null;
  }
  if (/(cai nay|con nay|mau nay|san pham nay|cai do|con do|mau do|san pham do|no)\b/.test(text)) return products[0];
  return null;
};

const historyPriceSelection = ({ message, history, limit }) => {
  const products = historyProducts(history);
  if (!products.length) return null;
  const text = normalize(message);
  const asksCheaper = /(re hon|gia re|tiet kiem|mem hon|thap hon)/.test(text);
  const asksMoreExpensive = /(dat hon|cao hon|manh hon|tot hon|xin hon)/.test(text);
  if (!asksCheaper && !asksMoreExpensive) return null;

  const sorted = [...products].sort((a, b) => {
    const priceA = Number(a.sale_price || a.price || 0);
    const priceB = Number(b.sale_price || b.price || 0);
    return asksCheaper ? priceA - priceB : priceB - priceA;
  });
  const selected = sorted.slice(0, Math.min(limit, 3));
  if (!selected.length) return null;

  const label = asksCheaper ? "rẻ hơn" : "cao hơn/mạnh hơn";
  return {
    tool: "catalog.search",
    question: message,
    source: "history_price_filter",
    reply: `Trong các gợi ý trước, mình lọc ${selected.length} mẫu ${label}. Mẫu nổi bật là ${selected[0].name}, giá ${formatMoney(selected[0].sale_price || selected[0].price)}. Bạn có thể bấm thẻ sản phẩm để xem chi tiết.`,
    products: selected,
    debug: {
      budget: parseBudget(message),
      tokens: tokenize(message),
      categories: [...new Set(selected.map((product) => normalize(product.category_name || "")).filter(Boolean))],
      retrievalSource: "history_price_filter",
    },
  };
};

const buildHistoryContext = (history = []) => {
  const lines = [];
  for (const item of history.slice(-6)) {
    const role = item.role === "assistant" ? "assistant" : "user";
    const text = String(item.text || "").replace(/\s+/g, " ").slice(0, 500);
    if (text) lines.push(`${role}: ${text}`);
    if (item.role === "assistant" && Array.isArray(item.products) && item.products.length) {
      const productText = item.products
        .slice(0, 5)
        .map((product, index) => {
          const price = formatMoney(product.sale_price || product.price || 0);
          return `${index + 1}. ${product.name} (${product.category_name || ""}, ${price})`;
        })
        .join("; ");
      lines.push(`assistant_products: ${productText}`);
    }
  }
  return lines.join("\n");
};


// Ranking handler

const answerRankingQuestion = ({ message, limit }) => {
  const kb = loadKnowledgeBase();
  const categories = detectCategory(message);
  const text = normalize(message);
  const maxItems = rankingLimit(message, getChatbotSkills().ranking?.default_limit || limit);
  let products = kb.products.filter((product) => Number(product.stock || 0) > 0);
  if (categories.length) {
    products = products.filter((product) => categories.includes(normalize(product.category_name || "")));
  }

  let rankingName = "phù hợp";
  const hardTokens = getHardTokens(tokenize(message)).filter(isStrictSpecToken);
  if (hardTokens.length) {
    const strictProducts = products.filter((product) => productMatchesHardTokens({ product, hardTokens }));
    if (strictProducts.length) products = strictProducts;
  }

  if (/(re nhat|gia thap nhat|cheap)/.test(text)) {
    products.sort((a, b) => Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0));
    rankingName = "giá thấp nhất";
  } else if (/(dat nhat|gia cao nhat|expensive)/.test(text)) {
    products.sort((a, b) => Number(b.sale_price || b.price || 0) - Number(a.sale_price || a.price || 0));
    rankingName = "giá cao nhất";
  } else if (/(nhieu hang nhat|ton kho nhieu|stock)/.test(text)) {
    products.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    rankingName = "tồn kho nhiều nhất";
  } else if (/(ban chay|sold)/.test(text)) {
    products.sort((a, b) => Number(b.total_sold || 0) - Number(a.total_sold || 0));
    rankingName = "bán chạy nhất trong dữ liệu";
  } else {
    products.sort((a, b) => Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0));
  }

  products = products.slice(0, maxItems);
  return {
    tool: "catalog.search",
    question: message,
    source: "ranking_skill",
    reply: products.length
      ? `Mình lọc ${products.length} sản phẩm ${rankingName}. Bạn có thể xem các thẻ sản phẩm để so sánh nhanh.`
      : "Mình chưa tìm thấy sản phẩm phù hợp để xếp hạng trong catalog.",
    products: products.map(normalizeProduct),
    debug: {
      budget: parseBudget(message),
      tokens: tokenize(message),
      categories,
      retrievalSource: "skill_ranking",
      ranking: rankingName,
    },
  };
};

// Sales advisory handler

const selectSalesAdvisoryProducts = ({ message, limit }) => {
  const kb = loadKnowledgeBase();
  const intent = salesIntentKind(message);
  const budget = parseBudget(message);
  const categories = detectCategory(message);
  const targetCategories = intent === "cross_sell" ? complementaryCategories(categories) : categories;
  let products = kb.products.filter((product) => Number(product.stock || 0) > 0);

  if (targetCategories.length) {
    products = products.filter((product) =>
      targetCategories.some((category) => normalize(product.category_name || "") === normalize(category))
    );
  }
  const beforeBudgetFilter = products;
  if (budget && intent !== "upsell") {
    products = products.filter((product) => Number(product.sale_price || product.price || 0) <= budget);
    if (!products.length && intent === "objection") products = beforeBudgetFilter;
  }

  const tokens = tokenize(message);
  const hardTokens = getHardTokens(tokens).filter(isStrictSpecToken);
  if (hardTokens.length) {
    const strict = products.filter((product) => productMatchesHardTokens({ product, hardTokens }));
    if (strict.length) products = strict;
  }

  const sorted = products.sort((a, b) => {
    const priceA = Number(a.sale_price || a.price || 0);
    const priceB = Number(b.sale_price || b.price || 0);
    if (intent === "upsell") return priceB - priceA;
    if (intent === "objection") return priceA - priceB;
    if (intent === "compare") return priceA - priceB;
    return Number(b.stock || 0) - Number(a.stock || 0) || priceA - priceB;
  });

  const finalProducts =
    intent === "cross_sell"
      ? targetCategories
        .map((category) => sorted.find((product) => normalize(product.category_name || "") === normalize(category)))
        .filter(Boolean)
        .slice(0, limit)
      : sorted.slice(0, limit);

  return { intent, budget, categories: targetCategories.map(normalize), products: finalProducts };
};

const answerSalesAdvisoryQuestion = ({ message, limit }) => {
  const selected = selectSalesAdvisoryProducts({ message, limit });
  const label = {
    cross_sell: "mua kem", upsell: "nang cap", objection: "toi uu ngan sach",
    compare: "so sanh", decision: "chot lua chon", consult: "tu van ban hang",
  }[selected.intent];
  const first = selected.products[0];
  const availability = first && Number(first.stock || 0) <= 0 ? " Hiện sản phẩm này đang hết hàng." : "";
  const reply = first
    ? `Mình tư vấn theo hướng ${label}: ưu tiên sản phẩm đúng nhu cầu và ngân sách. Gợi ý nổi bật là ${first.name}, giá ${formatMoney(first.sale_price)}.${availability} Bạn có thể xem thêm các thẻ sản phẩm để chốt lựa chọn.`
    : "Mình chưa tìm thấy sản phẩm phù hợp để tư vấn bán hàng trong catalog. Bạn cho mình thêm danh mục, nhu cầu sử dụng hoặc ngân sách để lọc chính xác hơn.";

  return {
    tool: "catalog.search",
    question: message,
    source: "sales_advisory_skill",
    reply,
    products: selected.products.map(normalizeProduct),
    debug: {
      budget: selected.budget,
      tokens: tokenize(message),
      categories: selected.categories,
      retrievalSource: "skill_sales_advisory",
      salesIntent: selected.intent,
    },
  };
};


// Exact product mention

const findExactProductMention = (message) => {
  const kb = loadKnowledgeBase();
  const text = normalize(message);
  const minLength = getChatbotSkills().exact_product?.min_normalized_length || 12;
  return kb.products.find((product) => {
    const name = normalize(product.name || "");
    return name.length > minLength && text.includes(name);
  });
};


// Fallback reply builder

const fallbackAnswer = ({ message, products, budget }) => {
  if (!products.length) {
    return "Mình chưa tìm thấy sản phẩm phù hợp trong dữ liệu shop. Bạn có thể nói rõ danh mục, ngân sách hoặc thông số cần tìm hơn một chút.";
  }

  if (isBuildQuestion(message)) {
    const total = products.reduce((sum, product) => sum + Number(product.sale_price || product.price || 0), 0);
    const workload = getWorkloadProfile(message);
    const lines = products
      .map((product) => `${product.category_name}: ${product.name} - ${formatMoney(product.sale_price)}${availabilityNote(product)}`)
      .join("\n");
    const budgetNote = budget
      ? total <= budget
        ? `Tổng tạm tính ${formatMoney(total)}, nằm trong ngân sách ${formatMoney(budget)}.`
        : `Tổng tạm tính ${formatMoney(total)}, đang vượt ngân sách ${formatMoney(budget)}; đây là combo gần ngân sách nhất mình tìm được trong catalog hiện tại.`
      : `Tổng tạm tính ${formatMoney(total)}.`;
    const compatibility = compatibilitySummary(products);
    const priorityNote = workload ? `\nƯu tiên theo mục đích: ${workload.guidance}` : "";
    return `Mình lọc được combo tham khảo từ dữ liệu shop:${priorityNote}\n${lines}\n${budgetNote} Kiểm tra tương thích: ${compatibility.notes.join(" ")}`;
  }

  const first = products[0];
  return `Mình tìm thấy ${products.length} sản phẩm liên quan. Gợi ý nổi bật: ${first.name}, giá ${formatMoney(first.sale_price)}.${availabilityNote(first) ? ` ${availabilityNote(first).replace(" - ", "")}.` : ""} Bạn có thể xem các thẻ sản phẩm trả về để chọn nhanh.`;
};

// Main entry: searchCatalog

const searchCatalog = async ({ message, history = [], limit = 8 }) => {
  const kb = loadKnowledgeBase();
  const originalMessage = message;

  // History reference (ordinal like "cái 1", "con số 2"…)
  const historyProduct = referencedHistoryProduct({ message, history });
  if (historyProduct) {
    return {
      tool: "catalog.search",
      question: originalMessage,
      source: "history_reference",
      reply: `${historyProduct.name}, giá ${formatMoney(historyProduct.sale_price || historyProduct.price)}.${availabilityNote(historyProduct) ? ` ${availabilityNote(historyProduct).replace(" - ", "")}.` : ""} Bạn có thể bấm thẻ sản phẩm để xem chi tiết.`,
      products: [historyProduct],
      debug: {
        budget: parseBudget(originalMessage),
        tokens: tokenize(originalMessage),
        categories: [normalize(historyProduct.category_name || "")].filter(Boolean),
        retrievalSource: "history_reference",
      },
    };
  }

  // History price filter ("rẻ hơn", "mạnh hơn"…)
  const priceSelection = historyPriceSelection({ message, history, limit });
  if (priceSelection) return priceSelection;

  // Enrich message with history context if needed
  if (shouldUseHistoryContext(message, history)) {
    const historyContext = buildHistoryContext(history);
    if (historyContext) message = `${historyContext}\nCâu hỏi hiện tại: ${message}`;
  }

  // Sale products
  if (isSaleQuestion(message)) {
    const saleProducts = kb.products
      .filter((product) => Number(product.discount_percent || 0) > 0)
      .sort((a, b) => Number(b.discount_percent || 0) - Number(a.discount_percent || 0))
      .slice(0, limit);
    return {
      tool: "catalog.search",
      question: message,
      source: "catalog_guard",
      reply: saleProducts.length
        ? `Hiện có ${saleProducts.length} sản phẩm đang sale. Bạn có thể xem các thẻ sản phẩm để chọn nhanh.`
        : "Hiện dữ liệu shop chưa có sản phẩm nào đang sale hoặc mã giảm giá active.",
      products: saleProducts.map(normalizeProduct),
      debug: { budget: parseBudget(message), tokens: tokenize(message), categories: detectCategory(message), retrievalSource: "guard" },
    };
  }

  // Ranking
  if (isRankingQuestion(message) && !isBuildQuestion(message)) {
    return answerRankingQuestion({ message, limit });
  }

  // Sales advisory
  if (isSalesAdvisoryQuestion(message) && !isBuildQuestion(message)) {
    return answerSalesAdvisoryQuestion({ message, limit });
  }

  // Cheap browse (no category, general "sản phẩm giá tốt")
  if (isCheapBrowseQuestion(message)) {
    const products = kb.products
      .filter((product) => Number(product.stock || 0) > 0)
      .sort((a, b) => Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0))
      .slice(0, limit);
    return {
      tool: "catalog.search",
      question: message,
      source: "catalog_guard",
      reply: products.length
        ? `Mình gợi ý ${products.length} sản phẩm giá tốt nhất đang còn hàng. Mẫu rẻ nhất là ${products[0].name}, giá ${formatMoney(products[0].sale_price)}.`
        : "Hiện chưa có sản phẩm còn hàng trong dữ liệu shop.",
      products: products.map(normalizeProduct),
      debug: { budget: parseBudget(message), tokens: tokenize(message), categories: detectCategory(message), retrievalSource: "guard" },
    };
  }

  // Exact product name match
  const exactProduct = findExactProductMention(message);
  if (exactProduct) {
    return {
      tool: "catalog.search",
      question: message,
      source: "exact_match",
      reply: `${exactProduct.name}, giá ${formatMoney(exactProduct.sale_price)}.${availabilityNote(exactProduct) ? ` ${availabilityNote(exactProduct).replace(" - ", "")}.` : ""} Bạn có thể bấm thẻ sản phẩm để xem chi tiết.`,
      products: [normalizeProduct(exactProduct)],
      debug: { budget: parseBudget(message), tokens: tokenize(message), categories: [normalize(exactProduct.category_name || "")], retrievalSource: "exact_match" },
    };
  }

  // Hybrid retrieval (vector + keyword + catalog)
  const perCategory = isBuildQuestion(message);
  const retrieval = await retrieveHybridProducts({ message, limit, perCategory });
  const responseProducts = getResponseProducts({ message, products: retrieval.products, budget: retrieval.budget, tokens: retrieval.tokens, limit });

  return {
    tool: "catalog.search",
    question: originalMessage,
    source: "local_rag",
    reply: fallbackAnswer({ message, products: responseProducts, budget: retrieval.budget }),
    products: responseProducts.map(normalizeProduct),
    debug: {
      budget: retrieval.budget,
      tokens: retrieval.tokens,
      categories: retrieval.categories,
      retrievalSource: retrieval.retrievalSource,
      vectorModel: retrieval.vectorModel,
      vectorError: retrieval.vectorError,
    },
  };
};

module.exports = {
  searchCatalog,
  retrieveProducts,
  retrieveVectorProducts,
  retrieveHybridProducts,
};
