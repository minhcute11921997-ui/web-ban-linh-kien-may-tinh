const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..", "..");
const dotenv = require(path.join(rootDir, "be", "node_modules", "dotenv"));
dotenv.config({ path: path.join(rootDir, "be", ".env"), quiet: true });

const { runChatPipeline } = require("../rag-llm-pipeline");
const { isGeminiAvailable } = require("../gemini-core");
const { normalize } = require("../tools/shared/nlp");

const root = path.resolve(__dirname, "..", "..");
const testCasesPath = path.join(root, "data", "test-cases.json");
const outputsDir = path.join(root, "outputs");
const reportPath = path.join(outputsDir, "eval-report.json");
const reportMdPath = path.join(outputsDir, "eval-report.md");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const containsAny = (text, terms) => {
  if (!terms || terms.length === 0) return true;
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
};

const containsForbidden = (text, terms) => {
  if (!terms || terms.length === 0) return false;
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
};

const main = async () => {
  fs.mkdirSync(outputsDir, { recursive: true });
  const cases = JSON.parse(fs.readFileSync(testCasesPath, "utf8"));
  const results = [];
  const geminiActive = isGeminiAvailable();

  for (let i = 0; i < cases.length; i++) {
    const testCase = cases[i];
    
    if (geminiActive && i > 0) {
      console.log(`[${i}/${cases.length}] Chờ 4s tránh rate limit Gemini...`);
      await sleep(4000);
    } else {
      console.log(`[${i}/${cases.length}] Đang chạy: "${testCase.question}"`);
    }

    const result = await runChatPipeline({
      message: testCase.question,
      history: testCase.history || [],
      limit: 8,
    });
    const productText = result.products
      .map((product) => `${product.name} ${product.category_name} ${product.brand}`)
      .join("\n");
    const replyOk = result.reply && result.reply.length > 20;
    const expectedMentionOk = containsAny(`${result.reply}\n${productText}`, testCase.expected_terms);
    const categoryOk =
      !testCase.expected_category ||
      !testCase.must_return_products ||
      result.products.some(
        (product) => normalize(product.category_name) === normalize(testCase.expected_category)
      );
    const allProductsCategoryOk =
      !testCase.all_products_must_match_category ||
      result.products.every(
        (product) => normalize(product.category_name) === normalize(testCase.expected_category)
      );
    const noProductsOk = !testCase.must_return_products || result.products.length > 0;
    const forbiddenTermsOk = !containsForbidden(`${result.reply}\n${productText}`, testCase.forbidden_terms);
    const maxPriceOk =
      !testCase.max_price ||
      result.products.every((product) => Number(product.sale_price || product.price || 0) <= Number(testCase.max_price));
    const requiredBuildCategoriesOk =
      !testCase.build_required_categories ||
      testCase.build_required_categories.every((category) =>
        result.products.some((product) => normalize(product.category_name) === normalize(category))
      );
    const totalPrice = result.products.reduce(
      (sum, product) => sum + Number(product.sale_price || product.price || 0),
      0
    );
    const totalBudgetOk =
      !testCase.max_total_price || totalPrice <= Number(testCase.max_total_price);
    const pass = Boolean(
      replyOk &&
        expectedMentionOk &&
        categoryOk &&
        allProductsCategoryOk &&
        noProductsOk &&
        forbiddenTermsOk &&
        maxPriceOk &&
        requiredBuildCategoriesOk &&
        totalBudgetOk
    );

    results.push({
      id: testCase.id,
      question: testCase.question,
      pass,
      checks: {
        replyOk,
        expectedMentionOk,
        categoryOk,
        allProductsCategoryOk,
        noProductsOk,
        forbiddenTermsOk,
        maxPriceOk,
        requiredBuildCategoriesOk,
        totalBudgetOk,
      },
      source: result.source,
      reply: result.reply,
      products: result.products.slice(0, 5).map((product) => ({
        id: product.id,
        name: product.name,
        category_name: product.category_name,
        sale_price: product.sale_price,
        stock: product.stock,
      })),
      debug: result.debug,
      totalPrice,
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

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(
    reportMdPath,
    [
      `# AI Lab Evaluation`,
      ``,
      `Generated at: ${report.generated_at}`,
      `Pass rate: ${passed}/${results.length} (${Math.round(report.pass_rate * 100)}%)`,
      ``,
      ...results.map((item) =>
        [
          `## ${item.pass ? "PASS" : "FAIL"} - ${item.id}`,
          ``,
          `Question: ${item.question}`,
          `Source: ${item.source}`,
          `Reply: ${item.reply}`,
          `Products: ${item.products.map((product) => `${product.name} (#${product.id})`).join("; ") || "none"}`,
          ``,
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
        report: reportPath,
        markdown: reportMdPath,
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
