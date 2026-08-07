// Diff two oracle frames, report diff count + bbox + dominant regions.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
const [dir, faS, fbS] = process.argv.slice(2);
const load = (f: number) => PNG.sync.read(readFileSync(join(dir, `frame-${String(f).padStart(5, "0")}.png`))).data;
const a = load(Number(faS)), b = load(Number(fbS));
let n = 0; let minX = 999, minY = 999, maxX = -1, maxY = -1;
const ys = new Map<number, number>();
for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
  const o = (y * 240 + x) * 4;
  if (a[o] !== b[o] || a[o + 1] !== b[o + 1] || a[o + 2] !== b[o + 2]) {
    n++;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    ys.set(y, (ys.get(y) ?? 0) + 1);
  }
}
const topRows = [...ys.entries()].sort((p, q) => q[1] - p[1]).slice(0, 8).map(([y, c]) => `y${y}:${c}`);
console.log(`${faS}->${fbS}: ${n}px bbox=(${minX},${minY})-(${maxX},${maxY}) rows: ${topRows.join(" ")}`);
