// Throwaway diag: per-pixel color classification of sendout.json's 1485-1495
// span (and neighbors 1482-1484, 1497-1498 for context), against the fresh
// oracle baseline already captured in tools/compare/out/sendout-baseline.
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { renderAppTrace } from "../appTrace.ts";

const trace = JSON.parse(readFileSync("tools/compare/traces/sendout.json", "utf8"));
const captures = await renderAppTrace(trace);
const byFrame = new Map(captures.map((c) => [c.frame, c]));

const ticks = [1482, 1483, 1484, 1485, 1486, 1487, 1488, 1489, 1490, 1491, 1492, 1493, 1494, 1495, 1497, 1498];

for (const tick of ticks) {
  const cap = byFrame.get(tick);
  if (!cap) { console.log(`tick ${tick}: no capture`); continue; }
  const pad = String(tick).padStart(5, "0");
  const oracle = PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
  const app = cap.rgba;
  const rows = [];
  let count = 0;
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      const i = (y * 240 + x) * 4;
      const ar = app[i], ag = app[i+1], ab = app[i+2];
      const or_ = oracle.data[i], og = oracle.data[i+1], ob = oracle.data[i+2];
      if (ar !== or_ || ag !== og || ab !== ob) {
        count++;
        rows.push({ x, y, app: [ar, ag, ab], oracle: [or_, og, ob] });
      }
    }
  }
  console.log(`\n=== tick ${tick}: ${count}px diff ===`);
  // group by (app,oracle) color pair
  const pairs = new Map();
  for (const r of rows) {
    const key = `app(${r.app.join(",")}) oracle(${r.oracle.join(",")})`;
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
  }
  const sorted = [...pairs.entries()].sort((a, b) => b[1] - a[1]);
  for (const [key, n] of sorted.slice(0, 8)) {
    console.log(`  ${n}px: ${key}`);
  }
  // bounding box
  if (rows.length) {
    const xs = rows.map(r => r.x), ys = rows.map(r => r.y);
    console.log(`  bbox x[${Math.min(...xs)},${Math.max(...xs)}] y[${Math.min(...ys)},${Math.max(...ys)}]`);
  }
}
