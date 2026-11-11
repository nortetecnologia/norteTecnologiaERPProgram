const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "release", "win-unpacked");
const dest = path.join(__dirname, "..", "..", "Norte Tecnologia ERP Desktop");

if (!fs.existsSync(src)) {
  console.error("win-unpacked nao encontrado em:", src);
  process.exit(1);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const dstPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

console.log("Copiando para:", dest);
copyDir(src, dest);
console.log("✓ Programa disponivel em:", path.join(dest, "Norte Tecnologia ERP.exe"));
console.log("   Abra essa pasta e execute o .exe de dentro dela.");
