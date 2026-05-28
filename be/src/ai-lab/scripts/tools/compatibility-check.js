"use strict";

const { loadKnowledgeBase, formatMoney, availabilityNote, getChatbotSkills } = require("./shared/catalog");
const {
  normalize,
  tokenize,
  parseBudget,
  detectCategory,
  detectDirectCategory,
} = require("./shared/nlp");
const { mentionedProductScore } = require("./shared/scoring");
const {
  getCpuSocket,
  getMainboardSocket,
  getRamStandard,
  getMainboardRamStandard,
  compatibilitySummary,
} = require("./shared/compat");


// selectCompatibilityProducts — for generic compatibility questions

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


// selectMentionedComboProducts — for combo_check (user lists specific parts)

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

  // Special case: user asks for mainboard recommendation to match CPU/RAM
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


// checkCombo — for combo_check_question

const checkCombo = async ({ message, history = [], limit = 8 }) => {
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
    tool: "compatibility.combo_check",
    question: message,
    source: "combo_check_skill",
    reply,
    products: products.map(normalizeProduct),
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


// checkCompatibility — for general compatibility questions

const checkCompatibility = async ({ message, history = [], limit = 8 }) => {
  const products = selectCompatibilityProducts({ message, limit });
  const suffix =
    getChatbotSkills().compatibility?.reply_suffix ||
    "Cần kiểm tra socket/chipset và chuẩn RAM trước khi chốt.";

  return {
    tool: "compatibility.check",
    question: message,
    source: "compatibility_skill",
    reply: products.length
      ? `Mình lọc các linh kiện liên quan để kiểm tra tương thích. ${suffix}`
      : `Mình chưa tìm thấy linh kiện phù hợp để kiểm tra tương thích. ${suffix}`,
    products: products.map(normalizeProduct),
    debug: {
      budget: parseBudget(message),
      tokens: tokenize(message),
      categories: detectCategory(message),
      retrievalSource: "skill_compatibility",
    },
  };
};

module.exports = { checkCombo, checkCompatibility };
