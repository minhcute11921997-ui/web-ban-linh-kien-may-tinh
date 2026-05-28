"use strict";

const { loadKnowledgeBase, formatMoney, availabilityNote, getTuningConfig } = require("./shared/catalog");
const {
  normalize,
  tokenize,
  parseBudget,
  detectCategory,
  isBuildQuestion,
} = require("./shared/nlp");
const { specText, mentionedProductScore } = require("./shared/scoring");
const {
  getCpuSocket,
  getMainboardSocket,
  getRamStandard,
  getMainboardRamStandard,
  isCompatibleComboGlobal,
  compatibilitySummary,
} = require("./shared/compat");

// ---------------------------------------------------------------------------
// Workload profiles
// ---------------------------------------------------------------------------
const getWorkloadProfile = (message) => {
  const text = normalize(message);
  const budget = parseBudget(message);
  if (/(4k|2k|qhd|aaa|cyberpunk|gta|elden|game nang)/.test(text)) {
    return {
      name: "gaming_aaa",
      priorityCategories: ["VGA", "CPU", "RAM", "SSD", "Mainboard"],
      guidance: "Với game AAA/2K/4K, ưu tiên VGA và VRAM mạnh nhất trong ngân sách, sau đó CPU đủ kéo VGA, RAM 16GB trở lên và SSD để tải game nhanh.",
    };
  }
  if (/(esport|e-sport|fps|valorant|cs2|lol|lien minh|fo4|pubg)/.test(text)) {
    return {
      name: "gaming_esports",
      priorityCategories: ["CPU", "VGA", "RAM", "SSD", "Mainboard"],
      guidance: "Với game eSports/FPS, ưu tiên CPU ổn định xung cao để giữ FPS, VGA vừa đủ mức màn hình, RAM tối thiểu 16GB và SSD để vào trận nhanh.",
    };
  }
  if (/(choi game|gaming|full hd|fps|aaa|esport)/.test(text)) {
    return {
      name: "gaming",
      priorityCategories: ["VGA", "CPU", "RAM", "SSD", "Mainboard"],
      guidance: "Với nhu cầu chơi game, nên ưu tiên VGA mạnh nhất trong ngân sách trước, sau đó chọn CPU đủ kéo VGA, RAM tối thiểu 16GB và SSD để tải game nhanh.",
    };
  }
  if (/(edit video|video edit|render|dung phim|premiere|after effect|do hoa|autocad)/.test(text)) {
    return {
      name: "creator",
      priorityCategories: ["CPU", "RAM", "VGA", "SSD", "Mainboard"],
      guidance: "Với render/edit/đồ họa, nên ưu tiên CPU nhiều nhân, RAM dung lượng cao, SSD nhanh; VGA quan trọng nếu phần mềm tận dụng GPU.",
    };
  }
  if (/(machine learning|\bai\b|deep learning|train model|hoc ai)/.test(text)) {
    return {
      name: "ai",
      priorityCategories: ["VGA", "RAM", "CPU", "SSD", "Mainboard"],
      guidance: "Với AI/machine learning, nên ưu tiên VGA mạnh và VRAM lớn, sau đó RAM hệ thống, CPU ổn định và SSD đủ nhanh để đọc dữ liệu.",
    };
  }
  if (/(livestream|stream)/.test(text)) {
    return {
      name: "stream",
      priorityCategories: ["CPU", "VGA", "RAM", "SSD", "Mainboard"],
      guidance: "Với livestream, nên ưu tiên CPU/VGA đủ khỏe để vừa chơi vừa encode, RAM tối thiểu 16GB và SSD để hệ thống phản hồi mượt.",
    };
  }
  if (/(lap trinh|code|dev|developer|visual studio|android studio)/.test(text)) {
    return {
      name: "programming",
      priorityCategories: ["CPU", "RAM", "SSD", "Mainboard"],
      guidance: "Với lập trình, ưu tiên CPU ổn định, RAM 16GB trở lên nếu chạy IDE/nhiều service, SSD nhanh; VGA rời thường không cần trừ khi làm AI/đồ họa.",
    };
  }
  if (/(van phong|hoc tap|hoc online|sinh vien|ke toan)/.test(text)) {
    return {
      name: "office",
      priorityCategories: budget && budget >= 30000000
        ? ["CPU", "SSD", "RAM", "Mainboard", "VGA"]
        : ["CPU", "SSD", "RAM", "Mainboard"],
      guidance: "Với văn phòng/học tập, nên ưu tiên cấu hình ổn định, CPU tiết kiệm, SSD cho tốc độ mở máy/ứng dụng và RAM đủ dùng; VGA rời thường chưa cần.",
    };
  }
  return null;
};

