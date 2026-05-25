const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const dotenv = require(path.join(rootDir, "be", "node_modules", "dotenv"));
dotenv.config({ path: path.join(rootDir, "be", ".env"), quiet: true });

const {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  LOCAL_EMBEDDING_DIMENSIONS,
  LOCAL_EMBEDDING_MODEL,
  VECTOR_INDEX_PATH,
  buildDocumentText,
  embedLocalText,
  embedText,
  loadKnowledgeBase,
} = require("./embedding-core");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  const kb = loadKnowledgeBase();
  const useLocal = process.argv.includes("--local") || process.env.LOCAL_EMBEDDING === "1";
  const model = useLocal ? LOCAL_EMBEDDING_MODEL : EMBEDDING_MODEL;
  const dimensions = useLocal ? LOCAL_EMBEDDING_DIMENSIONS : EMBEDDING_DIMENSIONS;
  const existing = fs.existsSync(VECTOR_INDEX_PATH)
    ? JSON.parse(fs.readFileSync(VECTOR_INDEX_PATH, "utf8"))
    : null;
  const existingById = new Map(
    existing?.model === model && existing?.dimensions === dimensions
      ? existing.items.map((item) => [item.id, item])
      : []
  );

  const items = [];
  let embedded = 0;
  let reused = 0;

  for (const product of kb.products) {
    const documentText = buildDocumentText(product);
    const old = existingById.get(product.id);
    if (old?.source_updated_at === product.updated_at && old?.document_text === documentText) {
      items.push(old);
      reused += 1;
      continue;
    }

    const embedding = useLocal
      ? embedLocalText({ text: documentText, dimensions })
      : await embedText({ text: documentText });
    items.push({
      id: product.id,
      name: product.name,
      category_name: product.category_name,
      brand: product.brand,
      price: product.price,
      sale_price: product.sale_price,
      discount_percent: product.discount_percent,
      stock: product.stock,
      image_url: product.image_url,
      total_sold: product.total_sold,
      source_updated_at: product.updated_at || null,
      document_text: documentText,
      embedding,
    });
    embedded += 1;

    if (embedded % 10 === 0) {
      console.log(`Embedded ${embedded}, reused ${reused}`);
      await sleep(250);
    }
  }

  const payload = {
    generated_at: new Date().toISOString(),
    source_generated_at: kb.generated_at,
    provider: useLocal ? "local" : "gemini",
    model,
    dimensions,
    count: items.length,
    items,
  };

  fs.writeFileSync(VECTOR_INDEX_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        ok: true,
        output: VECTOR_INDEX_PATH,
        provider: payload.provider,
        model,
        dimensions,
        count: items.length,
        embedded,
        reused,
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
