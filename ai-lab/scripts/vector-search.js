const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const dotenv = require(path.join(rootDir, "be", "node_modules", "dotenv"));
dotenv.config({ path: path.join(rootDir, "be", ".env"), quiet: true });

const { searchVectorIndex } = require("./embedding-core");

const message = process.argv.slice(2).join(" ").trim();

if (!message) {
  console.error('Usage: node ai-lab/scripts/vector-search.js "SSD NVMe dưới 2 triệu"');
  process.exit(1);
}

searchVectorIndex({ message, limit: 8 })
  .then((result) => {
    console.log(
      JSON.stringify(
        {
          model: result.model,
          dimensions: result.dimensions,
          results: result.items.map((item) => ({
            id: item.id,
            name: item.name,
            category_name: item.category_name,
            sale_price: item.sale_price,
            stock: item.stock,
            vector_score: Number(item.vector_score.toFixed(4)),
          })),
        },
        null,
        2
      )
    );
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
