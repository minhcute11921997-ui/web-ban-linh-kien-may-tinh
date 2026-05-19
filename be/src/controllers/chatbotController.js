const db = require("../config/db");

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
]);

const CATEGORY_TERMS = ["cpu", "ram", "ssd", "vga", "mainboard"];
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const normalize = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const formatMoney = (value) =>
  `${Math.round(Number(value || 0)).toLocaleString("vi-VN")}đ`;

const extractKeywords = (message) => {
  const normalized = normalize(message);
  return normalized
    .split(/[^a-z0-9]+/i)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !STOP_WORDS.has(item))
    .slice(0, 8);
};

const parseBudget = (message) => {
  const normalized = normalize(message).replace(/,/g, ".");
  const matches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(trieu|tr|m|k|nghin|ngan)?/g)];
  const amounts = matches
    .map((match) => {
      const value = Number(match[1]);
      const unit = match[2] || "";
      if (!Number.isFinite(value) || value <= 0) return null;
      if (["trieu", "tr", "m"].includes(unit)) return value * 1000000;
      if (["k", "nghin", "ngan"].includes(unit)) return value * 1000;
      const before = normalized.slice(Math.max(0, match.index - 16), match.index);
      const after = normalized.slice(match.index + match[0].length, match.index + match[0].length + 8);
      if (!/(gia|duoi|tren|tam|khoang|du)/.test(before) && !/^(d|dong|vnd)/.test(after)) {
        return null;
      }
      return value >= 1000 ? value : value * 1000000;
    })
    .filter(Boolean);

  if (amounts.length === 0) return null;
  return Math.max(...amounts);
};

const detectIntent = (message) => {
  const text = normalize(message);
  if (/(xin chao|hello|hi|chao|hey)\b/.test(text)) return "greeting";
  if (/(ma giam gia|voucher|coupon|khuyen mai|giam gia)/.test(text)) {
    return "discounts";
  }
  if (/(danh muc|loai san pham|category)/.test(text)) return "categories";
  if (/(flash sale|sale|dang giam|khuyen mai)/.test(text)) return "saleProducts";
  if (/(het hang|con hang|ton kho|stock)/.test(text)) return "stock";
  return "products";
};

const shouldUseAiAdvice = (message) => {
  const text = normalize(message);
  return /(tu van|nen mua|chon|so sanh|build|cau hinh|combo|choi game|gaming|hoc tap|van phong|render|do hoa|lap pc|may tinh|phu hop|co hop|khac nhau)/.test(text);
};

const isBuildAdvice = (message) => {
  const text = normalize(message);
  return /(build|cau hinh|combo|lap pc|may tinh|choi game|gaming|van phong|hoc tap|render|do hoa)/.test(text);
};

const mapProduct = (product) => {
  const price = Number(product.price || 0);
  const discount = Number(product.discount_percent || 0);
  const hasDiscount =
    discount > 0 &&
    (!product.discount_expires_at ||
      new Date(product.discount_expires_at).getTime() > Date.now());
  const salePrice = hasDiscount
    ? Math.round(price * (1 - discount / 100))
    : price;

  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category_name: product.category_name,
    image_url: product.image_url,
    price,
    sale_price: salePrice,
    discount_percent: hasDiscount ? discount : 0,
    stock: Number(product.stock || 0),
  };
};

