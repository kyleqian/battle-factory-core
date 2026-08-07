// Track specific pixels across a frame range to extract the fade blend curve.
// Usage: node ... <dir> <start> <end> <x,y> [x,y ...]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
const [dir, startS, endS, ...pts] = process.argv.slice(2);
const start = Number(startS), end = Number(endS);
const points = pts.map((p) => p.split(",").map(Number));
const load = (f: number) => PNG.sync.read(readFileSync(join(dir, `frame-${String(f).padStart(5, "0")}.png`))).data;
console.log("frame | " + points.map(([x, y]) => `(${x},${y})`).join(" | "));
for (let f = start; f <= end; f++) {
  const data = load(f);
  const vals = points.map(([x, y]) => {
    const o = (y * 240 + x) * 4;
    return `(${data[o]},${data[o + 1]},${data[o + 2]})`;
  });
  console.log(`${f} | ${vals.join(" | ")}`);
}