const getBuildCategoriesForMessage = (message) => {
  const text = normalize(message);
  const budget = parseBudget(message);
  const base = ["CPU", "RAM", "Mainboard", "SSD"];
  const hasGameNeed = /(gaming|choi game|valorant|cs2|lol|lien minh|pubg|fps|aaa|2k|4k)/.test(text);
  const officeOrStudy = /(van phong|hoc tap|sinh vien|ke toan)/.test(text);
  const needsVga =
    (hasGameNeed ||
      /(vga|gpu|card man hinh|render|do hoa|autocad|livestream|stream|edit video|video edit|dung phim|machine learning|\bai\b|photoshop|blender)/.test(text) ||
      (budget && budget >= 15000000)) &&
    (hasGameNeed || !officeOrStudy || (budget && budget >= 30000000));
  return needsVga ? ["CPU", "VGA", "RAM", "Mainboard", "SSD"] : base;
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

// ---------------------------------------------------------------------------
// detectBuildExclusionsAndOwned — detects components the user already has or wants to exclude
// ---------------------------------------------------------------------------
const detectBuildExclusionsAndOwned = (message) => {
  const text = normalize(message);
  const kb = loadKnowledgeBase();
  const tokens = tokenize(message);
  
  const categoryKeys = {
    CPU: ["cpu", "processor", "vi xu ly", "bo xu ly", "chip"],
    RAM: ["ram", "memory", "ddr4", "ddr5"],
    SSD: ["ssd", "o cung", "nvme", "sata"],
    VGA: ["vga", "gpu", "card do hoa", "card man hinh", "card"],
    Mainboard: ["mainboard", "bo mach chu", "motherboard", "main"],
  };

  const excluded = new Set();
  const owned = [];
  const ownedCategoryNames = new Set();

  const ownedKeywords = ["da co", "co san", "co roi", "tu mua", "xai lai", "dung lai", "mang qua", "dem qua"];

  for (const [catName, aliases] of Object.entries(categoryKeys)) {
    for (const alias of aliases) {
      const regexExcluded = new RegExp(`(?:khong\\s+can|khong\\s+lay|bo|loai\\s+bo|tru|chua|khong\\s+build|khong\\s+tinh|khong\\s+lap|khong\\s+kem|bo\\s+qua)\\s+(${alias})\\b|(?:${alias})\\s+(?:da\\s+co|co\\s+san|co\\s+roi|tu\\s+mua|dung\\s+lai|xai\\s+lai)`);
      const regexOwned = new RegExp(`(?:da\\s+co|co\\s+san|co\\s+roi|tu\\s+mua|dung\\s+lai|xai\\s+lai|mang\\s+qua|dem\\s+qua)\\s+(?:them\\s+)?(?:cai\\s+|con\\s+|chiec\\s+)?(${alias})\\b`);
      
      if (regexExcluded.test(text) || regexOwned.test(text)) {
        excluded.add(catName);
        if (regexOwned.test(text) || /da\s+co|co\s+san|co\s+roi|tu\s+mua/.test(text)) {
          ownedCategoryNames.add(catName);
        }
      }
    }
  }

  const cleanText = text.replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ");

  for (const product of kb.products) {
    const prodName = normalize(product.name || "");
    const cleanProdName = prodName
      .replace(/cpu\s+/g, "")
      .replace(/vga\s+/g, "")
      .replace(/ram\s+/g, "")
      .replace(/mainboard\s+/g, "")
      .replace(/ssd\s+/g, "")
      .replace(/intel\s+core\s+/g, "")
      .replace(/amd\s+ryzen\s+/g, "")
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const cleanFullProdName = prodName.replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ");

    const isMentioned = (cleanProdName.length > 5 && cleanText.includes(cleanProdName)) || 
                        (cleanFullProdName.length > 5 && cleanText.includes(cleanFullProdName));

    if (isMentioned) {
      const matchedTerm = cleanProdName.length > 5 && cleanText.includes(cleanProdName) ? cleanProdName : cleanFullProdName;
      const idx = cleanText.indexOf(matchedTerm);
      const contextBefore = cleanText.slice(Math.max(0, idx - 35), idx);
      const contextAfter = cleanText.slice(idx + matchedTerm.length, idx + 50);
      
      const isOwnedContext = ownedKeywords.some(kw => contextBefore.includes(kw) || contextAfter.includes(kw)) ||
                             ownedCategoryNames.has(product.category_name);
      
      if (isOwnedContext) {
        if (!owned.some(p => p.category_name === product.category_name)) {
          owned.push(product);
          excluded.add(product.category_name);
        }
      }
    }
  }

  for (const catName of ownedCategoryNames) {
    if (owned.some(p => p.category_name === catName)) continue;
    const candidates = kb.products.filter(p => normalize(p.category_name) === normalize(catName));
    let bestProduct = null;
    let maxScore = 0;
    for (const p of candidates) {
      const score = mentionedProductScore({ product: p, tokens, text: normalize(message) });
      if (score > maxScore) {
        maxScore = score;
        bestProduct = p;
      }
    }
    if (bestProduct && maxScore >= 12) {
      owned.push(bestProduct);
    }
  }

  return {
    excludedCategories: [...excluded],
    ownedProducts: owned
  };
};

const resolveOwnedProducts = (intent, kb, message) => {
  const ownedProducts = [];
  if (intent && Array.isArray(intent.ownedComponents)) {
    const tokens = tokenize(message);
    for (const comp of intent.ownedComponents) {
      if (!comp.model) continue;
      const candidates = kb.products.filter(p => normalize(p.category_name) === normalize(comp.category));
      let bestProduct = null;
      let maxScore = 0;
      for (const p of candidates) {
        const score = mentionedProductScore({ product: p, tokens, text: normalize(comp.model) }) || 0;
        if (score > maxScore) {
          maxScore = score;
          bestProduct = p;
        }
      }
      if (bestProduct) {
        ownedProducts.push(bestProduct);
      }
    }
  }
  return ownedProducts;
};

// ---------------------------------------------------------------------------
// selectBuildCandidatesFromCatalog — picks best compatible combo
// ---------------------------------------------------------------------------
const selectBuildCandidatesFromCatalog = ({ message, budget, intent = null }) => {
  if (!isBuildQuestion(message)) return [];

  const kb = loadKnowledgeBase();
  
  let excludedCategories = [];
  let ownedProducts = [];

  if (intent) {
    excludedCategories = intent.excludedCategories || [];
    ownedProducts = resolveOwnedProducts(intent, kb, message);
  } else {
    const fallback = detectBuildExclusionsAndOwned(message);
    excludedCategories = fallback.excludedCategories;
    ownedProducts = fallback.ownedProducts;
  }
  
  let categories = getBuildCategoriesForMessage(message);
  categories = categories.filter(c => !excludedCategories.includes(c));
  
  if (categories.length === 0) return [];

  const workload = getWorkloadProfile(message);
  const priority = workload?.priorityCategories || categories;

  const config = getTuningConfig();
  const sumShares = categories.reduce((sum, c) => sum + (config.budget_share[c] || 0.2), 0);

  const byCategory = (category) => {
    const list = kb.products.filter(
      (product) =>
        normalize(product.category_name || "") === normalize(category) &&
        Number(product.stock || 0) > 0
    );
    if (!list.length) return [];
    if (budget) {
      const origShare = config.budget_share[category] || 0.2;
      const share = sumShares > 0 ? (origShare / sumShares) : origShare;
      const target = budget * share;
      const cheapest = [...list].sort((a, b) => Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0));
      const closestToTarget = [...cheapest].sort((a, b) => {
        const priceA = Number(a.sale_price || a.price || 0);
        const priceB = Number(b.sale_price || b.price || 0);
        const diffA = Math.abs(priceA - target);
        const diffB = Math.abs(priceB - target);
        const aUnder = priceA <= target;
        const bUnder = priceB <= target;
        if (aUnder !== bUnder) return aUnder ? -1 : 1;
        return diffA - diffB;
      });
      const premiumWithinBudget = [...cheapest]
        .filter((item) => Number(item.sale_price || item.price || 0) <= budget)
        .sort((a, b) => Number(b.sale_price || b.price || 0) - Number(a.sale_price || a.price || 0))
        .slice(0, 4);
      const merged = [];
      const seen = new Set();
      for (const item of [...closestToTarget.slice(0, 6), ...premiumWithinBudget, ...cheapest]) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
        if (merged.length >= 9) break;
      }
      return merged;
    }
    return list.sort((a, b) => Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0));
  };

  const candidateMap = Object.fromEntries(categories.map((category) => [category, byCategory(category)]));
  const requiredCategories = categories.filter((category) => candidateMap[category]?.length);
  if (!requiredCategories.length) return [];

  const isCompatibleCombo = (items) => {
    const allItems = [...items, ...ownedProducts];
    const cpu = allItems.find((product) => normalize(product.category_name || "") === "cpu");
    const ram = allItems.find((product) => normalize(product.category_name || "") === "ram");
    const mainboard = allItems.find((product) => normalize(product.category_name || "") === "mainboard");
    if (cpu && mainboard) {
      const cpuSocket = getCpuSocket(cpu);
      const mainSocket = getMainboardSocket(mainboard);
      if (cpuSocket && mainSocket && cpuSocket !== mainSocket) return false;
    }
    if (ram && mainboard) {
      const ramStandard = getRamStandard(ram);
      const mainRam = getMainboardRamStandard(mainboard);
      if (ramStandard && mainRam && ramStandard !== mainRam) return false;
    }
    return true;
  };

  const productValueScore = (product) => {
    const text = normalize(`${product.name || ""} ${specText(product)}`);
    const category = product.category_name;
    let score = 0;
    if (priority[0] === category) score += 8;
    if (priority[1] === category) score += 4;
    if (category === "VGA" && /(geforce|gaming|rtx 30|rtx 40|rtx 50|gtx)/.test(text) && !/(rtx pro|workstation)/.test(text)) score += 8;
    if (category === "VGA" && /(rtx pro|workstation|quadro)/.test(text)) score -= workload?.name === "ai" ? 4 : 35;
    if (category === "VGA") {
      const model = text.match(/\brtx\s*(\d{4})(?:\s*ti)?/)?.[1];
      const modelScore = workload?.name === "office"
        ? {
            "5080": -14,
            "4070": 12,
            "5060": /ti/.test(text) ? 16 : 12,
            "4060": /ti/.test(text) ? 14 : 10,
            "3050": 5,
          }
        : {
            "5080": 55,
            "4070": 38,
            "5060": /ti/.test(text) ? 31 : 24,
            "4060": /ti/.test(text) ? 23 : 16,
            "3050": 8,
          };
      if (model && modelScore[model]) score += modelScore[model];
    }
    if (category === "RAM" && /(16gb|1 x 16gb|2 x 8gb)/.test(text)) score += 4;
    if (category === "RAM" && workload?.name === "office" && budget && budget >= 60000000) {
      if (/(2 x 32gb|64gb)/.test(text)) score += 22;
      else if (/(1 x 32gb|32gb)/.test(text)) score += 12;
    }
    if (category === "RAM" && /(2 x 64gb|128gb)/.test(text) && !/(creator|ai|render)/.test(workload?.name || "")) score -= 35;
    if (category === "SSD" && /(nvme|m\.2|pcie)/.test(text)) score += 3;
    return score + Math.min(3, Number(product.total_sold || 0));
  };

  const comboScore = ({ items, total, value }) => {
    if (!budget) return value - total / 10000000;
    const spendByCategory = Object.fromEntries(
      items.map((product) => [product.category_name, Number(product.sale_price || product.price || 0)])
    );
    const utilization = Math.min(total / budget, 1);
    const utilizationWeight = workload?.name === "office" && budget >= 60000000 ? 95 : 25;
    let score = value * 10 + utilization * utilizationWeight;

    for (const [category, price] of Object.entries(spendByCategory)) {
      const share = price / budget;
      let cap = 0.28;
      if (category === priority[0]) cap = 0.7;
      else if (category === priority[1]) cap = 0.42;
      else if (category === "VGA" && workload?.name === "office") cap = 0.24;
      else if (category === "RAM") cap = workload?.name === "creator" || workload?.name === "ai" || (workload?.name === "office" && budget >= 60000000) ? 0.38 : 0.22;
      else if (category === "SSD") cap = 0.24;
      else if (category === "Mainboard") cap = 0.2;
      if (share > cap) score -= (share - cap) * 180;
    }

    const firstPrioritySpend = spendByCategory[priority[0]] || 0;
    if (firstPrioritySpend > 0) score += (firstPrioritySpend / budget) * 35;
    return score;
  };

  const combos = [];
  const walk = (index, current) => {
    if (index === requiredCategories.length) {
      if (isCompatibleCombo(current)) combos.push([...current]);
      return;
    }
    const category = requiredCategories[index];
    for (const product of candidateMap[category]) {
      current.push(product);
      walk(index + 1, current);
      current.pop();
    }
  };
  walk(0, []);

  if (combos.length) {
    const priced = combos
      .map((items) => {
        const total = items.reduce((sum, product) => sum + Number(product.sale_price || product.price || 0), 0);
        const value = items.reduce((sum, product) => sum + productValueScore(product), 0);
        return { items, total, value };
      })
      .sort((a, b) => {
        if (budget) {
          const aUnder = a.total <= budget;
          const bUnder = b.total <= budget;
          if (aUnder !== bUnder) return aUnder ? -1 : 1;
          if (!aUnder && a.total !== b.total) return a.total - b.total;
          return comboScore(b) - comboScore(a) || b.total - a.total;
        }
        return b.value - a.value || a.total - b.total;
      });
    return priced[0].items;
  }

  // Fallback: pick cheapest per category
  const selected = [];
  for (const category of categories) {
    const items = kb.products
      .filter(
        (product) =>
          normalize(product.category_name || "") === normalize(category) &&
          Number(product.stock || 0) > 0
      )
      .sort((a, b) => Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0));
    if (!items.length) continue;
    selected.push(items[0]);
  }
  return selected;
};