const findProducts = async ({
  message,
  limit = 6,
  onlySale = false,
  ignoreKeywords = false,
}) => {
  const keywords = ignoreKeywords ? [] : extractKeywords(message);
  const budget = parseBudget(message);
  const params = [];

  let where = "WHERE p.is_active = 1";
  if (onlySale) {
    where +=
      " AND p.discount_percent > 0 AND (p.discount_expires_at IS NULL OR p.discount_expires_at > NOW())";
  }

  if (budget) {
    where += ` AND (
      CASE
        WHEN p.discount_percent > 0
          AND (p.discount_expires_at IS NULL OR p.discount_expires_at > NOW())
        THEN ROUND(p.price * (1 - p.discount_percent / 100))
        ELSE p.price
      END
    ) <= ?`;
    params.push(budget);
  }

  const categoryTerm = keywords.find((keyword) => CATEGORY_TERMS.includes(keyword));
  if (categoryTerm) {
    where += " AND LOWER(CONVERT(COALESCE(c.name, '') USING utf8mb4)) LIKE ?";
    params.push(`%${categoryTerm}%`);
  }

  const searchKeywords = keywords.filter((keyword) => keyword !== categoryTerm);
  if (searchKeywords.length > 0) {
    const keywordClauses = [];
    searchKeywords.forEach((keyword) => {
      const like = `%${keyword}%`;
      keywordClauses.push(`(
        LOWER(CONVERT(p.name USING utf8mb4)) LIKE ?
        OR LOWER(CONVERT(COALESCE(p.brand, '') USING utf8mb4)) LIKE ?
        OR LOWER(CONVERT(COALESCE(c.name, '') USING utf8mb4)) LIKE ?
        OR EXISTS (
          SELECT 1 FROM product_specifications ps
          WHERE ps.product_id = p.id
            AND (
              LOWER(CONVERT(ps.spec_name USING utf8mb4)) LIKE ?
              OR LOWER(CONVERT(ps.spec_value USING utf8mb4)) LIKE ?
            )
        )
      )`);
      params.push(like, like, like, like, like);
    });
    where += ` AND ${keywordClauses.join(" AND ")}`;
  } else if (keywords.length > 0 && !categoryTerm) {
    const likeParts = [];
    keywords.forEach((keyword) => {
      const like = `%${keyword}%`;
      likeParts.push(
        "LOWER(CONVERT(p.name USING utf8mb4)) LIKE ?",
        "LOWER(CONVERT(COALESCE(p.brand, '') USING utf8mb4)) LIKE ?",
        "LOWER(CONVERT(COALESCE(c.name, '') USING utf8mb4)) LIKE ?",
        `EXISTS (
          SELECT 1 FROM product_specifications ps
          WHERE ps.product_id = p.id
            AND (
              LOWER(CONVERT(ps.spec_name USING utf8mb4)) LIKE ?
              OR LOWER(CONVERT(ps.spec_value USING utf8mb4)) LIKE ?
            )
        )`
      );
      params.push(like, like, like, like, like);
    });
    where += ` AND (${likeParts.join(" OR ")})`;
  }

  const [rows] = await db.query(
    `SELECT p.id, p.name, p.price, p.stock, p.brand, p.image_url,
            p.discount_percent, p.discount_expires_at, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ${where}
     ORDER BY
       CASE WHEN p.stock > 0 THEN 0 ELSE 1 END,
       CASE WHEN p.discount_percent > 0 THEN 0 ELSE 1 END,
       p.is_featured DESC,
       p.id DESC
     LIMIT ?`,
    [...params, limit]
  );

  return rows.map(mapProduct);
};

const findBuildCandidates = async ({ budget, limitPerCategory = 4 }) => {
  const buildCategories = ["CPU", "VGA", "RAM", "SSD", "Mainboard"];
  const allProducts = [];

  const budgetCaps = {
    CPU: budget ? budget * 0.35 : null,
    VGA: budget ? budget * 0.55 : null,
    RAM: budget ? budget * 0.2 : null,
    SSD: budget ? budget * 0.25 : null,
    Mainboard: budget ? budget * 0.35 : null,
  };

  for (const category of buildCategories) {
    const params = [category];
    let priceFilter = "";

    if (budgetCaps[category]) {
      priceFilter = ` AND (
        CASE
          WHEN p.discount_percent > 0
            AND (p.discount_expires_at IS NULL OR p.discount_expires_at > NOW())
          THEN ROUND(p.price * (1 - p.discount_percent / 100))
          ELSE p.price
        END
      ) <= ?`;
      params.push(Math.round(budgetCaps[category]));
    }

    params.push(limitPerCategory);

    const [rows] = await db.query(
      `SELECT p.id, p.name, p.price, p.stock, p.brand, p.image_url,
              p.discount_percent, p.discount_expires_at, c.name AS category_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1
         AND LOWER(CONVERT(c.name USING utf8mb4)) = LOWER(?)
         ${priceFilter}
       ORDER BY
         CASE WHEN p.stock > 0 THEN 0 ELSE 1 END,
         CASE WHEN p.discount_percent > 0 THEN 0 ELSE 1 END,
         p.price ASC,
         p.id DESC
       LIMIT ?`,
      params
    );

    allProducts.push(...rows.map(mapProduct));
  }

  return allProducts;
};

const getCategories = async () => {
  const [rows] = await db.query(
    `SELECT c.id, c.name, COUNT(p.id) AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
     GROUP BY c.id, c.name
     ORDER BY c.name`
  );
  return rows;
};

