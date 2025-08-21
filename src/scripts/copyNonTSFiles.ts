import * as fs from "fs";
import * as path from "path";

const sourceDir = path.join(process.cwd(), "src/core"); 
const destDir = path.join(process.cwd(), "out/core");

function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(file: string): void {
  const sourcePath = path.join(sourceDir, file);
  const destPath = path.join(destDir, file);

  fs.copyFileSync(sourcePath, destPath);
  console.log(`Copied: ${file}`);
}

function copyPythonFiles(): void {
  ensureDirectoryExists(destDir);

  const files = fs
    .readdirSync(sourceDir)
    .filter((file) => file.endsWith(".py") || file.endsWith(".json")); 

  files.forEach(copyFile);
}

copyPythonFiles();
