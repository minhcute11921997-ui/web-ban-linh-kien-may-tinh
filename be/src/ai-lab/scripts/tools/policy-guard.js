"use strict";

const { getChatbotSkills } = require("./shared/catalog");
const {
  normalize,
  tokenize,
  parseBudget,
  detectCategory,
  isPolicyQuestion,
  isSafetyQuestion,
  isAccountOrderQuestion,
  isCasualQuestion,
  isAioCoolerQuestion,
  isUnsupportedCatalogQuestion,
} = require("./shared/nlp");


// Guard handler — returns { handled: true, result } or { handled: false }

const runGuard = ({ message }) => {
  const text = normalize(message);

  // 1. Casual greeting / bye / thanks
  if (isCasualQuestion(message)) {
    let reply = "Xin chào! Mình là trợ lý tư vấn linh kiện PC của shop. Bạn cần tư vấn gì ạ?";
    if (/(tam biet|bye|hen gap|hen khi khac)/.test(text)) {
      reply = "Tạm biệt bạn! Cảm ơn đã ghé shop, hẹn gặp lại lần sau nhé!";
    } else if (/(cam on|thank)/.test(text)) {
      reply = "Cảm ơn bạn đã tin tưởng shop! Nếu cần tư vấn thêm về linh kiện PC, mình luôn sẵn sàng hỗ trợ nhé.";
    } else if (/(dang lam viec|co lam viec|hoat dong)/.test(text)) {
      reply = "Dạ shop đang hoạt động ạ! Bạn cần tư vấn linh kiện PC, build cấu hình hay hỏi thông tin gì không?";
    }
    return {
      handled: true,
      result: {
        question: message,
        source: "casual_guard",
        reply,
        products: [],
        debug: { budget: null, tokens: tokenize(message), categories: [], retrievalSource: "casual_guard" },
      },
    };
  }

  // 2. AIO cooler / tản nhiệt — not in catalog
  if (isAioCoolerQuestion(message)) {
    return {
      handled: true,
      result: {
        question: message,
        source: "catalog_guard",
        reply: "Hiện dữ liệu shop trong lab chưa có danh mục tản nhiệt (AIO nước hoặc tản khí rời). Shop chỉ đang có CPU, RAM, SSD, VGA và Mainboard. Bạn cần tư vấn linh kiện nào trong số này không?",
        products: [],
        debug: { budget: null, tokens: tokenize(message), categories: [], retrievalSource: "aio_cooler_guard" },
      },
    };
  }

  // 3. Safety (jailbreak / secret reveal)
  if (isSafetyQuestion(message)) {
    const skill = getChatbotSkills().safety_guard;
    return {
      handled: true,
      result: {
        question: message,
        source: "safety_guard",
        reply: skill?.reply || "Mình không thể bỏ qua ràng buộc an toàn, tiết lộ secret, hoặc bịa dữ liệu.",
        products: [],
        debug: { budget: parseBudget(message), tokens: tokenize(message), categories: detectCategory(message), retrievalSource: "skill_safety_guard" },
      },
    };
  }

  // 4. Policy questions (bảo hành, đổi trả, vận chuyển…)
  if (isPolicyQuestion(message)) {
    const policy = getChatbotSkills().policy_guard;
    return {
      handled: true,
      result: {
        question: message,
        source: "policy_guard",
        reply: policy?.reply || "Hiện lab chưa có dữ liệu chính sách shop cho nội dung này trong catalog, nên mình không nên tự đoán.",
        products: [],
        debug: { budget: parseBudget(message), tokens: tokenize(message), categories: detectCategory(message), retrievalSource: "skill_policy_guard" },
      },
    };
  }

  // 5. Account / order questions
  if (isAccountOrderQuestion(message)) {
    const skill = getChatbotSkills().account_order_guard;
    return {
      handled: true,
      result: {
        question: message,
        source: "account_order_guard",
        reply: skill?.reply || "Hiện lab chưa có ngữ cảnh đăng nhập/đơn hàng của người dùng, nên mình không thể kiểm tra thông tin cá nhân.",
        products: [],
        debug: { budget: parseBudget(message), tokens: tokenize(message), categories: detectCategory(message), retrievalSource: "skill_account_order_guard" },
      },
    };
  }

  // 6. Unsupported catalog items (laptop, màn hình, chuột…)
  if (isUnsupportedCatalogQuestion(message)) {
    return {
      handled: true,
      result: {
        question: message,
        source: "catalog_guard",
        reply: "Hiện dữ liệu shop trong lab chỉ có linh kiện PC như CPU, RAM, SSD, VGA và Mainboard. Mình chưa thấy danh mục laptop hoặc phụ kiện tương ứng trong catalog, nên không nên gợi ý sản phẩm thay thế.",
        products: [],
        debug: { budget: parseBudget(message), tokens: tokenize(message), categories: detectCategory(message), retrievalSource: "guard" },
      },
    };
  }

  return { handled: false };
};

module.exports = { runGuard };
