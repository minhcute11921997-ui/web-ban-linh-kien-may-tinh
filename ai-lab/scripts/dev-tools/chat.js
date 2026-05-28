const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..", "..");
const dotenv = require(path.join(rootDir, "be", "node_modules", "dotenv"));
dotenv.config({ path: path.join(rootDir, "be", ".env"), quiet: true });

const { routeMessage } = require("../tools/router");

const message = process.argv.slice(2).join(" ").trim();

if (!message) {
  console.error('Usage: node ai-lab/scripts/dev-tools/chat.js "Build PC gaming 15 triệu"');
  process.exit(1);
}

routeMessage({ message })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
