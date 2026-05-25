const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const dotenv = require(path.join(rootDir, "be", "node_modules", "dotenv"));
const mysql = require(path.join(rootDir, "be", "node_modules", "mysql2", "promise"));

dotenv.config({ path: path.join(rootDir, "be", ".env"), quiet: true });

const outDir = path.resolve(__dirname, "..", "data");
const outputPath = path.join(outDir, "knowledge-base.json");
const markdownPath = path.join(outDir, "knowledge-base.md");

const normalizePrice = (product) => {
  const price = Number(product.price || 0);
  const discount = Number(product.discount_percent || 0);
  const hasDiscount =
    discount > 0 &&
    (!product.discount_expires_at ||
      new Date(product.discount_expires_at).getTime() > Date.now());
  return hasDiscount ? Math.round(price * (1 - discount / 100)) : price;
};

const makeText = (product) => {
  const specs = product.specifications
    .map((spec) => `${spec.spec_name}: ${spec.spec_value}`)
    .join("; ");
  return [
    `Sản phẩm: ${product.name}`,
    `Danh mục: ${product.category_name || ""}`,
    `Hãng: ${product.brand || ""}`,
    `Giá hiện tại: ${product.sale_price}`,
    `Tồn kho: ${product.stock}`,
    `Đã bán: ${product.total_sold}`,
    `Mô tả: ${product.description || ""}`,
    `Thông số: ${specs}`,
    `Link: /products/${product.id}`,
  ].join("\n");
};

const main = async () => {
  fs.mkdirSync(outDir, { recursive: true });

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  const [products] = await conn.query(`
    SELECT p.id, p.name, p.description, p.price, p.stock, p.image_url, p.brand,
           p.discount_percent, p.discount_expires_at, p.is_active,
           c.name AS category_name,
           COALESCE(SUM(oi.quantity), 0) AS total_sold
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    WHERE p.is_active = 1
    GROUP BY p.id
    ORDER BY p.id DESC
  `);

  const [specRows] = await conn.query(`
    SELECT product_id, spec_name, spec_value
    FROM product_specifications
    ORDER BY product_id, id
  `);

  const [categories] = await conn.query(`
    SELECT c.id, c.name, c.description, COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
    GROUP BY c.id, c.name, c.description
    ORDER BY c.name
  `);

  const [discounts] = await conn.query(`
    SELECT code, description, discount_percent, discount_amount, min_order_amount, start_date, end_date
    FROM discounts
    WHERE is_active = 1
      AND (start_date IS NULL OR start_date <= NOW())
      AND (end_date IS NULL OR end_date >= NOW())
      AND (max_uses IS NULL OR used_count < max_uses)
    ORDER BY id DESC
  `);

  await conn.end();

  const specsByProduct = new Map();
  for (const row of specRows) {
    if (!specsByProduct.has(row.product_id)) specsByProduct.set(row.product_id, []);
    specsByProduct.get(row.product_id).push({
      spec_name: row.spec_name,
      spec_value: row.spec_value,
    });
  }

  const docs = products.map((product) => {
    const doc = {
      ...product,
      price: Number(product.price || 0),
      sale_price: normalizePrice(product),
      discount_percent: Number(product.discount_percent || 0),
      stock: Number(product.stock || 0),
      total_sold: Number(product.total_sold || 0),
      specifications: specsByProduct.get(product.id) || [],
    };
    doc.text = makeText(doc);
    doc.search_text = `${doc.text}\n${doc.specifications
      .map((spec) => `${spec.spec_name} ${spec.spec_value}`)
      .join(" ")}`;
    return doc;
  });

  const payload = {
    generated_at: new Date().toISOString(),
    source: {
      database: process.env.DB_NAME,
      product_count: docs.length,
      category_count: categories.length,
      active_discount_count: discounts.length,
    },
    categories,
    discounts,
    products: docs,
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      `# Knowledge Base`,
      ``,
      `Generated at: ${payload.generated_at}`,
      `Products: ${docs.length}`,
      `Categories: ${categories.length}`,
      `Active discounts: ${discounts.length}`,
      ``,
      ...docs.map((doc) => `## ${doc.name}\n\n${doc.text}\n`),
    ].join("\n"),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        output: outputPath,
        markdown: markdownPath,
        products: docs.length,
        categories: categories.length,
        activeDiscounts: discounts.length,
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
