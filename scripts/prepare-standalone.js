/**
 * Copia .next/static e public para dentro do standalone após o next build.
 * Necessário porque o output standalone não inclui esses assets automaticamente.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");
const staticSrc = path.join(root, ".next", "static");
const staticDst = path.join(standalone, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDst = path.join(standalone, "public");

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(standalone)) {
  console.error("ERRO: .next/standalone não encontrado. Execute com ELECTRON_BUILD=true next build");
  process.exit(1);
}

console.log("Copiando .next/static → standalone/.next/static ...");
copyDir(staticSrc, staticDst);

console.log("Copiando public/ → standalone/public ...");
copyDir(publicSrc, publicDst);

console.log("✓ Standalone preparado para o build Electron.");
