// dl1: per-source-module bytes of the browser lib build. Rebuilds vite.lib.config.ts (or vite.headless.config.ts with
// `--headless`) into a scratch outDir with a stats plugin, reads rollup's rendered module code per chunk, and writes
// .integration/dl1/modules[-headless].json: [{ chunk, id, raw, brotli }] (brotli q11 of the module's rendered code alone, so
// small modules are over-counted relative to their share of a chunk, big JSON tables are accurate).
// Usage: node tools/bundle/moduleBytes.mjs [--headless] [--top 40]
import { mkdirSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";
import { build } from "vite";

const headless = process.argv.includes("--headless");
const topAt = process.argv.indexOf("--top");
const top = topAt > 0 ? Number(process.argv[topAt + 1]) : 40;
const br = (s) => brotliCompressSync(Buffer.from(s), { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24 } }).length;
const cwd = process.cwd();
const rows = [];
const statsPlugin = {
  name: "dl1-module-stats",
  generateBundle(_opts, bundle) {
    for (const out of Object.values(bundle)) {
      if (out.type !== "chunk") continue;
      const chunk = out.name;
      for (const [id, m] of Object.entries(out.modules)) {
        if (!m.code) continue;
        rows.push({ chunk, id: relative(cwd, id.replace(/\?.*$/, "")), raw: Buffer.byteLength(m.code), brotli: br(m.code) });
      }
    }
  },
};
await build({
  configFile: headless ? "vite.headless.config.ts" : "vite.lib.config.ts",
  logLevel: "warn",
  plugins: [statsPlugin],
  build: { outDir: `.integration/dl1/dist${headless ? "-headless" : ""}`, emptyOutDir: true, reportCompressedSize: false },
});
mkdirSync(".integration/dl1", { recursive: true });
const outFile = `.integration/dl1/modules${headless ? "-headless" : ""}.json`;
writeFileSync(outFile, JSON.stringify(rows));
rows.sort((a, b) => b.brotli - a.brotli);
const kb = (n) => (n / 1024).toFixed(1).padStart(8);
console.log(`wrote ${outFile} (${rows.length} module records)`);
for (const [chunk, s] of Object.entries(Object.groupBy(rows, (r) => r.chunk)).map(([c, rs]) => [c, rs.reduce((a, r) => a + r.brotli, 0)])) console.log(`chunk ${chunk.padEnd(22)} sum of per-module brotli ${kb(s)} KiB`);
console.log("\nchunk".padEnd(24), "raw KiB".padStart(8), "br KiB".padStart(8), " module");
for (const r of rows.slice(0, top)) console.log(r.chunk.padEnd(23), kb(r.raw), kb(r.brotli), "", r.id);
