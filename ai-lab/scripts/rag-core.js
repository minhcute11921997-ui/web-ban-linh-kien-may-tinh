const fs = require("fs");
const path = require("path");
const { searchVectorIndex } = require("./embedding-core");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const KB_PATH = path.join(DATA_DIR, "knowledge-base.json");
const TUNING_CONFIG_PATH = path.join(DATA_DIR, "tuning-config.json");
const SKILLS_PATH = path.join(DATA_DIR, "chatbot-skills.json");

const STOP_WORDS = new Set([
  "toi",
  "minh",
  "ban",
  "can",
  "tim",
  "mua",
  "san",
  "pham",
  "hang",
  "co",
  "khong",
  "cho",
  "hoi",
  "tu",
  "van",
  "gia",
  "duoi",
  "trieu",
  "dang",
  "sale",
  "giam",
  "khuyen",
  "mai",
  "tren",
  "tam",
  "khoang",
  "may",
  "cai",
  "mot",
  "la",
  "nao",
  "nhe",
  "nha",
  "for",
  "me",
  "need",
  "recommend",
  "under",
  "cheap",
  "best",
  "or",
  "hoac",
  "uu",
  "tien",
  "neu",
  "json",
  "cac",
  "bang",
  "liet",
  "ke",
  "tom",
  "tat",
  "ngan",
  "gon",
]);

const DEFAULT_TUNING_CONFIG = {
  category_aliases: {
    cpu: ["cpu", "processor", "vi xu ly", "bo xu ly", "chip"],
    ram: ["ram", "memory", "ddr4", "ddr5"],
    ssd: ["ssd", "o cung", "nvme", "sata"],
    vga: ["vga", "gpu", "card do hoa", "card man hinh"],
    mainboard: ["mainboard", "bo mach chu", "motherboard", "main"],
  },
  unsupported_terms: ["laptop", "notebook", "may tinh xach tay", "ban phim", "chuot", "man hinh", "tai nghe"],
  soft_tokens: ["con", "mau", "on", "tot", "goi", "y", "nao", "duoi", "tren", "khoang", "tam"],
  build_terms: ["build", "cau hinh", "combo", "lap pc", "build pc", "pc gaming", "may tinh ban", "render", "do hoa"],
  sale_terms: ["sale", "dang giam", "khuyen mai", "khuyen mai", "giam gia", "flash sale", "flashsale", "uu dai", "voucher", "ma giam", "deal", "giam sau"],
  build_categories: ["CPU", "VGA", "RAM", "Mainboard", "SSD"],
  budget_share: {
    CPU: 0.25,
    VGA: 0.45,
    RAM: 0.16,
    Mainboard: 0.18,
    SSD: 0.16,
  },
};

const normalize = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\b(ktra|kt)\b/g, "kiem tra")
    .replace(/\b(ko|kh|k|khongg|hong|hok|hông)\b/g, "khong")
    .replace(/\b(bn|bnh|bnhieu|bao nhieuu|bao nhieu tien)\b/g, "bao nhieu")
    .replace(/\b(cpi|cup|cpuu|cpụ|chíp|chip)\b/g, "cpu")
    .replace(/\b(ramm|rm|rma|ramm?m|thanh nho|bo nho trong)\b/g, "ram")
    .replace(/\b(vag|vgaaa|gpuu|card do hoa|cardd|cac man hinh|card roi|card hinh|card vga)\b/g, "vga")
    .replace(/\b(mainbroad|mainbord|mainboardd|main bo|main boad|bo mach|bo mach chu|men|mên|mother board|motherboard)\b/g, "mainboard")
    .replace(/\b(o cung|ocung|ổ cứng|ssdđ|ssđ|sdd|o luu tru|bo nho luu tru)\b/g, "ssd")
    .replace(/\b(nvmee|nvm|nvmeee)\b/g, "nvme")
    .replace(/\b(ddr)\s*([45])\b/g, "ddr$2")
    .replace(/\b(rizen|rayzen)\b/g, "ryzen")
    .replace(/\b(inter)\b/g, "intel")
    .replace(/\b(ryzenn|rzyen)\b/g, "ryzen")
    .replace(/\b(chot don|chốt đơn)\b/g, "chot")
    .replace(/\b(xai|sai)\b/g, "dung")
    .replace(/\b(dc|đc)\b/g, "duoc")
    .replace(/\b(hop ko|hop k)\b/g, "hop khong")
    .replace(/\bcard\s*mh\b/g, "card man hinh")
    .replace(/\b(\d{4})\s*ti\b/g, "$1 ti")
    .replace(/\b(\d+)\s*g\b/g, "$1gb")
    .replace(/\b(\d+)\s*t\b/g, "$1tb");

const loadTuningConfig = () => {
  if (!fs.existsSync(TUNING_CONFIG_PATH)) return DEFAULT_TUNING_CONFIG;
  try {
    return {
      ...DEFAULT_TUNING_CONFIG,
      ...JSON.parse(fs.readFileSync(TUNING_CONFIG_PATH, "utf8")),
    };
  } catch (_) {
    return DEFAULT_TUNING_CONFIG;
  }
};

const getTuningConfig = () => loadTuningConfig();

const loadChatbotSkills = () => {
  if (!fs.existsSync(SKILLS_PATH)) return { skills: {} };
  try {
    return JSON.parse(fs.readFileSync(SKILLS_PATH, "utf8"));
  } catch (_) {
    return { skills: {} };
  }
};

const getChatbotSkills = () => loadChatbotSkills().skills || {};

const formatMoney = (value) =>
  `${Math.round(Number(value || 0)).toLocaleString("vi-VN")}đ`;

const tokenize = (value) =>
  normalize(value)
    .split(/[^a-z0-9]+/i)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !STOP_WORDS.has(item));

const parseBudget = (message) => {
  const normalized = normalize(message).replace(/,/g, ".");
  const matches = [
    ...normalized.matchAll(/(?<![a-z0-9])(\d+(?:\.\d+)?)(?:\s*(trieu|tr|m|cu|chai|k|nghin|ngan))?(?![a-z0-9])/g),
  ];
  const amounts = matches
    .map((match) => {
      const value = Number(match[1]);
      const unit = match[2] || "";
      if (!Number.isFinite(value) || value <= 0) return null;
      const before = normalized.slice(Math.max(0, match.index - 16), match.index);
      const after = normalized.slice(match.index + match[0].length, match.index + match[0].length + 8);
      if (unit === "k" && value <= 8 && /(game|gaming|choi|man hinh|do phan giai|fps|aaa)/.test(`${before} ${after}`)) {
        return null;
      }
      if (["trieu", "tr", "m", "cu", "chai"].includes(unit)) return value * 1000000;
      if (["k", "nghin", "ngan"].includes(unit)) return value * 1000;
      if (!/(gia|duoi|tren|tam|khoang|under)/.test(before) && !/^(d|dong|vnd)/.test(after)) {
        return null;
      }
      return value >= 1000 ? value : value * 1000000;
    })
    .filter(Boolean);

  return amounts.length ? Math.max(...amounts) : null;
};

