"use strict";

const fs = require("fs");
const path = require("path");

// ai-lab/  (scripts/tools/shared/ → up 3 levels)
const ROOT_DIR = path.resolve(__dirname, "..", "..", "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const KB_PATH = path.join(DATA_DIR, "knowledge-base.json");
const TUNING_CONFIG_PATH = path.join(DATA_DIR, "tuning-config.json");
const SKILLS_PATH = path.join(DATA_DIR, "chatbot-skills.json");

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

const loadKnowledgeBase = () => {
  if (!fs.existsSync(KB_PATH)) {
    throw new Error(`Missing ${KB_PATH}. Run: node ai-lab/scripts/export-knowledge-base.js`);
  }
  return JSON.parse(fs.readFileSync(KB_PATH, "utf8"));
};

const formatMoney = (value) =>
  `${Math.round(Number(value || 0)).toLocaleString("vi-VN")}đ`;

const availabilityNote = (product) =>
  Number(product?.stock || 0) <= 0 ? " - hết hàng" : "";

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

module.exports = {
  DEFAULT_TUNING_CONFIG,
  loadTuningConfig,
  getTuningConfig,
  loadChatbotSkills,
  getChatbotSkills,
  loadKnowledgeBase,
  formatMoney,
  availabilityNote,
  buildContext,
};
