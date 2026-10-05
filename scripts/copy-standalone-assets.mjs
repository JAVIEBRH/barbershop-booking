// Next.js `output: "standalone"` traces only the server bundle + its node_modules —
// it does NOT copy `.next/static` (client JS/CSS chunks) or `public/` (favicon, svgs)
// into `.next/standalone/`. Running `.next/standalone/server.js` as-is 404s every
// asset. This script copies both after each build so the standalone folder is
// actually deployable on its own. Node's fs (not `cp -r`) so it runs the same on the
// VPS (Linux) and on a dev machine (Windows/macOS).
import { cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const copies = [
  [path.join(root, ".next", "static"), path.join(root, ".next", "standalone", ".next", "static")],
  [path.join(root, "public"), path.join(root, ".next", "standalone", "public")],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) {
    console.warn(`[copy-standalone-assets] skipping missing source: ${from}`);
    continue;
  }
  cpSync(from, to, { recursive: true });
  console.log(`[copy-standalone-assets] copied ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}