const getDiscounts = async () => {
  const [rows] = await db.query(
    `SELECT code, description, discount_percent, discount_amount,
            min_order_amount, end_date
     FROM discounts
     WHERE is_active = 1
       AND (start_date IS NULL OR start_date <= NOW())
       AND (end_date IS NULL OR end_date >= NOW())
       AND (max_uses IS NULL OR used_count < max_uses)
     ORDER BY id DESC
     LIMIT 5`
  );
  return rows;
};

const productReply = (products, budget) => {
  if (products.length === 0) {
    return budget
      ? `Mình chưa tìm thấy sản phẩm phù hợp dưới ${formatMoney(budget)}. Bạn có thể thử nhập hãng, danh mục hoặc khoảng giá khác.`
      : "Mình chưa tìm thấy sản phẩm phù hợp trong dữ liệu hiện tại. Bạn hãy thử hỏi cụ thể hơn, ví dụ: RAM 16GB, SSD 1TB, CPU Intel, VGA dưới 5 triệu.";
  }

  const first = products[0];
  const priceText =
    first.discount_percent > 0
      ? `${formatMoney(first.sale_price)} sau giảm ${first.discount_percent}%`
      : formatMoney(first.price);
  return `Mình tìm thấy ${products.length} sản phẩm phù hợp. Gợi ý nổi bật là ${first.name} (${first.brand || first.category_name || "sản phẩm"}) giá ${priceText}, tồn kho ${first.stock}.`;
};

const adviceFallbackReply = (products, budget) => {
  if (products.length === 0) return productReply(products, budget);

  const byCategory = new Map();
  products.forEach((product) => {
    const category = product.category_name || "Khác";
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(product);
  });

  const picks = [...byCategory.entries()]
    .map(([category, items]) => {
      const item = items[0];
      return `${category}: ${item.name} - ${formatMoney(item.sale_price)} - tồn kho ${item.stock}`;
    })
    .slice(0, 5);

  const budgetText = budget ? ` trong ngân sách khoảng ${formatMoney(budget)}` : "";
  return `Mình đã lọc được ${products.length} sản phẩm liên quan${budgetText}. Gợi ý theo nhóm linh kiện: ${picks.join("; ")}. Đây là tư vấn nhanh theo dữ liệu shop; khi cấu hình GEMINI_API_KEY, chatbot sẽ phân tích nhu cầu và phối combo chi tiết hơn.`;
};

const buildAiUnavailableReply = () =>
  "Mình chưa thể tư vấn cấu hình build PC lúc này vì Gemini API chưa phản hồi. Để tránh ghép nhầm linh kiện không tương thích, mình không tự build nhanh bằng rules. Bạn thử gửi lại sau vài giây nhé.";

const attachProductSpecifications = async (products) => {
  if (products.length === 0) return products;

  const productIds = products.map((product) => product.id);
  const placeholders = productIds.map(() => "?").join(",");
  const [rows] = await db.query(
    `SELECT product_id, spec_name, spec_value
     FROM product_specifications
     WHERE product_id IN (${placeholders})
     ORDER BY product_id, id`,
    productIds
  );

  const specsByProduct = new Map();
  rows.forEach((row) => {
    if (!specsByProduct.has(row.product_id)) specsByProduct.set(row.product_id, []);
    if (specsByProduct.get(row.product_id).length >= 6) return;
    specsByProduct.get(row.product_id).push({
      ten: row.spec_name,
      gia_tri: row.spec_value,
    });
  });

  return products.map((product) => ({
    ...product,
    specifications: specsByProduct.get(product.id) || [],
  }));
};

const buildProductContext = (products) =>
  products
    .map((product, index) => ({
      stt: index + 1,
      id: product.id,
      ten: product.name,
      hang: product.brand || "",
      danh_muc: product.category_name || "",
      gia_goc: product.price,
      gia_hien_tai: product.sale_price,
      giam_gia_phan_tram: product.discount_percent,
      ton_kho: product.stock,
      thong_so: product.specifications || [],
      link: `/products/${product.id}`,
    }));

const getProductMatchTokens = (product) => {
  const genericTokens = new Set([
    "bo",
    "vi",
    "xu",
    "ly",
    "cpu",
    "card",
    "man",
    "hinh",
    "ram",
    "desktop",
    "mainboard",
    "o",
    "cung",
    "gan",
    "trong",
    "ssd",
    "khong",
    "box",
    "core",
    "gb",
    "ddr4",
    "ddr5",
    "mhz",
    "nvme",
    "sata",
    "pcie",
  ]);

  return normalize(`${product.name} ${product.brand || ""}`)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 3 && !genericTokens.has(token));
};

