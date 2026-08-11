import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const tick = process.argv[2];
const pad = String(tick).padStart(5, "0");
const oracle = PNG.sync.read(readFileSync(`tools/compare/out/e2a4-scratch/oracle-${pad}.png`));
const app = PNG.sync.read(readFileSync(`tools/compare/out/e2a4-scratch/app-${pad}.png`));
const W = oracle.width, H = oracle.height;
let diffs = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const or = [oracle.data[i], oracle.data[i+1], oracle.data[i+2]];
    const ap = [app.data[i], app.data[i+1], app.data[i+2]];
    if (or[0]!==ap[0] || or[1]!==ap[1] || or[2]!==ap[2]) {
      diffs.push({x, y, oracle: or, app: ap});
    }
  }
}
console.log(`tick ${tick}: ${diffs.length} diffs`);
for (const d of diffs) console.log(JSON.stringify(d));
