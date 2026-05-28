"use strict";

const { normalize } = require("./nlp");
const { specText, getSpecValue } = require("./scoring");


// Socket / RAM standard extractors

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

// Combo compatibility check

const isCompatibleComboGlobal = (items) => {
  const cpu = items.find((product) => normalize(product.category_name || "") === "cpu");
  const ram = items.find((product) => normalize(product.category_name || "") === "ram");
  const mainboard = items.find((product) => normalize(product.category_name || "") === "mainboard");
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


// Compatibility summary (human-readable notes)

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

  return { ok: !hasConflict, notes };
};

module.exports = {
  getCpuSocket,
  getMainboardSocket,
  getRamStandard,
  getMainboardRamStandard,
  isCompatibleComboGlobal,
  compatibilitySummary,
};
