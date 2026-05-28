require("dotenv").config();

const fs = require("fs");
const path = require("path");
const db = require("../src/config/db");

const uploadsDir = path.join(__dirname, "..", "uploads", "products");
const backupDir = path.join(__dirname, "..", "uploads", "backups");

const contentTypeToExt = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const isRemoteUrl = (value) => /^https?:\/\//i.test(value || "");

const sanitizeName = (value) =>
  String(value || "product")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .toLowerCase() || "product";

const extensionFromUrl = (url) => {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) return ext;
  } catch (_) {}
  return "";
};

const downloadImage = async (url) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = (response.headers.get("content-type") || "")
    .split(";")[0]
    .toLowerCase();

  if (!contentType.startsWith("image/")) {
    throw new Error(`Unexpected content-type: ${contentType || "unknown"}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType };
};

const main = async () => {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  const [products] = await db.query(
    "SELECT id, name, image_url FROM products ORDER BY id"
  );
  const remoteProducts = products.filter((product) =>
    isRemoteUrl(product.image_url)
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(
    backupDir,
    `product-image-url-backup-${timestamp}.json`
  );
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        totalProducts: products.length,
        remoteProducts: remoteProducts.length,
        products: products.map(({ id, name, image_url }) => ({
          id,
          name,
          image_url,
        })),
      },
      null,
      2
    )
  );

  const results = [];

  for (const product of remoteProducts) {
    try {
      const { buffer, contentType } = await downloadImage(product.image_url);
      const ext =
        contentTypeToExt[contentType] || extensionFromUrl(product.image_url) || ".jpg";
      const filename = `product-${product.id}-${sanitizeName(product.name)}${ext}`;
      const filePath = path.join(uploadsDir, filename);
      const imageUrl = `/uploads/products/${filename}`;

      fs.writeFileSync(filePath, buffer);
      await db.query("UPDATE products SET image_url = ? WHERE id = ?", [
        imageUrl,
        product.id,
      ]);

      results.push({
        id: product.id,
        ok: true,
        oldUrl: product.image_url,
        newUrl: imageUrl,
        bytes: buffer.length,
      });
      console.log(`OK product ${product.id}: ${imageUrl}`);
    } catch (error) {
      results.push({
        id: product.id,
        ok: false,
        oldUrl: product.image_url,
        error: error.message,
      });
      console.error(`FAIL product ${product.id}: ${error.message}`);
    }
  }

  const reportPath = path.join(
    backupDir,
    `product-image-cache-report-${timestamp}.json`
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        backupPath,
        ok: results.filter((item) => item.ok).length,
        failed: results.filter((item) => !item.ok).length,
        results,
      },
      null,
      2
    )
  );

  console.log(
    `Done. Cached ${results.filter((item) => item.ok).length}/${remoteProducts.length} remote images.`
  );
  console.log(`Backup: ${backupPath}`);
  console.log(`Report: ${reportPath}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    db.end().finally(() => process.exit(process.exitCode || 0));
  });
