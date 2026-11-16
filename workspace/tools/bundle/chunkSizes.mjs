// dl1: raw / gzip / brotli (q11, like a CDN) per dist-lib chunk. Usage: node tools/bundle/chunkSizes.mjs [dist-lib]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const root = process.argv[2] ?? "dist-lib";
const br = (b) => brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24, [constants.BROTLI_PARAM_SIZE_HINT]: b.length } }).length;
const kb = (n) => (n / 1024).toFixed(1).padStart(9);

const rows = [];
for (const dir of ["", "chunks", "chunks-headless"]) {
  for (const name of readdirSync(join(root, dir))) {
    const file = join(root, dir, name);
    if (!name.endsWith(".js") || !statSync(file).isFile()) continue;
    const buf = readFileSync(file);
    rows.push({ file: join(dir, name), raw: buf.length, gzip: gzipSync(buf, { level: 9 }).length, brotli: br(buf) });
  }
}
rows.sort((a, b) => a.file.split("/")[0].localeCompare(b.file.split("/")[0]) || b.brotli - a.brotli);
console.log("file".padEnd(58), "raw KiB".padStart(9), "gzip KiB".padStart(9), "brotli KiB".padStart(11));
const sums = {};
for (const r of rows) {
  console.log(r.file.padEnd(58), kb(r.raw), kb(r.gzip), kb(r.brotli).padStart(2));
  const g = r.file.includes("chunks-headless") || r.file === "headless.js" ? "headless" : "browser";
  sums[g] ??= { raw: 0, gzip: 0, brotli: 0 };
  for (const k of ["raw", "gzip", "brotli"]) sums[g][k] += r[k];
}
for (const [g, s] of Object.entries(sums)) console.log(`TOTAL ${g}`.padEnd(58), kb(s.raw), kb(s.gzip), kb(s.brotli).padStart(2));
