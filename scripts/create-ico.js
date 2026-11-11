const fs = require("fs");
const path = require("path");

async function main() {
  const { default: pngToIco } = require("png-to-ico");
  const src = path.join(__dirname, "..", "public", "icon-512.png");
  const dst = path.join(__dirname, "..", "build-resources", "icon.ico");
  const buf = await pngToIco([src]);
  fs.writeFileSync(dst, buf);
  console.log("✓ icon.ico criado em build-resources/");
}

main().catch(e => { console.error(e); process.exit(1); });
