// Sample oracle vs app colors at specific pixels (known text/icon positions).
// Run: node --experimental-strip-types tools/probe/rank6-samples.ts <outdir> <frame> <x,y> [x,y ...]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
const [outDir, frameStr, ...pts] = process.argv.slice(2);
const frame = Number(frameStr);
const pad = String(frame).padStart(5, "0");
function load(name: string): Buffer {
  return PNG.sync.read(readFileSync(join(outDir, name))).data;
}
const a = load(`oracle-${pad}.png`);
const b = load(`app-${pad}.png`);
const px = (buf: Buffer, x: number, y: number) => {
  const o = (y * 240 + x) * 4;
  return `(${buf[o]},${buf[o + 1]},${buf[o + 2]})`;
};
for (const pt of pts) {
  const [x, y] = pt.split(",").map(Number);
  const pa = px(a, x, y);
  const pb = px(b, x, y);
  console.log(`(${x},${y}) oracle=${pa} app=${pb} ${pa === pb ? "MATCH" : ""}`);
}
