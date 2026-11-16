// dl1: which src/ modules does a real play route not execute? Reads V8 block coverage written by
//   NODE_V8_COVERAGE=.integration/dl1/cov node --experimental-strip-types tools/soak/randomRoundSoak.ts --seed N --policy winning-swap --render-every 4 --max-frames F
// (the soak drives the same tick() + render() the browser lib runs), ORs the runs, paints covered bytes per src/*.ts file and joins
// them with .integration/dl1/modules.json (tools/bundle/moduleBytes.mjs) for the shipped brotli size per module.
// A module that is loaded but has ~0% covered bytes after the soak is a dead-code CANDIDATE, not proof: confirm with grep for importers.
// Usage: node tools/bundle/deadCode.mjs [covDir] [--top 40]
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const covDir = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".integration/dl1/cov";
const topAt = process.argv.indexOf("--top");
const top = topAt > 0 ? Number(process.argv[topAt + 1]) : 40;
const cwd = process.cwd();
const covered = new Map(); // file -> Uint8Array
for (const name of readdirSync(covDir)) {
  for (const script of JSON.parse(readFileSync(join(covDir, name), "utf8")).result) {
    if (!script.url.startsWith("file://")) continue;
    const file = relative(cwd, fileURLToPath(script.url));
    if (!file.startsWith("src/") || !file.endsWith(".ts")) continue;
    const size = readFileSync(file).length;
    const bits = covered.get(file) ?? new Uint8Array(size);
    covered.set(file, bits);
    const ranges = script.functions.flatMap((f) => f.ranges).sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset);
    const run = new Uint8Array(size);
    for (const r of ranges) run.fill(r.count > 0 ? 1 : 0, r.startOffset, Math.min(r.endOffset, size));
    for (let i = 0; i < size; i++) bits[i] |= run[i];
  }
}
const mods = new Map();
for (const m of JSON.parse(readFileSync(".integration/dl1/modules.json", "utf8"))) if (m.id.endsWith(".ts")) mods.set(m.id, m);
const rows = [];
for (const [id, m] of mods) {
  const bits = covered.get(id);
  const size = bits?.length ?? readFileSync(id).length;
  const live = bits ? bits.reduce((a, b) => a + b, 0) : 0;
  rows.push({ id, chunk: m.chunk, raw: m.raw, brotli: m.brotli, loaded: !!bits, liveFrac: live / size });
}
const sum = (f) => rows.filter(f).reduce((a, r) => a + r.brotli, 0);
const kb = (n) => (n / 1024).toFixed(1).padStart(7);
console.log(`ts modules shipped: ${rows.length}, brotli ${kb(sum(() => true))} KiB; never loaded by the soak: ${rows.filter((r) => !r.loaded).length} (${kb(sum((r) => !r.loaded))} KiB)`);
console.log(`loaded but <5% executed bytes: ${rows.filter((r) => r.loaded && r.liveFrac < 0.05).length} (${kb(sum((r) => r.loaded && r.liveFrac < 0.05))} KiB); estimated unexecuted brotli over all: ${kb(rows.reduce((a, r) => a + r.brotli * (1 - r.liveFrac), 0))} KiB`);
console.log("\nlive%   br KiB  raw KiB chunk       module");
for (const r of rows.sort((a, b) => b.brotli * (1 - b.liveFrac) - a.brotli * (1 - a.liveFrac)).slice(0, top)) console.log(`${(r.liveFrac * 100).toFixed(0).padStart(4)}% ${kb(r.brotli)} ${kb(r.raw)} ${r.chunk.padEnd(10)} ${r.id}${r.loaded ? "" : "  (not loaded)"}`);