const detectDirectCategory = (message) => {
  const text = normalize(message);
  const directAliases = {
    cpu: ["cpu", "vi xu ly", "bo vi xu ly", "bo xu ly", "processor", "chip", "i3", "i5", "i7", "i9", "ryzen", "core ultra"],
    ram: ["ram", "bo nho", "memory"],
    ssd: ["ssd", "o cung", "nvme"],
    vga: ["vga", "gpu", "card do hoa", "card man hinh", "rtx", "gtx", "geforce"],
    mainboard: ["mainboard", "bo mach chu", "motherboard", "main", "h610", "b760", "b860", "z790", "z890", "x870", "a520"],
  };
  const direct = Object.entries(directAliases)
    .filter(([, aliases]) => aliases.some((alias) => text.includes(normalize(alias))))
    .map(([category]) => category);
  if (
    direct.includes("mainboard") &&
    !/(tong|tinh tong|check|kiem tra|tuong thich|\bhop\b|xem co tuong thich)/.test(text) &&
    (/(cho|di voi|dung voi|xai voi|hop voi)\s+(cpu|i3|i5|i7|i9|ryzen|intel|amd|core ultra)/.test(text) ||
      /(can main|co main|main .*nao|main .*hop)/.test(text))
  ) {
    return ["mainboard"];
  }
  return direct.filter((category) => {
    const negations = {
      cpu: ["khong phai cpu", "khong can cpu"],
      ram: ["khong phai ram", "khong can ram"],
      ssd: ["khong phai ssd", "khong can ssd"],
      vga: ["khong phai vga", "khong can vga"],
      mainboard: ["khong phai mainboard", "khong can mainboard", "khong can main"],
    };
    return !(negations[category] || []).some((term) => text.includes(term));
  });
};

const detectCategory = (message) => {
  const text = normalize(message);
  const config = getTuningConfig();
  const direct = detectDirectCategory(message);
  if (direct.length > 0) return direct;

  return Object.entries(config.category_aliases)
    .filter(([, aliases]) => aliases.some((alias) => text.includes(normalize(alias))))
    .map(([category]) => category);
};

const isBuildQuestion = (message) => {
  const text = normalize(message);
  const hasDirectCategory = detectDirectCategory(message).length > 0;
  const explicitBuild = /(build|cau hinh|combo|lap pc|pc gaming|may tinh ban|dan may|lap may)/.test(text);
  const workloadOnly = /(render|do hoa|hoc tap|hoc online|sinh vien|van phong|ke toan|autocad|livestream|stream|edit video|video edit|dung phim|machine learning|\bai\b|lap trinh|code|dev|developer|photoshop|blender)/.test(text);
  if (hasDirectCategory && !explicitBuild) return false;
  return explicitBuild || workloadOnly || (/(choi game|gaming)/.test(text) && /\b(pc|may tinh|may|bo|cau hinh|build)\b/.test(text));
};

const isSaleQuestion = (message) => {
  const text = normalize(message);
  if (detectDirectCategory(message).length > 0 && /uu tien.*giam/.test(text)) return false;
  return getTuningConfig().sale_terms.some((term) => text.includes(normalize(term)));
};

const hasTerm = (message, term) => {
  const text = normalize(message);
  const normalizedTerm = normalize(term);
  if (normalizedTerm.includes(" ")) return text.includes(normalizedTerm);
  return new RegExp(`(^|[^a-z0-9])${normalizedTerm}([^a-z0-9]|$)`).test(text);
};

const isPolicyQuestion = (message) => {
  const policy = getChatbotSkills().policy_guard;
  return Boolean(policy?.terms?.some((term) => hasTerm(message, term)));
};

const isAccountOrderQuestion = (message) => {
  const skill = getChatbotSkills().account_order_guard;
  return Boolean(skill?.terms?.some((term) => hasTerm(message, term)));
};

const isSafetyQuestion = (message) => {
  const skill = getChatbotSkills().safety_guard;
  return Boolean(skill?.terms?.some((term) => hasTerm(message, term)));
};

const isRankingQuestion = (message) => {
  const skill = getChatbotSkills().ranking;
  const text = normalize(message);
  return Boolean(skill?.terms?.some((term) => hasTerm(message, term))) || /^\s*\d+\s+(cpu|ram|ssd|vga|mainboard|main|card|chip|o cung)/.test(text);
};

const isSalesAdvisoryQuestion = (message) => {
  const skill = getChatbotSkills().sales_advisory;
  return Boolean(skill?.terms?.some((term) => hasTerm(message, term)));
};

const isComboCheckQuestion = (message) => {
  const skill = getChatbotSkills().combo_check;
  const text = normalize(message);
  const categories = detectDirectCategory(message);
  const hasComboTerm = Boolean(skill?.terms?.some((term) => hasTerm(message, term)));
  const specificModel = /\b(i3|i5|i7|i9|ryzen|core ultra|rtx|gtx|h610|b760|b860|z790|z890|x870|a520|am5|lga\d{4}|\d{4}f|\d{4}k|\d{4}|ddr4|ddr5|nvme)\b/.test(text);
  const explicitComboIntent = /(combo|build|cau hinh|kiem tra|check|\btong\b|lap bo|bo nay|lap may|thieu)/.test(text);
  const asksCompatibility = /(\bhop\b|hop nhau|on khong|di duoc|dung voi|tuong thich|\btong\b|\bcombo\b|kiem tra|check|lap may|thieu)/.test(text);
  const explicitBuildCombo = /(build|cau hinh)/.test(text) && /(nay|gom|voi|dung voi)/.test(text) && specificModel;
  if (categories.length < 2 && !explicitComboIntent) return false;
  return hasComboTerm || (categories.length >= 2 && specificModel && asksCompatibility) || explicitBuildCombo;
};

const rankingLimit = (message, fallback) => {
  const match = normalize(message).match(/\btop\s*(\d+)|\b(\d+)\s*(san pham|mau|cpu|ram|ssd|vga|mainboard|main)?/);
  const value = Number(match?.[1] || match?.[2] || 0);
  return value > 0 ? Math.min(value, 20) : fallback;
};

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
    question: message,
    source: "ranking_skill",
    reply: products.length
      ? `Mình lọc ${products.length} sản phẩm ${rankingName}. Bạn có thể xem các thẻ sản phẩm để so sánh nhanh.`
      : "Mình chưa tìm thấy sản phẩm phù hợp để xếp hạng trong catalog.",
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      category_name: product.category_name,
      brand: product.brand,
      price: product.price,
      sale_price: product.sale_price,
      discount_percent: product.discount_percent,
      stock: product.stock,
      image_url: product.image_url,
    })),
    debug: {
      budget: parseBudget(message),
      tokens: tokenize(message),
      categories,
      retrievalSource: "skill_ranking",
      ranking: rankingName,
    },
  };
};

