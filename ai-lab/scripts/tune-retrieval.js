const fs = require("fs");
const path = require("path");

const { normalize } = require("./rag-core");

const DATA_DIR = path.resolve(__dirname, "..", "data");
const TRAINING_PATH = path.join(DATA_DIR, "training-examples.json");
const CONFIG_PATH = path.join(DATA_DIR, "tuning-config.json");
const REPORT_PATH = path.resolve(__dirname, "..", "outputs", "tuning-report.json");

const tokenize = (value) =>
  normalize(value)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 3);

const unique = (items) => [...new Set(items.filter(Boolean))];

const addMany = (target, values) => {
  for (const value of values) {
    if (!target.includes(value)) target.push(value);
  }
};

const extractUnsupportedTerm = (question) => {
  const normalized = normalize(question);
  const match = normalized.match(/shop co (.+?) khong/);
  if (match) return match[1].trim();
  return null;
};

const main = () => {
  const examples = JSON.parse(fs.readFileSync(TRAINING_PATH, "utf8"));
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

  const before = JSON.parse(JSON.stringify(config));
  config.category_aliases ||= {};
  config.unsupported_terms ||= [];
  config.build_terms ||= [];
  config.sale_terms ||= [];
  config.soft_tokens ||= [];

  const learned = {
    category_aliases: {},
    unsupported_terms: [],
    build_terms: [],
    sale_terms: [],
    soft_tokens: [],
  };

  for (const example of examples) {
    if (example.expected_category) {
      const categoryKey = normalize(example.expected_category);
      config.category_aliases[categoryKey] ||= [];
      const aliases = unique([
        ...(example.expected_terms || []),
        ...tokenize(example.question).filter((token) =>
          normalize(example.expected_category).includes(token) || token.includes(normalize(example.expected_category))
        ),
      ]).map(normalize);
      addMany(config.category_aliases[categoryKey], aliases);
      learned.category_aliases[categoryKey] ||= [];
      addMany(learned.category_aliases[categoryKey], aliases);
    }

    if (example.type === "unsupported_catalog") {
      const term = extractUnsupportedTerm(example.question);
      if (term) {
        addMany(config.unsupported_terms, [term]);
        addMany(learned.unsupported_terms, [term]);
      }
    }

    if (example.type === "build_pc") {
      addMany(config.build_terms, ["build pc", "pc gaming", "cau hinh", "combo"]);
      addMany(learned.build_terms, ["build pc", "pc gaming", "cau hinh", "combo"]);
    }

    if (example.type === "sale") {
      const saleTerms = ["sale", "dang sale", "dang giam gia", "khuyen mai", "uu dai", "voucher", "coupon", "ma giam", "deal", "giam sau", "flashsale", "flash sale"];
      addMany(config.sale_terms, saleTerms);
      addMany(learned.sale_terms, saleTerms);
    }
  }

  addMany(config.soft_tokens, ["can", "tim", "mua", "hang", "shop", "mau", "goi", "san", "pham"]);
  addMany(learned.soft_tokens, ["can", "tim", "mua", "hang", "shop", "mau", "goi", "san", "pham"]);

  config.version = Number(config.version || 1) + 1;
  config.trained_at = new Date().toISOString();
  config.training_examples = examples.length;

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        ok: true,
        trained_at: config.trained_at,
        examples: examples.length,
        config: CONFIG_PATH,
        learned,
        counts: {
          category_aliases_before: Object.fromEntries(
            Object.entries(before.category_aliases || {}).map(([key, values]) => [key, values.length])
          ),
          category_aliases_after: Object.fromEntries(
            Object.entries(config.category_aliases || {}).map(([key, values]) => [key, values.length])
          ),
          unsupported_terms: config.unsupported_terms.length,
          build_terms: config.build_terms.length,
          sale_terms: config.sale_terms.length,
          soft_tokens: config.soft_tokens.length,
        },
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        examples: examples.length,
        config: CONFIG_PATH,
        report: REPORT_PATH,
        version: config.version,
      },
      null,
      2
    )
  );
};

main();
