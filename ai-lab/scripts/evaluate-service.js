const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const testCasesPath = process.argv.includes("--training")
  ? path.join(root, "data", "training-examples.json")
  : path.join(root, "data", "test-cases.json");
const outputsDir = path.join(root, "outputs");
const reportPath = process.argv.includes("--training")
  ? path.join(outputsDir, "service-training-eval-report.json")
  : path.join(outputsDir, "service-eval-report.json");
const reportMdPath = process.argv.includes("--training")
  ? path.join(outputsDir, "service-training-eval-report.md")
  : path.join(outputsDir, "service-eval-report.md");

const SERVICE_URL = process.env.AI_LAB_SERVICE_URL || "http://127.0.0.1:4001";

const normalize = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

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

const containsForbidden = (text, terms) => {
  if (!terms || terms.length === 0) return false;
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
};

const callChat = async (question) => {
  const response = await fetch(`${SERVICE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: question,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
};

const main = async () => {
  fs.mkdirSync(outputsDir, { recursive: true });
  const cases = JSON.parse(fs.readFileSync(testCasesPath, "utf8"));
  const results = [];

  for (const testCase of cases) {
    const result = await callChat(testCase.question);
    const productText = result.products
      .map((product) => `${product.name} ${product.category_name} ${product.brand}`)
      .join("\n");
    const replyOk = result.reply && result.reply.length > 20;
    const expectedMentionOk = containsAny(`${result.reply}\n${productText}`, testCase.expected_terms);
    const expectedAllTermsOk = containsAll(`${result.reply}\n${productText}`, testCase.expected_all_terms);
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
    const emptyProductsOk = testCase.must_return_products !== false || result.products.length === 0;
    const forbiddenTermsOk = !containsForbidden(`${result.reply}\n${productText}`, testCase.forbidden_terms);
    const maxPriceOk =
      !testCase.max_price ||
      result.products.every((product) => Number(product.sale_price || product.price || 0) <= Number(testCase.max_price));
    const requiredBuildCategoriesOk =
      !testCase.build_required_categories ||
      testCase.build_required_categories.every((category) =>
        result.products.some((product) => normalize(product.category_name) === normalize(category))
      );
    const expectedCountOk =
      !testCase.expected_count || result.products.length === Number(testCase.expected_count);
    const totalPrice = result.products.reduce(
      (sum, product) => sum + Number(product.sale_price || product.price || 0),
      0
    );
    const totalBudgetOk =
      !testCase.max_total_price ||
      totalPrice <= Number(testCase.max_total_price) ||
      normalize(result.reply).includes("vuot ngan sach") ||
      normalize(result.reply).includes("vượt ngân sách") ||
      (normalize(result.reply).includes("vuot") && normalize(result.reply).includes("ngan sach"));
    const pass = Boolean(
      replyOk &&
        expectedMentionOk &&
        expectedAllTermsOk &&
        categoryOk &&
        allProductsCategoryOk &&
        noProductsOk &&
        emptyProductsOk &&
        forbiddenTermsOk &&
        maxPriceOk &&
        requiredBuildCategoriesOk &&
        expectedCountOk &&
        totalBudgetOk
    );

    results.push({
      id: testCase.id,
      question: testCase.question,
      pass,
      latencyMs: result.latencyMs,
      checks: {
        replyOk,
        expectedMentionOk,
        expectedAllTermsOk,
        categoryOk,
        allProductsCategoryOk,
        noProductsOk,
        emptyProductsOk,
        forbiddenTermsOk,
        maxPriceOk,
        requiredBuildCategoriesOk,
        expectedCountOk,
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
    serviceUrl: SERVICE_URL,
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
      `# AI Lab Service Evaluation`,
      ``,
      `Generated at: ${report.generated_at}`,
      `Service: ${SERVICE_URL}`,
      `Pass rate: ${passed}/${results.length} (${Math.round(report.pass_rate * 100)}%)`,
      ``,
      ...results.map((item) =>
        [
          `## ${item.pass ? "PASS" : "FAIL"} - ${item.id}`,
          ``,
          `Question: ${item.question}`,
          `Source: ${item.source}`,
          `Latency: ${item.latencyMs}ms`,
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
