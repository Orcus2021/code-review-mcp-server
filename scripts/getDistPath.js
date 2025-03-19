import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// 獲取當前文件的目錄
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 獲取項目根目錄
const rootDir = path.resolve(__dirname, "..");
// 獲取 dist/index.js 的絕對路徑
const indexPath = path.resolve(rootDir, "dist", "index.js");

// 輸出路徑
console.log(indexPath);