const isUnsupportedCatalogQuestion = (message) =>
  !normalize(message).includes("card man hinh") &&
  (detectDirectCategory(message).length === 0 || (normalize(message).includes("laptop") && detectDirectCategory(message).includes("ram"))) &&
  getTuningConfig().unsupported_terms.some((term) => hasTerm(message, term));

const isCompatibilityQuestion = (message) => {
  const compatibility = getChatbotSkills().compatibility;
  const text = normalize(message);
  const hasAction = Boolean(compatibility?.terms?.some((term) => hasTerm(message, term)));
  if (!hasAction) return false;
  if (detectDirectCategory(message).length > 0 && !/(hop|tuong thich|dung duoc|di voi|chon|voi)/.test(text)) {
    return false;
  }
  if (/(duoi|gia|re|con hang|mau nao|shop con)/.test(text) && !/(hop|tuong thich|dung duoc|chon)/.test(text)) {
    return false;
  }
  return true;
};

const isCheapBrowseQuestion = (message) =>
  !isBuildQuestion(message) &&
  /(\bgia tot\b|\bgia re\b|\bre nhat\b|\bsan pham gia tot\b|\bvai san pham\b)/.test(normalize(message)) &&
  detectDirectCategory(message).length === 0;

const salesIntentKind = (message) => {
  const text = normalize(message);
  if (/(mua kem|di kem|combo voi|chon them|can them)/.test(text)) return "cross_sell";
  if (/(nang cap|cao hon|manh hon|tot hon|len doi)/.test(text)) return "upsell";
  if (/(dat qua|mac qua|re hon|tiet kiem|qua ngan sach|chi co)/.test(text)) return "objection";
  if (/(phan van|so sanh|khac nhau|nen chon cai nao|chon cai nao)/.test(text)) return "compare";
  if (/(co nen mua|dang mua|chot|lay mau nao|mua mau nao)/.test(text)) return "decision";
  return "consult";
};

const complementaryCategories = (categories) => {
  const normalized = new Set(categories.map(normalize));
  const result = new Map(categories.map((category) => [normalize(category), category]));
  const add = (item) => result.set(normalize(item), item);
  if (normalized.has("cpu")) ["Mainboard", "RAM", "SSD"].forEach(add);
  if (normalized.has("vga")) ["CPU", "RAM", "SSD"].forEach(add);
  if (normalized.has("ram")) ["Mainboard", "CPU"].forEach(add);
  if (normalized.has("ssd")) ["RAM", "CPU"].forEach(add);
  if (normalized.has("mainboard")) ["CPU", "RAM", "SSD"].forEach(add);
  return [...result.values()];
};

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

  return {
    intent,
    budget,
    categories: targetCategories.map(normalize),
    products: finalProducts,
  };
};

const answerSalesAdvisoryQuestion = ({ message, limit }) => {
  const selected = selectSalesAdvisoryProducts({ message, limit });
  const label = {
    cross_sell: "mua kem",
    upsell: "nang cap",
    objection: "toi uu ngan sach",
    compare: "so sanh",
    decision: "chot lua chon",
    consult: "tu van ban hang",
  }[selected.intent];
  const first = selected.products[0];
  const availability = first && Number(first.stock || 0) <= 0 ? " Hiện sản phẩm này đang hết hàng." : "";
  const reply = first
    ? `Mình tư vấn theo hướng ${label}: ưu tiên sản phẩm đúng nhu cầu và ngân sách. Gợi ý nổi bật là ${first.name}, giá ${formatMoney(first.sale_price)}.${availability} Bạn có thể xem thêm các thẻ sản phẩm để chốt lựa chọn.`
    : "Mình chưa tìm thấy sản phẩm phù hợp để tư vấn bán hàng trong catalog. Bạn cho mình thêm danh mục, nhu cầu sử dụng hoặc ngân sách để lọc chính xác hơn.";

  return {
    question: message,
    source: "sales_advisory_skill",
    reply,
    products: selected.products.map((product) => ({
      id: product.id,
      name: product.name,
      category_name: product.category_name,
      brand: product.brand,
      price: product.price,
      sale_price: product.sale_price,
      discount_percent: product.discount_percent,
      stock: product.stock,
      image_url: product.image_url,
    })),
    debug: {
      budget: selected.budget,
      tokens: tokenize(message),
      categories: selected.categories,
      retrievalSource: "skill_sales_advisory",
      salesIntent: selected.intent,
    },
  };
};

const loadKnowledgeBase = () => {
  if (!fs.existsSync(KB_PATH)) {
    throw new Error(`Missing ${KB_PATH}. Run: node ai-lab/scripts/export-knowledge-base.js`);
  }
  return JSON.parse(fs.readFileSync(KB_PATH, "utf8"));
};