// ---------------------------------------------------------------------------
// Swap intent handler — user asks to swap a component in previous combo
// ---------------------------------------------------------------------------
const handleSwapIntent = ({ message, history, swapIntent, kb }) => {
  const text = normalize(message);
  const budget = parseBudget(message) || parseBudget(history.map((h) => h.text || "").join(" ")) || 100000000;

  const KNOWN_BRANDS = ["asus", "msi", "gigabyte", "colorful", "pny", "inno3d", "palit", "kingston", "corsair", "adata", "transcend", "samsung", "crucial", "g.skill", "patriot", "intel", "amd"];
  const forbiddenBrands = [];
  const positiveBrands = [];
  for (const brand of KNOWN_BRANDS) {
    if (text.includes(brand)) {
      const index = text.indexOf(brand);
      const before = text.slice(Math.max(0, index - 20), index);
      if (/(khong thich|khong lay|tranh|bo|ghet|khong muon|loai bo)\b/.test(before)) {
        forbiddenBrands.push(brand);
      } else {
        positiveBrands.push(brand);
      }
    }
  }

  let swapCategories = [...swapIntent.swapCategories];
  let previousProducts = swapIntent.previousProducts;
  let loopCount = 0;

  // Propagate compatibility constraints
  while (loopCount < 5) {
    loopCount++;
    const keptProducts = previousProducts.filter((p) => !swapCategories.includes(normalize(p.category_name || "")));
    let newIncompatibleFound = false;
    const tempUpdated = [...keptProducts];

    for (const swapCat of swapCategories) {
      const prevProd = previousProducts.find((p) => normalize(p.category_name || "") === normalize(swapCat));
      const candidates = kb.products.filter((p) => {
        if (normalize(p.category_name || "") !== normalize(swapCat)) return false;
        if (Number(p.stock || 0) <= 0) return false;
        return true;
      });
      let filtered = candidates;
      if (swapCat === "cpu" && positiveBrands.includes("intel")) {
        filtered = candidates.filter((p) => normalize(p.brand || p.name).includes("intel"));
      } else if (swapCat === "cpu" && positiveBrands.includes("amd")) {
        filtered = candidates.filter((p) => normalize(p.brand || p.name).includes("amd"));
      } else if (positiveBrands.length > 0) {
        filtered = candidates.filter((p) => {
          const brandText = normalize(p.brand || p.name || "");
          return positiveBrands.some((b) => brandText.includes(b));
        });
      }
      if (filtered.length > 0) {
        filtered.sort((a, b) => Number(b.sale_price || b.price || 0) - Number(a.sale_price || a.price || 0));
        tempUpdated.push(filtered[0]);
      } else if (prevProd) {
        tempUpdated.push(prevProd);
      }
    }

    const cpu = tempUpdated.find((p) => normalize(p.category_name || "") === "cpu");
    const mainboard = tempUpdated.find((p) => normalize(p.category_name || "") === "mainboard");
    const ram = tempUpdated.find((p) => normalize(p.category_name || "") === "ram");

    if (cpu && mainboard) {
      const cpuSocket = getCpuSocket(cpu);
      const mainSocket = getMainboardSocket(mainboard);
      if (cpuSocket && mainSocket && cpuSocket !== mainSocket) {
        if (!swapCategories.includes("mainboard")) { swapCategories.push("mainboard"); newIncompatibleFound = true; }
        if (!swapCategories.includes("cpu")) { swapCategories.push("cpu"); newIncompatibleFound = true; }
      }
    }
    if (ram && mainboard) {
      const ramStandard = getRamStandard(ram);
      const mainRam = getMainboardRamStandard(mainboard);
      if (ramStandard && mainRam && ramStandard !== mainRam) {
        if (!swapCategories.includes("mainboard")) { swapCategories.push("mainboard"); newIncompatibleFound = true; }
        if (!swapCategories.includes("ram")) { swapCategories.push("ram"); newIncompatibleFound = true; }
      }
    }
    if (!newIncompatibleFound) break;
  }

  const keptProducts = previousProducts.filter((p) => !swapCategories.includes(normalize(p.category_name || "")));
  const keptSum = keptProducts.reduce((sum, p) => sum + Number(p.sale_price || p.price || 0), 0);
  const remainingBudget = budget - keptSum;
  const updatedProducts = [...keptProducts];
  let success = true;
  const swappedDetails = [];

  for (const swapCat of swapCategories) {
    const prevProd = previousProducts.find((p) => normalize(p.category_name || "") === normalize(swapCat));
    const candidates = kb.products.filter((p) => {
      if (normalize(p.category_name || "") !== normalize(swapCat)) return false;
      if (Number(p.stock || 0) <= 0) return false;
      if (prevProd && p.id === prevProd.id) return false;
      if (!isCompatibleComboGlobal([...updatedProducts, p])) return false;
      return true;
    });

    let brandFiltered = candidates;
    if (forbiddenBrands.length > 0) brandFiltered = brandFiltered.filter((p) => !forbiddenBrands.includes(normalize(p.brand || "")));

    let categoryPositiveBrands = [...positiveBrands];
    if (swapCat === "cpu" && positiveBrands.includes("intel")) {
      brandFiltered = brandFiltered.filter((p) => normalize(p.brand || p.name).includes("intel"));
      categoryPositiveBrands = positiveBrands.filter((b) => b === "intel");
    } else if (swapCat === "cpu" && positiveBrands.includes("amd")) {
      brandFiltered = brandFiltered.filter((p) => normalize(p.brand || p.name).includes("amd"));
      categoryPositiveBrands = positiveBrands.filter((b) => b === "amd");
    } else if (positiveBrands.length > 0) {
      const brandMatchExists = candidates.some((p) => {
        const brandText = normalize(p.brand || p.name || "");
        return positiveBrands.some((b) => brandText.includes(b));
      });
      if (brandMatchExists) {
        brandFiltered = candidates.filter((p) => {
          const brandText = normalize(p.brand || p.name || "");
          return positiveBrands.some((b) => brandText.includes(b));
        });
      }
    }

    const budgetFiltered = brandFiltered.filter((p) => Number(p.sale_price || p.price || 0) <= remainingBudget);
    const chosenList = budgetFiltered.length > 0 ? budgetFiltered : brandFiltered;

    if (chosenList.length > 0) {
      if (budgetFiltered.length > 0) {
        chosenList.sort((a, b) => Number(b.sale_price || b.price || 0) - Number(a.sale_price || a.price || 0) || Number(b.stock || 0) - Number(a.stock || 0));
      } else {
        chosenList.sort((a, b) => Number(a.sale_price || a.price || 0) - Number(b.sale_price || b.price || 0) || Number(b.stock || 0) - Number(a.stock || 0));
      }
      const chosen = chosenList[0];
      updatedProducts.push(chosen);
      swappedDetails.push(`đổi ${swapCat.toUpperCase()} sang ${chosen.name}`);
    } else if (candidates.length > 0 && categoryPositiveBrands.length > 0) {
      candidates.sort((a, b) => Number(b.sale_price || b.price || 0) - Number(a.sale_price || a.price || 0) || Number(b.stock || 0) - Number(a.stock || 0));
      const chosen = candidates[0];
      updatedProducts.push(chosen);
      swappedDetails.push(`đổi ${swapCat.toUpperCase()} sang hãng khác là ${chosen.name} (do hãng ${categoryPositiveBrands.join(" hoặc ").toUpperCase()} không có hoặc hết hàng)`);
    } else if (candidates.length > 0) {
      candidates.sort((a, b) => Number(b.sale_price || b.price || 0) - Number(a.sale_price || a.price || 0) || Number(b.stock || 0) - Number(a.stock || 0));
      const chosen = candidates[0];
      updatedProducts.push(chosen);
      swappedDetails.push(`đổi ${swapCat.toUpperCase()} sang ${chosen.name}`);
    } else {
      success = false;
    }
  }

  if (!success || swappedDetails.length === 0) return null;

  const order = ["CPU", "VGA", "RAM", "Mainboard", "SSD"];
  const orderedProducts = [];
  for (const cat of order) {
    const p = updatedProducts.find((prod) => normalize(prod.category_name || "") === normalize(cat));
    if (p) orderedProducts.push(p);
  }
  for (const p of updatedProducts) {
    if (!orderedProducts.some((op) => op.id === p.id)) orderedProducts.push(p);
  }

  const total = orderedProducts.reduce((sum, p) => sum + Number(p.sale_price || p.price || 0), 0);
  const lines = orderedProducts.map((p) => `${p.category_name}: ${p.name} - ${formatMoney(p.sale_price || p.price)}${availabilityNote(p)}`);
  const budgetNote = budget
    ? total <= budget
      ? `Tổng tạm tính ${formatMoney(total)}, nằm trong ngân sách ${formatMoney(budget)}.`
      : `Tổng tạm tính ${formatMoney(total)}, đang vượt ngân sách ${formatMoney(budget)}.`
    : `Tổng tạm tính ${formatMoney(total)}.`;
  const compatibility = compatibilitySummary(orderedProducts);

  return {
    tool: "build_pc.swap",
    question: message,
    source: "local_rag",
    reply: `Dạ mình đã cập nhật cấu hình theo yêu cầu (${swappedDetails.join(", ")}):\n${lines.join("\n")}\n${budgetNote} Kiểm tra tương thích: ${compatibility.notes.join(" ")}`,
    products: orderedProducts.map((p) => ({
      id: p.id, name: p.name, category_name: p.category_name, brand: p.brand,
      price: p.price, sale_price: p.sale_price, discount_percent: p.discount_percent,
      stock: p.stock, image_url: p.image_url,
    })),
    debug: {
      budget,
      tokens: tokenize(message),
      categories: swapCategories,
      retrievalSource: "history_swap_handler",
    },
  };
};

