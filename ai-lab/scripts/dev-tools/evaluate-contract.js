"use strict";

const fs = require("fs");
const path = require("path");

const { runChatPipeline } = require("../rag-llm-pipeline");

const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_CASES_PATH = path.join(ROOT, "evals", "contract-cases.json");

const normalize = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const readCases = () => {
  const customPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_CASES_PATH;
  return JSON.parse(fs.readFileSync(customPath, "utf8"));
};

const productPrice = (product) => Number(product.sale_price || product.price || 0);

const checkCase = async (testCase) => {
  const result = await runChatPipeline({
    message: testCase.input,
    history: [],
    limit: testCase.limit || 8,
  });
  const expected = testCase.expected || {};
  const failures = [];
  const products = Array.isArray(result.products) ? result.products : [];

  if (expected.mustReturnProducts && products.length === 0) {
    failures.push("expected products but got none");
  }

  if (expected.mustReturnProducts === false && products.length > 0) {
    failures.push(`expected no products but got ${products.length}`);
  }

  if (expected.categories?.length && products.length) {
    const allowed = expected.categories.map(normalize);
    const invalid = products.filter((product) => !allowed.includes(normalize(product.category_name)));
    if (invalid.length) {
      failures.push(`unexpected categories: ${invalid.map((product) => product.category_name).join(", ")}`);
    }
  }

  if (Number.isFinite(Number(expected.maxPrice)) && products.length) {
    const overBudget = products.filter((product) => productPrice(product) > Number(expected.maxPrice));
    if (overBudget.length) {
      failures.push(`products over maxPrice: ${overBudget.map((product) => product.id).join(", ")}`);
    }
  }

  if (expected.sourceIncludes && !normalize(result.source).includes(normalize(expected.sourceIncludes))) {
    failures.push(`source "${result.source}" does not include "${expected.sourceIncludes}"`);
  }

  return {
    id: testCase.id,
    input: testCase.input,
    pass: failures.length === 0,
    failures,
    source: result.source,
    productIds: products.map((product) => product.id),
  };
};

const main = async () => {
  const cases = readCases();
  const results = [];
  for (const testCase of cases) {
    results.push(await checkCase(testCase));
  }

  const failed = results.filter((result) => !result.pass);
  for (const result of results) {
    console.log(`${result.pass ? "PASS" : "FAIL"} ${result.id} [${result.source}] products=${result.productIds.join(",")}`);
    for (const failure of result.failures) console.log(`  - ${failure}`);
  }

  console.log(JSON.stringify({ total: results.length, failed: failed.length }, null, 2));
  if (failed.length) process.exit(1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
