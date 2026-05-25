const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const dotenv = require(path.join(rootDir, "be", "node_modules", "dotenv"));
dotenv.config({ path: path.join(rootDir, "be", ".env"), quiet: true });

const { answerQuestion, normalize } = require("./rag-core");

const DATA_DIR = path.resolve(__dirname, "..", "data");
const OUTPUTS_DIR = path.resolve(__dirname, "..", "outputs");
const TRAINING_PATH = path.join(DATA_DIR, "training-examples.json");
const REPORT_PATH = path.join(OUTPUTS_DIR, "training-eval-report.json");
const REPORT_MD_PATH = path.join(OUTPUTS_DIR, "training-eval-report.md");

const containsAny = (text, terms) => {
  if (!terms || terms.length === 0) return true;
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
};

const containsAll = (text, terms) => {
  if (!terms || terms.length === 0) return true;
  const normalized = normalize(text);
  return terms.every((term) => normalized.includes(normalize(term)));
};

const main = async () => {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
  const examples = JSON.parse(fs.readFileSync(TRAINING_PATH, "utf8"));
  const results = [];

  for (const example of examples) {
    const result = await answerQuestion({
      message: example.question,
      useGemini: process.argv.includes("--gemini"),
      limit: 8,
    });

    const productText = result.products
      .map((product) => `${product.name} ${product.category_name} ${product.brand}`)
      .join("\n");
    const replyOk = result.reply && result.reply.length > 20;
    const expectedMentionOk = containsAny(`${result.reply}\n${productText}`, example.expected_terms);
    const expectedAllTermsOk = containsAll(`${result.reply}\n${productText}`, example.expected_all_terms);
    const noProductsOk = !example.must_return_products || result.products.length > 0;
    const emptyProductsOk = example.must_return_products !== false || result.products.length === 0;
    const categoryOk =
      !example.expected_category ||
      !example.must_return_products ||
      result.products.some(
        (product) => normalize(product.category_name) === normalize(example.expected_category)
      );
    const allProductsCategoryOk =
      !example.all_products_must_match_category ||
      result.products.every(
        (product) => normalize(product.category_name) === normalize(example.expected_category)
      );
    const maxPriceOk =
      !example.max_price ||
      result.products.every((product) => Number(product.sale_price || product.price || 0) <= Number(example.max_price));
    const requiredBuildCategoriesOk =
      !example.build_required_categories ||
      example.build_required_categories.every((category) =>
        result.products.some((product) => normalize(product.category_name) === normalize(category))
      );
    const expectedCountOk =
      !example.expected_count || result.products.length === Number(example.expected_count);
    const totalPrice = result.products.reduce(
      (sum, product) => sum + Number(product.sale_price || product.price || 0),
      0
    );
    const totalBudgetOk =
      !example.max_total_price ||
      totalPrice <= Number(example.max_total_price) ||
      normalize(result.reply).includes("vuot ngan sach") ||
      normalize(result.reply).includes("vượt ngân sách") ||
      (normalize(result.reply).includes("vuot") && normalize(result.reply).includes("ngan sach"));

    const pass = Boolean(
      replyOk &&
        expectedMentionOk &&
        expectedAllTermsOk &&
        noProductsOk &&
        emptyProductsOk &&
        categoryOk &&
        allProductsCategoryOk &&
        maxPriceOk &&
        requiredBuildCategoriesOk &&
        expectedCountOk &&
        totalBudgetOk
    );

    results.push({
      id: example.id,
      type: example.type,
      question: example.question,
      pass,
      source: result.source,
      checks: {
        replyOk,
        expectedMentionOk,
        expectedAllTermsOk,
        noProductsOk,
        emptyProductsOk,
        categoryOk,
        allProductsCategoryOk,
        maxPriceOk,
        requiredBuildCategoriesOk,
        expectedCountOk,
        totalBudgetOk,
      },
      reply: result.reply,
      productIds: result.products.map((product) => product.id),
      products: result.products.slice(0, 5).map((product) => ({
        id: product.id,
        name: product.name,
        category_name: product.category_name,
        sale_price: product.sale_price,
        stock: product.stock,
      })),
      totalPrice,
      debug: result.debug,
    });
  }

  const passed = results.filter((item) => item.pass).length;
  const report = {
    generated_at: new Date().toISOString(),
    total: results.length,
    passed,
    failed: results.length - passed,
    pass_rate: Number((passed / results.length).toFixed(3)),
    results,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(
    REPORT_MD_PATH,
    [
      "# Training Evaluation",
      "",
      `Generated at: ${report.generated_at}`,
      `Pass rate: ${passed}/${results.length} (${Math.round(report.pass_rate * 100)}%)`,
      "",
      ...results.map((item) =>
        [
          `## ${item.pass ? "PASS" : "FAIL"} - ${item.id}`,
          "",
          `Type: ${item.type}`,
          `Question: ${item.question}`,
          `Source: ${item.source}`,
          `Reply: ${item.reply}`,
          `Products: ${item.products.map((product) => `${product.name} (#${product.id})`).join("; ") || "none"}`,
          "",
        ].join("\n")
      ),
    ].join("\n"),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        total: report.total,
        passed: report.passed,
        failed: report.failed,
        passRate: report.pass_rate,
        report: REPORT_PATH,
        markdown: REPORT_MD_PATH,
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
