// Dump distinct colors of a frame (top 20 by count).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
const [dir, frameS] = process.argv.slice(2);
const f = Number(frameS);
const data = PNG.sync.read(readFileSync(join(dir, `frame-${String(f).padStart(5, "0")}.png`))).data;
const m = new Map<string, number>();
for (let i = 0; i < data.length; i += 4) {
  const k = `(${data[i]},${data[i + 1]},${data[i + 2]})`;
  m.set(k, (m.get(k) ?? 0) + 1);
}
console.log(`frame ${f}: ${[...m.values()].length} distinct colors`);
for (const [c, n] of [...m.entries()].sort((p, q) => q[1] - p[1]).slice(0, 20)) {
  console.log(`  ${String(n).padStart(6)} ${c}`);
}