const scoreProductMention = (reply, product) => {
  const text = normalize(reply);
  const name = normalize(product.name);
  if (name && text.includes(name)) return 100;

  const tokens = getProductMatchTokens(product);
  const tokenScore = tokens.reduce(
    (score, token) => score + (text.includes(token) ? 1 : 0),
    0
  );

  const category = normalize(product.category_name || "");
  const categoryScore = category && text.includes(category) ? 0.5 : 0;
  return tokenScore + categoryScore;
};

const getCategoryReplySegment = (reply, category) => {
  const categoryAliases = {
    CPU: ["cpu", "processor"],
    VGA: ["vga", "gpu", "card do hoa", "card man hinh"],
    RAM: ["ram"],
    Mainboard: ["mainboard", "bo mach chu"],
    SSD: ["ssd", "o cung"],
  };
  const aliases = categoryAliases[category] || [category];
  const lines = reply.split(/\r?\n/);
  const line = lines.find((item) => {
    const text = normalize(item);
    return aliases.some((alias) => text.includes(normalize(alias)));
  });

  return line || reply;
};

const selectProductsForReply = ({ reply, products, buildAdvice }) => {
  if (!reply || products.length === 0) return products;

  const scoredProducts = products
    .map((product, index) => ({
      product,
      index,
      score: scoreProductMention(reply, product),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  if (scoredProducts.length === 0) {
    return buildAdvice ? products.slice(0, 5) : products.slice(0, 6);
  }

  if (!buildAdvice) {
    return scoredProducts.slice(0, 6).map((item) => item.product);
  }

  const categoryOrder = ["CPU", "VGA", "RAM", "Mainboard", "SSD"];
  const selected = [];

  categoryOrder.forEach((category) => {
    const segment = getCategoryReplySegment(reply, category);
    const match = products
      .filter(
        (product) =>
          normalize(product.category_name || "") === normalize(category) &&
          !selected.some((selectedProduct) => selectedProduct.id === product.id)
      )
      .map((product, index) => ({
        product,
        index,
        score: scoreProductMention(segment, product),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)[0];

    if (match) selected.push(match.product);
  });

  return selected.length > 0 ? selected : scoredProducts.slice(0, 5).map((item) => item.product);
};

const getGeminiAdvice = async ({ message, products, discounts = [] }) => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (products.length === 0) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  const productContext = buildProductContext(products);

  const prompt = `
Bạn là nhân viên tư vấn bán linh kiện máy tính cho website thương mại điện tử.
Chỉ được tư vấn dựa trên DANH SÁCH SẢN PHẨM được cung cấp bên dưới. Không bịa sản phẩm, giá, tồn kho hoặc mã giảm giá ngoài dữ liệu.
Nếu dữ liệu chưa đủ, hãy nói rõ và hỏi thêm nhu cầu/ngân sách.
Trả lời bằng tiếng Việt, thân thiện, ngắn gọn, có lý do chọn sản phẩm. Nếu có sản phẩm phù hợp, nhắc người dùng bấm vào thẻ sản phẩm bên dưới để xem chi tiết.

Câu hỏi khách hàng: ${message}

Sản phẩm liên quan từ database:
${JSON.stringify(productContext, null, 2)}

Mã giảm giá còn hiệu lực:
${JSON.stringify(discounts, null, 2)}

Yêu cầu trả lời:
- Không quá 180 từ.
- Ưu tiên sản phẩm còn hàng.
- Trong dữ liệu, danh mục VGA nghĩa là card đồ họa/GPU.
- Nếu khách hỏi build PC/cấu hình/combo, hãy phối từ các nhóm CPU, VGA, RAM, SSD, Mainboard có trong danh sách. Nếu thiếu nhóm nào thì nói thiếu đúng nhóm đó, không nói thiếu tất cả.
- Không khẳng định CPU và Mainboard tương thích nếu dữ liệu không có socket/chipset rõ ràng. Khi thiếu dữ liệu tương thích, hãy ghi "cần kiểm tra socket/chipset trước khi chốt".
- Nếu có ngân sách, cố gắng giữ tổng giá không vượt ngân sách. Nếu vượt, phải nói rõ số tiền vượt và đề xuất giảm linh kiện.
- Nếu đang so sánh, nêu điểm khác biệt thực tế từ tên/danh mục/giá/tồn kho.
- Nếu hỏi build PC/combo, đề xuất theo nhóm linh kiện có trong danh sách; không tự thêm linh kiện không có dữ liệu.
`;

  try {
    const response = await fetch(
      `${GEMINI_ENDPOINT}/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            topP: 0.9,
            maxOutputTokens: 1024,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();
  } catch (error) {
    console.error("[geminiAdvice]", error.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

exports.chat = async (req, res) => {
  try {
    const message = (req.body.message || "").trim();
    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập nội dung cần tư vấn",
      });
    }

    const intent = detectIntent(message);

    if (intent === "greeting") {
      return res.json({
        success: true,
        reply:
          "Chào bạn, mình có thể tư vấn sản phẩm theo dữ liệu shop: tìm theo tên, hãng, danh mục, thông số, khoảng giá, tồn kho, sản phẩm sale và mã giảm giá.",
        products: [],
        suggestions: [
          "CPU Intel dưới 5 triệu",
          "RAM 16GB còn hàng",
          "Sản phẩm đang sale",
          "Có mã giảm giá không?",
        ],
      });
    }

    if (intent === "categories") {
      const categories = await getCategories();
      return res.json({
        success: true,
        reply:
          categories.length > 0
            ? `Shop hiện có các danh mục: ${categories
                .map((item) => `${item.name} (${item.product_count})`)
                .join(", ")}.`
            : "Hiện chưa có danh mục sản phẩm nào trong dữ liệu.",
        products: [],
        suggestions: ["Sản phẩm đang sale", "SSD dưới 2 triệu", "VGA còn hàng"],
      });
    }

    if (intent === "discounts") {
      const discounts = await getDiscounts();
      return res.json({
        success: true,
        reply:
          discounts.length > 0
            ? `Hiện có mã giảm giá: ${discounts
                .map((item) => {
                  const value = item.discount_percent
                    ? `giảm ${Number(item.discount_percent)}%`
                    : `giảm ${formatMoney(item.discount_amount)}`;
                  const min = item.min_order_amount
                    ? ` cho đơn từ ${formatMoney(item.min_order_amount)}`
                    : "";
                  return `${item.code} (${value}${min})`;
                })
                .join("; ")}.`
            : "Hiện chưa có mã giảm giá còn hiệu lực.",
        products: [],
        suggestions: ["Sản phẩm đang sale", "Tư vấn sản phẩm dưới 3 triệu"],
      });
    }

    const budget = parseBudget(message);
    const needsAiAdvice = shouldUseAiAdvice(message);
    const buildAdvice = isBuildAdvice(message);
    let products = await findProducts({
      message,
      onlySale: intent === "saleProducts",
      ignoreKeywords: intent === "saleProducts",
    });

    if (needsAiAdvice && products.length === 0) {
      products = buildAdvice
        ? await findBuildCandidates({ budget, limitPerCategory: 4 })
        : await findProducts({
            message,
            limit: 10,
            ignoreKeywords: true,
          });
    } else if (needsAiAdvice && buildAdvice) {
      const buildCandidates = await findBuildCandidates({
        budget,
        limitPerCategory: 4,
      });
      const seen = new Set(products.map((product) => product.id));
      products = [
        ...products,
        ...buildCandidates.filter((product) => !seen.has(product.id)),
      ].slice(0, 20);
    }

    if (needsAiAdvice) {
      products = await attachProductSpecifications(products);
    }

    const discounts = needsAiAdvice ? await getDiscounts() : [];
    const aiReply = needsAiAdvice
      ? await getGeminiAdvice({ message, products, discounts })
      : null;
    const reply =
      aiReply ||
      (buildAdvice
        ? buildAiUnavailableReply()
        : needsAiAdvice
          ? adviceFallbackReply(products, budget)
          : productReply(products, budget));
    const responseProducts = needsAiAdvice
      ? selectProductsForReply({
          reply,
          products,
          buildAdvice,
        })
      : products;

    return res.json({
      success: true,
      reply,
      products: buildAdvice && !aiReply ? [] : responseProducts,
      source: aiReply ? "gemini" : buildAdvice ? "gemini_unavailable" : "rules",
      suggestions: [
        "Sản phẩm đang sale",
        "Có mã giảm giá không?",
        "Danh mục sản phẩm",
        "RAM 16GB",
      ],
    });
  } catch (error) {
    console.error("[chatbot]", error);
    res.status(500).json({
      success: false,
      message: "Chatbot đang gặp lỗi khi đọc dữ liệu sản phẩm",
    });
  }
};
