"use strict";

const { getTuningConfig, getChatbotSkills } = require("./catalog");


// Stop words & normalize

const STOP_WORDS = new Set([
  "toi", "minh", "ban", "can", "tim", "mua", "san", "pham", "hang", "co",
  "khong", "cho", "hoi", "tu", "van", "gia", "duoi", "trieu", "dang",
  "sale", "giam", "khuyen", "mai", "tren", "tam", "khoang", "may", "cai",
  "mot", "la", "nao", "nhe", "nha", "for", "me", "need", "recommend",
  "under", "cheap", "best", "or", "hoac", "uu", "tien", "neu", "json",
  "cac", "bang", "liet", "ke", "tom", "tat", "ngan", "gon",
]);

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
    .replace(/\b(buiild|biuld|buid|buildd)\b/g, "build")
    .replace(/\b(gmaing|gamming|gamin)\b/g, "gaming")
    .replace(/\b(\d{4})\s*ti\b/g, "$1 ti")
    .replace(/\b(\d+)\s*g\b/g, "$1gb")
    .replace(/\b(\d+)\s*t\b/g, "$1tb")
    .replace(/a+o+/g, (m) => m.length > 2 ? "ao" : m);

// Tokenize

const tokenize = (value) =>
  normalize(value)
    .split(/[^a-z0-9]+/i)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !STOP_WORDS.has(item));


// Budget parser

const parseBudget = (message) => {
  const normalized = normalize(message).replace(/,/g, ".");

  const slangMatches = [
    ...normalized.matchAll(/(?<![a-z0-9])(\d+(?:\.\d+)?)\s*chuc(?:\s*cu|\s*trieu)?(?![a-z0-9])/g),
  ];
  const slangAmounts = slangMatches.map((m) => {
    const v = Number(m[1]);
    return Number.isFinite(v) && v > 0 ? v * 10000000 : null;
  }).filter(Boolean);
  if (slangAmounts.length) return Math.max(...slangAmounts);

  const tram = normalized.match(/(?<![a-z0-9])(\d+(?:\.\d+)?)\s*tram(?:\s*trieu)?(?![a-z0-9])/);
  if (tram) {
    const v = Number(tram[1]);
    if (Number.isFinite(v) && v > 0) return v * 100000000;
  }

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


// Category detection

const hasTerm = (message, term) => {
  const text = normalize(message);
  const normalizedTerm = normalize(term);
  if (normalizedTerm.includes(" ")) return text.includes(normalizedTerm);
  return new RegExp(`(^|[^a-z0-9])${normalizedTerm}([^a-z0-9]|$)`).test(text);
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

// Question classifiers

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

const isCasualQuestion = (message) => {
  const text = normalize(message);
  const hasCasual = /(chao shop|xin chao|shop oi chao|chao ban|hi shop|hey shop|tam biet|bye|chuc mung|cam on shop|cam on ban|cam on nhieu|thank|thanks|tat|cho minh hoi|shop co dang lam viec|shop co lam viec)/.test(text);
  if (!hasCasual) return false;
  const hasProductIntent = /(cpu|ram|ssd|vga|mainboard|rtx|gtx|ryzen|intel|amd|build|combo|mua|gia|giam|san pham)/.test(text);
  return !hasProductIntent;
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
  const hasRankingTerm = Boolean(skill?.terms?.some((term) => hasTerm(message, term))) || /^\s*\d+\s+(cpu|ram|ssd|vga|mainboard|main|card|chip|o cung)/.test(text);
  const isSpeedRanking = /(toc do doc ghi cao nhat|toc do nhanh nhat|doc ghi nhanh nhat|nhanh nhat trong shop|cao nhat trong shop|toc do cao nhat)/.test(text) && /(ssd|o cung|nvme)/.test(text);
  return hasRankingTerm || isSpeedRanking;
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
  const asksCompatibility = /(\bhop\b|hop nhau|on khong|di duoc|di voi|duoc khong|hop khong|dung voi|tuong thich|\btong\b|\bcombo\b|kiem tra|check|lap may|thieu)/.test(text);
  const explicitBuildCombo = /(build|cau hinh)/.test(text) && /(nay|gom|voi|dung voi)/.test(text) && specificModel;
  if (categories.length < 2 && !explicitComboIntent) return false;
  return hasComboTerm || (categories.length >= 2 && specificModel && asksCompatibility) || explicitBuildCombo;
};

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

const isAioCoolerQuestion = (message) => {
  const text = normalize(message);
  return /(tan nhiet nuoc|aio|tan nuoc|liquid cool|water cool|tan khi|fan cpu|cpu cooler|tan nhiet roi)/.test(text) &&
    !/(cpu|vga|mainboard|ram|ssd|rtx|build|combo)/.test(text);
};

const isUnsupportedCatalogQuestion = (message) =>
  !normalize(message).includes("card man hinh") &&
  (detectDirectCategory(message).length === 0 || (normalize(message).includes("laptop") && detectDirectCategory(message).includes("ram"))) &&
  getTuningConfig().unsupported_terms.some((term) => hasTerm(message, term));

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

const rankingLimit = (message, fallback) => {
  const match = normalize(message).match(/\btop\s*(\d+)|\b(\d+)\s*(san pham|mau|cpu|ram|ssd|vga|mainboard|main)?/);
  const value = Number(match?.[1] || match?.[2] || 0);
  return value > 0 ? Math.min(value, 20) : fallback;
};

const shouldUseHistoryContext = (message, history = []) => {
  if (!history.length) return false;
  const text = normalize(message);
  return /(cai|con|mau|san pham (nay|do)|do|nay|no|tren|truoc|vua|so voi|re hon|dat hon|tot hon|doi sang|thay bang|cau hinh tren|combo tren)/.test(text);
};

// Swap intent detection (for router)

const detectSwapIntent = (message, history) => {
  if (!history.length) return null;
  const text = normalize(message);
  const lastAssistant = [...history].reverse().find(
    (item) => item.role === "assistant" && Array.isArray(item.products) && item.products.length >= 1
  );
  if (!lastAssistant) return null;
  const hasSwapKeyword = /(doi|thay|khac|khong lay|bo|swap)\b/.test(text);
  if (!hasSwapKeyword) return null;

  const categories = detectDirectCategory(message);
  if (categories.length === 0) {
    if (/(card|vga|gpu|do hoa)/.test(text)) categories.push("vga");
    if (/(chip|cpu|vi xu ly)/.test(text)) categories.push("cpu");
    if (/(main|mainboard|bo mach)/.test(text)) categories.push("mainboard");
    if (/(ram|bo nho)/.test(text)) categories.push("ram");
    if (/(ssd|o cung)/.test(text)) categories.push("ssd");
  }
  if (categories.length === 0) return null;
  return { previousProducts: lastAssistant.products, swapCategories: categories };
};

module.exports = {
  STOP_WORDS,
  normalize,
  tokenize,
  parseBudget,
  hasTerm,
  detectDirectCategory,
  detectCategory,
  isBuildQuestion,
  isSaleQuestion,
  isCasualQuestion,
  isPolicyQuestion,
  isAccountOrderQuestion,
  isSafetyQuestion,
  isRankingQuestion,
  isSalesAdvisoryQuestion,
  isComboCheckQuestion,
  isCompatibilityQuestion,
  isAioCoolerQuestion,
  isUnsupportedCatalogQuestion,
  isCheapBrowseQuestion,
  salesIntentKind,
  complementaryCategories,
  rankingLimit,
  shouldUseHistoryContext,
  detectSwapIntent,
};
