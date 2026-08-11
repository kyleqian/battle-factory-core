// Scratch: dump the APP's OWN rendered frames around tick 4934 (no oracle
// involved) to see exactly what the app draws at 4933/4934/4935/4936 and
// characterize the one-tick blip found by autopsy_4934.mjs (oracle is
// static 4928-4934, changes at 4935; app matches oracle everywhere in
// 4925-4960 EXCEPT 4934 itself).
import { writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";
import { readFileSync } from "node:fs";
import { renderAppTrace } from "../../appTrace.ts";

const trace = JSON.parse(readFileSync("tools/compare/traces/turn4-doubleteam.json", "utf8"));
const ticks = [];
for (let t = 4930; t <= 4938; t++) ticks.push(t);
trace.captureFrames = ticks;

const captures = await renderAppTrace(trace);
const outDir = "tools/compare/scratch/redraw-extremum/out-4934-app";
mkdirSync(outDir, { recursive: true });
const byTick = new Map();
for (const c of captures) {
  byTick.set(c.frame, c.rgba);
  writeFileSync(`${outDir}/app-tick-${c.frame}.png`, PNG.sync.write({ width: 240, height: 160, data: c.rgba }));
}

function diffRect(a, b) {
  let minX = 240, minY = 160, maxX = -1, maxY = -1, count = 0;
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      const o = (y * 240 + x) * 4;
      if (a[o] !== b[o] || a[o + 1] !== b[o + 1] || a[o + 2] !== b[o + 2]) {
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { count, minX, minY, maxX, maxY };
}

console.log("--- app consecutive-neighbor diffs 4930..4938 ---");
for (let t = 4930; t < 4938; t++) {
  const a = byTick.get(t), b = byTick.get(t + 1);
  console.log(t, "->", t + 1, diffRect(a, b));
}

function px(rgba, x, y) {
  const o = (y * 240 + x) * 4;
  return [rgba[o], rgba[o + 1], rgba[o + 2]];
}
console.log("\n--- app sample pixels ---");
for (const [x, y] of [[16, 118], [16, 128], [16, 140], [120, 118]]) {
  console.log(
    `(${x},${y})`,
    "4933=", px(byTick.get(4933), x, y),
    "4934=", px(byTick.get(4934), x, y),
    "4935=", px(byTick.get(4935), x, y),
  );
}