// ---------------------------------------------------------------------------
// buildPc — main entry point
// ---------------------------------------------------------------------------
const buildPc = async ({ message, history = [], limit = 8, swapIntent = null, intent = null }) => {
  const kb = loadKnowledgeBase();

  // Handle swap intent (change a component in a previous build)
  if (swapIntent) {
    const swapResult = handleSwapIntent({ message, history, swapIntent, kb });
    if (swapResult) return swapResult;
  }

  // Normal build recommendation
  const budget = intent && intent.budget !== undefined ? intent.budget : parseBudget(message);
  const buildProducts = selectBuildCandidatesFromCatalog({ message, budget, intent });
  const workload = getWorkloadProfile(message);
  
  let excludedCategories = [];
  let ownedProducts = [];
  if (intent) {
    excludedCategories = intent.excludedCategories || [];
    ownedProducts = resolveOwnedProducts(intent, kb, message);
  } else {
    const fallback = detectBuildExclusionsAndOwned(message);
    excludedCategories = fallback.excludedCategories;
    ownedProducts = fallback.ownedProducts;
  }

  if (!buildProducts.length) {
    return {
      tool: "build_pc",
      question: message,
      source: "local_rag",
      reply: "Mình chưa tìm được combo linh kiện phù hợp trong dữ liệu shop. Bạn có thể cho mình biết rõ hơn về ngân sách hoặc yêu cầu cụ thể không?",
      products: [],
      debug: { budget, tokens: tokenize(message), categories: getBuildCategoriesForMessage(message), retrievalSource: "build_pc" },
    };
  }

  const total = buildProducts.reduce((sum, p) => sum + Number(p.sale_price || p.price || 0), 0);
  const lines = buildProducts
    .map((p) => `${p.category_name}: ${p.name} - ${formatMoney(p.sale_price || p.price)}${availabilityNote(p)}`)
    .join("\n");

  const budgetNote = budget
    ? total <= budget
      ? `Tổng tạm tính ${formatMoney(total)}, nằm trong ngân sách ${formatMoney(budget)}.`
      : `Tổng tạm tính ${formatMoney(total)}, đang vượt ngân sách ${formatMoney(budget)}; đây là combo gần ngân sách nhất mình tìm được trong catalog hiện tại.`
    : `Tổng tạm tính ${formatMoney(total)}.`;

  const compatibility = compatibilitySummary([...buildProducts, ...ownedProducts]);
  const priorityNote = workload ? `\nƯu tiên theo mục đích: ${workload.guidance}` : "";

  let exclusionText = "";
  if (excludedCategories.length > 0) {
    const details = excludedCategories.map(c => {
      const p = ownedProducts.find(op => op.category_name === c);
      return p ? `${c} (bạn đã có: ${p.name})` : `${c} (loại bỏ)`;
    }).join(", ");
    exclusionText = ` (Đã loại trừ linh kiện theo yêu cầu của bạn: ${details})`;
  }

  return {
    tool: "build_pc",
    question: message,
    source: "local_rag",
    reply: `Mình lọc được combo tham khảo từ dữ liệu shop${exclusionText}:${priorityNote}\n${lines}\n${budgetNote} Kiểm tra tương thích: ${compatibility.notes.join(" ")}`,
    products: buildProducts.map((p) => ({
      id: p.id, name: p.name, category_name: p.category_name, brand: p.brand,
      price: p.price, sale_price: p.sale_price, discount_percent: p.discount_percent,
      stock: p.stock, image_url: p.image_url,
    })),
    debug: {
      budget,
      tokens: tokenize(message),
      categories: getBuildCategoriesForMessage(message),
      retrievalSource: "build_pc",
      workload: workload?.name,
      excludedCategories,
      ownedProducts: ownedProducts.map(p => p.name)
    },
  };
};

module.exports = {
  buildPc,
  selectBuildCandidatesFromCatalog,
  selectPerBuildCategory,
  getBuildCategoriesForMessage,
  getWorkloadProfile,
};