const scoreDocument = ({ doc, tokens, budget, categories }) => {
  const searchable = normalize(doc.search_text || doc.text || "");
  let score = 0;

  for (const token of tokens) {
    if (searchable.includes(token)) score += token.length >= 4 ? 3 : 1;
  }

  const category = normalize(doc.category_name || "");
  if (categories.includes(category)) score += 10;
  if (budget && Number(doc.sale_price || doc.price) <= budget) score += 5;
  if (Number(doc.stock || 0) > 0) score += 2;
  if (Number(doc.total_sold || 0) > 0) score += Math.min(4, Number(doc.total_sold));
  if (Number(doc.discount_percent || 0) > 0) score += 1;

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

const retrieveProducts = ({ message, limit = 8, perCategory = false }) => {
  const kb = loadKnowledgeBase();
  const tokens = tokenize(message);
  const budget = parseBudget(message);
  const categories = detectCategory(message);

  const scored = kb.products
    .map((doc) => ({
      doc,
      score: scoreDocument({ doc, tokens, budget, categories }),
    }))
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

const retrieveVectorProducts = async ({ message, limit = 8, perCategory = false }) => {
  const tokens = tokenize(message);
  const budget = parseBudget(message);
  const categories = detectCategory(message);
  const vectorResult = await searchVectorIndex({ message, limit: Math.max(20, limit * 3) });
  const products = applyBusinessRerank({
    products: vectorResult.items,
    tokens,
    budget,
    categories,
  });

  if (!perCategory) {
    return {
      products: products.slice(0, limit),
      budget,
      tokens,
      categories,
      retrievalSource: "vector",
      vectorModel: vectorResult.model,
    };
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

const getBuildCategoriesForMessage = (message) => {
  const text = normalize(message);
  const base = ["CPU", "RAM", "Mainboard", "SSD"];
  const hasGameNeed = /(gaming|choi game|valorant|cs2|lol|lien minh|pubg|fps|aaa|2k|4k)/.test(text);
  const needsVga =
    (hasGameNeed ||
      /(vga|gpu|card man hinh|render|do hoa|autocad|livestream|stream|edit video|video edit|dung phim|machine learning|\bai\b|photoshop|blender)/.test(text)) &&
    (hasGameNeed || !/(van phong|hoc tap|sinh vien)/.test(text));
  return needsVga ? ["CPU", "VGA", "RAM", "Mainboard", "SSD"] : base;
};

const getWorkloadProfile = (message) => {
  const text = normalize(message);
  if (/(4k|2k|qhd|aaa|cyberpunk|gta|elden|game nang)/.test(text)) {
    return {
      name: "gaming_aaa",
      priorityCategories: ["VGA", "CPU", "RAM", "SSD", "Mainboard"],
      guidance:
        "Voi game AAA/2K/4K, uu tien VGA va VRAM manh nhat trong ngan sach, sau do CPU du keo VGA, RAM 16GB tro len va SSD de tai game nhanh.",
    };
  }
  if (/(esport|e-sport|fps|valorant|cs2|lol|lien minh|fo4|pubg)/.test(text)) {
    return {
      name: "gaming_esports",
      priorityCategories: ["CPU", "VGA", "RAM", "SSD", "Mainboard"],
      guidance:
        "Voi game eSports/FPS, uu tien CPU on dinh xung cao de giu FPS, VGA vua du muc man hinh, RAM toi thieu 16GB va SSD de vao tran nhanh.",
    };
  }
  if (/(choi game|gaming|full hd|fps|aaa|esport)/.test(text)) {
    return {
      name: "gaming",
      priorityCategories: ["VGA", "CPU", "RAM", "SSD", "Mainboard"],
      guidance:
        "Voi nhu cau choi game, nen uu tien VGA manh nhat trong ngan sach truoc, sau do chon CPU du keo VGA, RAM toi thieu 16GB va SSD de tai game nhanh.",
    };
  }
  if (/(edit video|video edit|render|dung phim|premiere|after effect|do hoa|autocad)/.test(text)) {
    return {
      name: "creator",
      priorityCategories: ["CPU", "RAM", "VGA", "SSD", "Mainboard"],
      guidance:
        "Voi render/edit/do hoa, nen uu tien CPU nhieu nhan, RAM dung luong cao, SSD nhanh; VGA quan trong neu phan mem tan dung GPU.",
    };
  }
  if (/(machine learning|\bai\b|deep learning|train model|hoc ai)/.test(text)) {
    return {
      name: "ai",
      priorityCategories: ["VGA", "RAM", "CPU", "SSD", "Mainboard"],
      guidance:
        "Voi AI/machine learning, nen uu tien VGA manh va VRAM lon, sau do RAM he thong, CPU on dinh va SSD du nhanh de doc du lieu.",
    };
  }
  if (/(livestream|stream)/.test(text)) {
    return {
      name: "stream",
      priorityCategories: ["CPU", "VGA", "RAM", "SSD", "Mainboard"],
      guidance:
        "Voi livestream, nen uu tien CPU/VGA du khoe de vua choi vua encode, RAM toi thieu 16GB va SSD de he thong phan hoi muot.",
    };
  }
  if (/(lap trinh|code|dev|developer|visual studio|android studio)/.test(text)) {
    return {
      name: "programming",
      priorityCategories: ["CPU", "RAM", "SSD", "Mainboard"],
      guidance:
        "Voi lap trinh, uu tien CPU on dinh, RAM 16GB tro len neu chay IDE/nhiều service, SSD nhanh; VGA roi thuong khong can tru khi lam AI/do hoa.",
    };
  }
  if (/(van phong|hoc tap|hoc online|sinh vien|ke toan)/.test(text)) {
    return {
      name: "office",
      priorityCategories: ["CPU", "SSD", "RAM", "Mainboard"],
      guidance:
        "Voi van phong/hoc tap, nen uu tien cau hinh on dinh, CPU tiet kiem, SSD cho toc do mo may/ung dung va RAM du dung; VGA roi thuong chua can.",
    };
  }
  return null;
};

const selectPerBuildCategory = (products, message = "") => {
  const selected = [];
  for (const category of getBuildCategoriesForMessage(message)) {
    const match = products.find(
      (product) =>
        normalize(product.category_name) === normalize(category) &&
        !selected.some((selectedProduct) => selectedProduct.id === product.id)
    );
    if (match) selected.push(match);
  }
  return selected;
};

const selectBuildCandidatesFromCatalog = ({ message, budget }) => {
  if (!isBuildQuestion(message)) return [];

  const kb = loadKnowledgeBase();
  const shares = getTuningConfig().budget_share || {};
  const selected = [];
  const categories = getBuildCategoriesForMessage(message);
  const workload = getWorkloadProfile(message);
  const byCategory = (category) =>
    kb.products
      .filter(
        (product) =>
          normalize(product.category_name || "") === normalize(category) &&
          Number(product.stock || 0) > 0
      )
      .sort((a, b) => Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0));
  const pickWithCap = (category, items) => {
    const cap = budget && shares[category] ? budget * Number(shares[category]) : null;
    const underCap = cap ? items.filter((product) => Number(product.sale_price || product.price || 0) <= cap) : [];
    const pool = underCap.length ? underCap : items;
    if (workload?.priorityCategories?.slice(0, 2).includes(category) && (!cap || underCap.length)) {
      return [...pool].sort((a, b) => Number(b.sale_price || b.price || 0) - Number(a.sale_price || a.price || 0))[0];
    }
    return pool[0];
  };

  const cpu = categories.includes("CPU") ? pickWithCap("CPU", byCategory("CPU")) : null;
  if (cpu) selected.push(cpu);

  const vga = categories.includes("VGA") ? pickWithCap("VGA", byCategory("VGA")) : null;
  if (vga) selected.push(vga);

  const ram = categories.includes("RAM") ? pickWithCap("RAM", byCategory("RAM")) : null;
  if (ram) selected.push(ram);

  if (categories.includes("Mainboard")) {
    const cpuSocket = getCpuSocket(cpu);
    const ramStandard = getRamStandard(ram);
    let mainboards = byCategory("Mainboard");
    if (cpuSocket) mainboards = mainboards.filter((product) => getMainboardSocket(product) === cpuSocket);
    if (ramStandard) mainboards = mainboards.filter((product) => getMainboardRamStandard(product) === ramStandard);
    if (!mainboards.length && cpuSocket) {
      mainboards = byCategory("Mainboard").filter((product) => getMainboardSocket(product) === cpuSocket);
    }
    const mainboard = pickWithCap("Mainboard", mainboards.length ? mainboards : byCategory("Mainboard"));
    if (mainboard) {
      const mainRam = getMainboardRamStandard(mainboard);
      if (ram && mainRam && getRamStandard(ram) !== mainRam) {
        const compatibleRam = pickWithCap(
          "RAM",
          byCategory("RAM").filter((product) => getRamStandard(product) === mainRam)
        );
        if (compatibleRam) {
          const ramIndex = selected.findIndex((product) => normalize(product.category_name || "") === "ram");
          if (ramIndex >= 0) selected[ramIndex] = compatibleRam;
        }
      }
      selected.push(mainboard);
    }
  }

  if (categories.includes("SSD")) {
    const ssd = pickWithCap("SSD", byCategory("SSD"));
    if (ssd) selected.push(ssd);
  }

  if (selected.length) return selected;

  for (const category of categories) {
    const items = kb.products
      .filter(
        (product) =>
          normalize(product.category_name || "") === normalize(category) &&
          Number(product.stock || 0) > 0
      )
      .sort((a, b) => Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0));

    if (!items.length) continue;

    const cap = budget && shares[category] ? budget * Number(shares[category]) : null;
    const underCap = cap ? items.filter((product) => Number(product.sale_price || product.price || 0) <= cap) : [];
    selected.push((underCap.length ? underCap : items)[0]);
  }

  return selected;
};

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

const retrieveHybridProducts = async ({ message, limit = 8, perCategory = false }) => {
  try {
    const vector = await retrieveVectorProducts({ message, limit: Math.max(limit, 12), perCategory: false });
    const keyword = retrieveProducts({ message, limit: Math.max(limit, 12), perCategory: false });
    const buildCandidates = selectBuildCandidatesFromCatalog({ message, budget: vector.budget });
    const categoryCandidates = selectCategoryCandidatesFromCatalog({
      categories: vector.categories,
      limit: Math.max(limit, 12),
    });
    const merged = [];
    const seen = new Set();
    for (const product of [...buildCandidates, ...vector.products, ...keyword.products, ...categoryCandidates]) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      merged.push(product);
    }
    const reranked = applyBusinessRerank({
      products: merged,
      tokens: vector.tokens,
      budget: vector.budget,
      categories: vector.categories,
    });
    const selected = perCategory ? selectPerBuildCategory(reranked, message) : reranked.slice(0, Math.max(limit, 20));
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
    return {
      ...fallback,
      retrievalSource: "keyword",
      vectorError: error.message,
    };
  }
};

const buildContext = (products) =>
  products.map((product, index) => ({
    stt: index + 1,
    id: product.id,
    ten: product.name,
    danh_muc: product.category_name,
    hang: product.brand,
    gia_hien_tai: product.sale_price,
    ton_kho: product.stock,
    da_ban: product.total_sold,
    thong_so: product.specifications,
    link: `/products/${product.id}`,
  }));

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
      if (category === "mainboard" && token === "intel") return ["1700", "1851"].includes(getMainboardSocket(product));
      if (category === "mainboard" && (token === "amd" || token === "ryzen")) return getMainboardSocket(product) === "am5";
      return new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`).test(conciseText);
    }
    return text.includes(token) || compactText.includes(compactToken) || (socketNumber && text.includes(socketNumber));
  };
  return otherTokens.every(tokenMatches) && (!capacityTokens.length || capacityTokens.some(tokenMatches));
};

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

const getCpuSocket = (product) => {
  const text = normalize(`${product?.name || ""} ${specText(product)}`);
  if (/\bam5\b/.test(text)) return "am5";
  if (/\bam4\b/.test(text)) return "am4";
  const lga = text.match(/lga\s*(\d{4})/)?.[1] || text.match(/\b(1700|1851|1200|1151)\b/)?.[1];
  return lga || "";
};

const getMainboardSocket = (product) => {
  const value = getSpecValue(product, ["socket"]);
  if (/\bam5\b/.test(value)) return "am5";
  if (/\bam4\b/.test(value)) return "am4";
  return value.match(/\b(1700|1851|1200|1151)\b/)?.[1] || "";
};

const getRamStandard = (product) => {
  const text = normalize(`${product?.name || ""} ${specText(product)}`);
  if (/\bddr5\b/.test(text)) return "ddr5";
  if (/\bddr4\b/.test(text)) return "ddr4";
  return "";
};

const getMainboardRamStandard = (product) => {
  const value = getSpecValue(product, ["chuan ram", "chuẩn ram", "ram"]);
  if (/\bddr5\b/.test(value)) return "ddr5";
  if (/\bddr4\b/.test(value)) return "ddr4";
  return getRamStandard(product);
};

const availabilityNote = (product) =>
  Number(product?.stock || 0) <= 0 ? " - hết hàng" : "";

const compatibilitySummary = (products) => {
  const cpu = products.find((product) => normalize(product.category_name) === "cpu");
  const mainboard = products.find((product) => normalize(product.category_name) === "mainboard");
  const ram = products.find((product) => normalize(product.category_name) === "ram");
  const notes = [];
  let hasConflict = false;

  if (cpu && mainboard) {
    const cpuSocket = getCpuSocket(cpu);
    const mainSocket = getMainboardSocket(mainboard);
    if (cpuSocket && mainSocket) {
      if (cpuSocket === mainSocket) {
        notes.push(`CPU và mainboard cùng socket ${cpuSocket.toUpperCase()}, có thể đi cùng nhau.`);
      } else {
        hasConflict = true;
        notes.push(`CPU socket ${cpuSocket.toUpperCase()} không khớp mainboard socket ${mainSocket.toUpperCase()}.`);
      }
    } else {
      notes.push("Chưa đủ dữ liệu socket CPU/mainboard để kết luận chắc chắn.");
    }
  }

  if (ram && mainboard) {
    const ramStandard = getRamStandard(ram);
    const mainRam = getMainboardRamStandard(mainboard);
    if (ramStandard && mainRam) {
      if (ramStandard === mainRam) {
        notes.push(`RAM và mainboard cùng chuẩn ${ramStandard.toUpperCase()}.`);
      } else {
        hasConflict = true;
        notes.push(`RAM ${ramStandard.toUpperCase()} không khớp mainboard hỗ trợ ${mainRam.toUpperCase()}.`);
      }
    } else {
      notes.push("Chưa đủ dữ liệu chuẩn RAM/mainboard để kết luận chắc chắn.");
    }
  }

  if (!cpu || !mainboard) notes.push("Nên có đủ CPU và mainboard để kiểm tra socket.");
  if (!ram || !mainboard) notes.push("Nên có đủ RAM và mainboard để kiểm tra chuẩn RAM.");

  return {
    ok: !hasConflict,
    notes,
  };
};

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

const selectMentionedComboProducts = ({ message, limit }) => {
  const kb = loadKnowledgeBase();
  const tokens = tokenize(message);
  const text = normalize(message);
  const categorySet = new Set(detectDirectCategory(message));
  if (/\b(cpu|i3|i5|i7|i9|ryzen|core ultra|intel|amd|\d{4}f|\d{4}k)\b/.test(text)) categorySet.add("cpu");
  if (/\b(vga|gpu|rtx|gtx|geforce|card man hinh)\b/.test(text)) categorySet.add("vga");
  if (/\b(ram|ddr4|ddr5|16gb|32gb|64gb)\b/.test(text)) categorySet.add("ram");
  if (/\b(main|mainboard|h610|b760|b860|z790|z890|x870|a520|am5|lga\d{4})\b/.test(text)) categorySet.add("mainboard");
  if (/\b(ssd|nvme|sata|p210|p300|adata|512gb|1tb|2tb)\b/.test(text)) categorySet.add("ssd");
  const categories = [...categorySet];
  const targetCategories = categories.length ? categories : ["cpu", "vga", "ram", "mainboard", "ssd"];
  const selected = [];
  const seen = new Set();

  for (const category of targetCategories) {
    const best = kb.products
      .filter((product) => normalize(product.category_name || "") === normalize(category))
      .map((product) => ({
        product,
        score: mentionedProductScore({ product, tokens, text }),
      }))
      .filter((item) => item.score >= 7)
      .sort((a, b) => b.score - a.score || Number(b.product.stock || 0) - Number(a.product.stock || 0))[0]?.product;

    if (best && !seen.has(best.id)) {
      seen.add(best.id);
      selected.push(best);
    }
  }

  if (/(thieu main|can main|main nao|chon main)/.test(text)) {
    const cpu = selected.find((product) => normalize(product.category_name || "") === "cpu");
    const ram = selected.find((product) => normalize(product.category_name || "") === "ram");
    const cpuSocket = getCpuSocket(cpu);
    const ramStandard = getRamStandard(ram);
    const mainboardCandidates = kb.products
      .filter((product) => normalize(product.category_name || "") === "mainboard")
      .sort((a, b) => Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0));
    const compatibleMainboard =
      mainboardCandidates.find((product) => {
        const mainSocket = getMainboardSocket(product);
        const mainRam = getMainboardRamStandard(product);
        return (!cpuSocket || !mainSocket || cpuSocket === mainSocket) && (!ramStandard || !mainRam || ramStandard === mainRam);
      }) ||
      mainboardCandidates.find((product) => {
        const mainSocket = getMainboardSocket(product);
        return cpuSocket && mainSocket && cpuSocket === mainSocket;
      }) ||
      mainboardCandidates.find((product) => {
        const mainRam = getMainboardRamStandard(product);
        return ramStandard && mainRam && ramStandard === mainRam;
      });

    if (compatibleMainboard) {
      const mainIndex = selected.findIndex((product) => normalize(product.category_name || "") === "mainboard");
      if (mainIndex >= 0) selected[mainIndex] = compatibleMainboard;
      else selected.push(compatibleMainboard);
    }
  }

  return selected.slice(0, limit);
};

const answerComboCheckQuestion = ({ message, limit }) => {
  const products = selectMentionedComboProducts({ message, limit });
  const total = products.reduce((sum, product) => sum + Number(product.sale_price || product.price || 0), 0);
  const compatibility = compatibilitySummary(products);
  const budget = parseBudget(message);
  const lines = products.map(
    (product) => `${product.category_name}: ${product.name} - ${formatMoney(product.sale_price)}${availabilityNote(product)}`
  );
  const budgetNote = budget
    ? total <= budget
      ? `Tổng tạm tính ${formatMoney(total)}, nằm trong ngân sách ${formatMoney(budget)}.`
      : `Tổng tạm tính ${formatMoney(total)}, đang vượt ngân sách ${formatMoney(budget)}.`
    : `Tổng tạm tính ${formatMoney(total)}.`;
  const reply = products.length
    ? `Mình tìm thấy ${products.length} linh kiện trong catalog:\n${lines.join("\n")}\n${budgetNote}\nKiểm tra tương thích: ${compatibility.notes.join(" ")}`
    : "Mình chưa nhận diện được đủ linh kiện trong catalog để kiểm tra combo. Bạn gửi tên CPU, mainboard, RAM, VGA hoặc SSD cụ thể hơn nhé.";

  return {
    question: message,
    source: "combo_check_skill",
    reply,
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      category_name: product.category_name,
      brand: product.brand,
      price: product.price,
      sale_price: product.sale_price,
      discount_percent: product.discount_percent,
      stock: product.stock,
      image_url: product.image_url,
    })),
    debug: {
      budget,
      tokens: tokenize(message),
      categories: products.map((product) => normalize(product.category_name || "")),
      retrievalSource: "skill_combo_check",
      total,
      compatibility,
    },
  };
};

const inferCheapBudget = ({ message, categories }) => {
  if (!/(\bcheap\b|\bre\b|\bgia re\b|\bgia tot\b)/.test(normalize(message))) return null;
  const caps = {
    cpu: 5000000,
    ram: 5000000,
    ssd: 6000000,
    vga: 15000000,
    mainboard: 3000000,
  };
  const category = categories?.[0];
  return category ? caps[category] || null : null;
};

const getResponseProducts = ({ message, products, budget, tokens }) => {
  const categories = detectCategory(message);
  const effectiveBudget = budget || inferCheapBudget({ message, categories });
  const categoryFiltered =
    categories.length > 0 && !isBuildQuestion(message)
      ? products.filter((product) => categories.includes(normalize(product.category_name || "")))
      : products;

  let hardTokens = getHardTokens(tokens);
  if (categories.length === 1 && categories[0] === "mainboard" && /(can main|co main|main .*nao|mainboard cho|main cho)/.test(normalize(message))) {
    hardTokens = hardTokens.filter((token) => !/^(i3|i5|i7|i9|ryzen|intel|amd|\d{4}f|\d{4}k|\d{4})$/.test(token));
  }
  if (isBuildQuestion(message)) {
    const buildCandidates = selectBuildCandidatesFromCatalog({ message, budget: effectiveBudget });
    return buildCandidates.length ? buildCandidates : categoryFiltered;
  }

  if (!effectiveBudget) {
    if (!hardTokens.length) return categoryFiltered;
    const strictProducts = categoryFiltered.filter((product) => productMatchesHardTokens({ product, hardTokens }));
    return strictProducts.length ? strictProducts : categoryFiltered;
  }

  const affordable = categoryFiltered.filter((product) => Number(product.sale_price || product.price || 0) <= effectiveBudget);
  if (hardTokens.length === 0) return affordable;

  const strict = affordable.filter((product) => productMatchesHardTokens({ product, hardTokens }));

  const mustKeepHardTokens = hardTokens.some((token) =>
    ["nvme", "sata", "ddr4", "ddr5", "lga1700", "am5"].includes(token) ||
    /^\d+(gb|tb)$/.test(token) ||
    /^(intel|amd|ryzen|i3|i5|i7|i9|rtx|gtx)$/.test(token) ||
    /^[a-z]\d{3,4}$/.test(token) ||
    /^\d{4}$/.test(token)
  );
  if (strict.length || !mustKeepHardTokens) return strict.length ? strict : affordable;

  if (categories.length > 0) {
    return loadKnowledgeBase()
      .products.filter(
        (product) =>
          categories.includes(normalize(product.category_name || "")) &&
          Number(product.sale_price || product.price || 0) <= effectiveBudget &&
          productMatchesHardTokens({ product, hardTokens })
      )
      .slice(0, 20);
  }

  return strict;
};

const fallbackAnswer = ({ message, products, budget }) => {
  if (!products.length) {
    return "Mình chưa tìm thấy sản phẩm phù hợp trong dữ liệu shop. Bạn có thể nói rõ danh mục, ngân sách hoặc thông số cần tìm hơn một chút.";
  }

  if (isBuildQuestion(message)) {
    const total = products.reduce((sum, product) => sum + Number(product.sale_price || product.price || 0), 0);
    const workload = getWorkloadProfile(message);
    const lines = products
      .map(
        (product) =>
          `${product.category_name}: ${product.name} - ${formatMoney(product.sale_price)}${availabilityNote(product)}`
      )
      .join("\n");
    const budgetNote = budget
      ? total <= budget
        ? `Tổng tạm tính ${formatMoney(total)}, nằm trong ngân sách ${formatMoney(budget)}.`
        : `Tổng tạm tính ${formatMoney(total)}, đang vượt ngân sách ${formatMoney(budget)}.`
      : `Tổng tạm tính ${formatMoney(total)}.`;
    const compatibility = compatibilitySummary(products);
    const priorityNote = workload ? `\nUu tien theo muc dich: ${workload.guidance}` : "";
    return `Mình lọc được combo tham khảo từ dữ liệu shop:${priorityNote}\n${lines}\n${budgetNote} Kiểm tra tương thích: ${compatibility.notes.join(" ")}`;
  }

  const first = products[0];
  return `Mình tìm thấy ${products.length} sản phẩm liên quan. Gợi ý nổi bật: ${first.name}, giá ${formatMoney(first.sale_price)}.${availabilityNote(first) ? ` ${availabilityNote(first).replace(" - ", "")}.` : ""} Bạn có thể xem các thẻ sản phẩm trả về để chọn nhanh.`;
};

const findExactProductMention = (message) => {
  const kb = loadKnowledgeBase();
  const text = normalize(message);
  const minLength = getChatbotSkills().exact_product?.min_normalized_length || 12;
  return kb.products.find((product) => {
    const name = normalize(product.name || "");
    return name.length > minLength && text.includes(name);
  });
};

const selectCompatibilityProducts = ({ message, limit }) => {
  const kb = loadKnowledgeBase();
  const text = normalize(message);
  const categories = new Set();

  if (/(cpu|i3|i5|i7|i9|ryzen|intel|amd|socket|chipset|lga1700|am5)/.test(text)) {
    categories.add("CPU");
    categories.add("Mainboard");
  }
  if (/(ram|ddr4|ddr5|bo nho)/.test(text)) {
    categories.add("RAM");
    categories.add("Mainboard");
  }
  if (categories.size === 0) {
    ["CPU", "RAM", "Mainboard"].forEach((category) => categories.add(category));
  }

  const selected = [];
  const perCategory = Math.max(1, Math.floor(limit / categories.size));
  for (const category of categories) {
    const candidates = kb.products
      .filter(
        (product) =>
          normalize(product.category_name || "") === normalize(category) &&
          Number(product.stock || 0) > 0
      )
      .sort((a, b) => Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0))
      .slice(0, perCategory);
    selected.push(...candidates);
  }

  return selected.slice(0, limit);
};

const callGemini = async ({ message, products, budget }) => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!products.length) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  const prompt = `
Bạn là trợ lý tư vấn linh kiện máy tính cho website thương mại điện tử.
Chỉ dùng dữ liệu shop bên dưới. Không bịa sản phẩm, giá, tồn kho, mã giảm giá.
Trả lời tiếng Việt, ngắn gọn, có lý do chọn sản phẩm. Nếu build PC, nhắc cần kiểm tra socket/chipset khi dữ liệu chưa đủ.

Câu hỏi: ${message}
Ngân sách nhận diện được: ${budget ? formatMoney(budget) : "không rõ"}

Dữ liệu shop:
${JSON.stringify(buildContext(products), null, 2)}

Yêu cầu:
- Không quá 180 từ.
- Không cần nêu tồn kho nếu sản phẩm còn hàng; chỉ báo rõ khi hết hàng.
- Neu nguoi dung neu muc dich su dung, phai noi ro thu tu uu tien linh kien theo muc dich truoc khi chot san pham: gaming uu tien VGA, CPU, RAM, SSD; render/edit uu tien CPU, RAM, SSD, VGA; AI uu tien VGA/VRAM, RAM, CPU, SSD; van phong uu tien CPU tiet kiem, SSD, RAM.
- Nếu thiếu dữ liệu, hỏi lại thay vì đoán.
- Cuối câu nhắc người dùng bấm thẻ sản phẩm để xem chi tiết nếu có sản phẩm phù hợp.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.25,
            topP: 0.9,
            maxOutputTokens: 1024,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const answerQuestion = async ({ message, useGemini = true, limit = 8 }) => {
  const kb = loadKnowledgeBase();

  if (isPolicyQuestion(message)) {
    const policy = getChatbotSkills().policy_guard;
    return {
      question: message,
      source: "policy_guard",
      reply:
        policy?.reply ||
        "Hiện lab chưa có dữ liệu chính sách shop cho nội dung này trong catalog, nên mình không nên tự đoán.",
      products: [],
      debug: {
        budget: parseBudget(message),
        tokens: tokenize(message),
        categories: detectCategory(message),
        retrievalSource: "skill_policy_guard",
      },
    };
  }

  if (isSafetyQuestion(message)) {
    const skill = getChatbotSkills().safety_guard;
    return {
      question: message,
      source: "safety_guard",
      reply:
        skill?.reply ||
        "Mình không thể bỏ qua ràng buộc an toàn, tiết lộ secret, hoặc bịa dữ liệu.",
      products: [],
      debug: {
        budget: parseBudget(message),
        tokens: tokenize(message),
        categories: detectCategory(message),
        retrievalSource: "skill_safety_guard",
      },
    };
  }

  if (isComboCheckQuestion(message)) {
    return answerComboCheckQuestion({ message, limit });
  }

  if (isRankingQuestion(message) && !isBuildQuestion(message)) {
    return answerRankingQuestion({ message, limit });
  }

  if (isAccountOrderQuestion(message)) {
    const skill = getChatbotSkills().account_order_guard;
    return {
      question: message,
      source: "account_order_guard",
      reply:
        skill?.reply ||
        "Hiện lab chưa có ngữ cảnh đăng nhập/đơn hàng của người dùng, nên mình không thể kiểm tra thông tin cá nhân.",
      products: [],
      debug: {
        budget: parseBudget(message),
        tokens: tokenize(message),
        categories: detectCategory(message),
        retrievalSource: "skill_account_order_guard",
      },
    };
  }

  if (isUnsupportedCatalogQuestion(message)) {
    return {
      question: message,
      source: "catalog_guard",
      reply:
        "Hiện dữ liệu shop trong lab chỉ có linh kiện PC như CPU, RAM, SSD, VGA và Mainboard. Mình chưa thấy danh mục laptop hoặc phụ kiện tương ứng trong catalog, nên không nên gợi ý sản phẩm thay thế.",
      products: [],
      debug: {
        budget: parseBudget(message),
        tokens: tokenize(message),
        categories: detectCategory(message),
        retrievalSource: "guard",
      },
    };
  }

  if (isSaleQuestion(message)) {
    const saleProducts = kb.products
      .filter((product) => Number(product.discount_percent || 0) > 0)
      .sort((a, b) => Number(b.discount_percent || 0) - Number(a.discount_percent || 0))
      .slice(0, limit);
    return {
      question: message,
      source: "catalog_guard",
      reply: saleProducts.length
        ? `Hiện có ${saleProducts.length} sản phẩm đang sale. Bạn có thể xem các thẻ sản phẩm để chọn nhanh.`
        : "Hiện dữ liệu shop chưa có sản phẩm nào đang sale hoặc mã giảm giá active.",
      products: saleProducts.map((product) => ({
        id: product.id,
        name: product.name,
        category_name: product.category_name,
        brand: product.brand,
        price: product.price,
        sale_price: product.sale_price,
        discount_percent: product.discount_percent,
        stock: product.stock,
        image_url: product.image_url,
      })),
      debug: {
        budget: parseBudget(message),
        tokens: tokenize(message),
        categories: detectCategory(message),
        retrievalSource: "guard",
      },
    };
  }

  const exactProduct = findExactProductMention(message);
  if (exactProduct) {
    return {
      question: message,
      source: "exact_match",
      reply: `${exactProduct.name}, gi? ${formatMoney(exactProduct.sale_price)}.${availabilityNote(exactProduct) ? ` ${availabilityNote(exactProduct).replace(" - ", "")}.` : ""} B?n c? th? b?m th? s?n ph?m ?? xem chi ti?t.`,
      products: [
        {
          id: exactProduct.id,
          name: exactProduct.name,
          category_name: exactProduct.category_name,
          brand: exactProduct.brand,
          price: exactProduct.price,
          sale_price: exactProduct.sale_price,
          discount_percent: exactProduct.discount_percent,
          stock: exactProduct.stock,
          image_url: exactProduct.image_url,
        },
      ],
      debug: {
        budget: parseBudget(message),
        tokens: tokenize(message),
        categories: [normalize(exactProduct.category_name || "")],
        retrievalSource: "exact_match",
      },
    };
  }

  if (isCompatibilityQuestion(message)) {
    const products = selectCompatibilityProducts({ message, limit });
    const suffix =
      getChatbotSkills().compatibility?.reply_suffix ||
      "Cần kiểm tra socket/chipset và chuẩn RAM trước khi chốt.";
    return {
      question: message,
      source: "compatibility_skill",
      reply: products.length
        ? `Mình lọc các linh kiện liên quan để kiểm tra tương thích. ${suffix}`
        : `Mình chưa tìm thấy linh kiện phù hợp để kiểm tra tương thích. ${suffix}`,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        category_name: product.category_name,
        brand: product.brand,
        price: product.price,
        sale_price: product.sale_price,
        discount_percent: product.discount_percent,
        stock: product.stock,
        image_url: product.image_url,
      })),
      debug: {
        budget: parseBudget(message),
        tokens: tokenize(message),
        categories: detectCategory(message),
        retrievalSource: "skill_compatibility",
      },
    };
  }

  if (isSalesAdvisoryQuestion(message) && !isBuildQuestion(message)) {
    return answerSalesAdvisoryQuestion({ message, limit });
  }

  if (isCheapBrowseQuestion(message)) {
    const products = kb.products
      .filter((product) => Number(product.stock || 0) > 0)
      .sort((a, b) => Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0))
      .slice(0, limit);
    return {
      question: message,
      source: "catalog_guard",
      reply: products.length
        ? `Mình gợi ý ${products.length} sản phẩm giá tốt nhất đang còn hàng. Mẫu rẻ nhất là ${products[0].name}, giá ${formatMoney(products[0].sale_price)}.`
        : "Hiện chưa có sản phẩm còn hàng trong dữ liệu shop.",
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        category_name: product.category_name,
        brand: product.brand,
        price: product.price,
        sale_price: product.sale_price,
        discount_percent: product.discount_percent,
        stock: product.stock,
        image_url: product.image_url,
      })),
      debug: {
        budget: parseBudget(message),
        tokens: tokenize(message),
        categories: detectCategory(message),
        retrievalSource: "guard",
      },
    };
  }

  const perCategory = isBuildQuestion(message);
  const retrieval = await retrieveHybridProducts({ message, limit, perCategory });
  const responseProducts = getResponseProducts({
    message,
    products: retrieval.products,
    budget: retrieval.budget,
    tokens: retrieval.tokens,
  });
  const geminiAnswer = useGemini
    ? await callGemini({
        message,
        products: retrieval.products,
        budget: retrieval.budget,
      })
    : null;

  return {
    question: message,
    source: geminiAnswer ? "gemini_rag" : "local_rag",
    reply:
      geminiAnswer ||
      fallbackAnswer({
        message,
        products: responseProducts,
        budget: retrieval.budget,
      }),
    products: responseProducts.map((product) => ({
      id: product.id,
      name: product.name,
      category_name: product.category_name,
      brand: product.brand,
      price: product.price,
      sale_price: product.sale_price,
      discount_percent: product.discount_percent,
      stock: product.stock,
      image_url: product.image_url,
    })),
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
  answerQuestion,
  buildContext,
  detectCategory,
  formatMoney,
  isBuildQuestion,
  loadKnowledgeBase,
  normalize,
  parseBudget,
  retrieveHybridProducts,
  retrieveProducts,
  retrieveVectorProducts,
  tokenize,
  getTuningConfig,
  loadTuningConfig,
  getChatbotSkills,
  loadChatbotSkills,
};
