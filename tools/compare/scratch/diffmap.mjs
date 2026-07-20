import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const tick = process.argv[2];
const x0 = Number(process.argv[3]), y0 = Number(process.argv[4]);
const w = Number(process.argv[5] ?? 24), h = Number(process.argv[6] ?? 24);
const pad = String(tick).padStart(5, "0");
const oracle = PNG.sync.read(readFileSync(`tools/compare/out/e2a4-scratch/oracle-${pad}.png`));
const app = PNG.sync.read(readFileSync(`tools/compare/out/e2a4-scratch/app-${pad}.png`));
const W = oracle.width;

function isFireish(r,g,b) {
  // yellow-red ramp: high R, lowish B typically, or pure bright orange/red/yellow
  return r > 140 && (r - b > 40);
}

let rows = [];
for (let y = y0; y < y0+h; y++) {
  let row = "";
  for (let x = x0; x < x0+w; x++) {
    const i = (y*W+x)*4;
    const or = [oracle.data[i],oracle.data[i+1],oracle.data[i+2]];
    const ap = [app.data[i],app.data[i+1],app.data[i+2]];
    const of = isFireish(...or), af = isFireish(...ap);
    if (of && af) row += "#"; // both fire
    else if (of && !af) row += "O"; // oracle fire only (app missing)
    else if (!of && af) row += "A"; // app fire only (app extra)
    else row += ".";
  }
  rows.push(row);
}
console.log(`tick ${tick} region (${x0},${y0}) ${w}x${h}  # both, O=oracle-only, A=app-only`);
console.log(rows.join("\n"));
