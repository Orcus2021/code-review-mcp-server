import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const indexPath = path.resolve(rootDir, "dist", "index.js");

console.log(indexPath);
