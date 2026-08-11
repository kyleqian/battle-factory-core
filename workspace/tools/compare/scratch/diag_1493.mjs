// Throwaway diag: per-pixel color classification of sendout.json's 1493-1496
// residual, against the fresh oracle/app captures already in tools/compare/out/latest
// (from a `npm run compare -- tools/compare/traces/sendout.json` run this session).
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const ticks = [1490, 1491, 1492, 1493, 1494, 1495, 1496, 1497, 1498, 1499];

for (const tick of ticks) {
  const pad = String(tick).padStart(5, "0");
  let app, oracle;
  try {
    app = PNG.sync.read(readFileSync(`tools/compare/out/latest/app-${pad}.png`));
    oracle = PNG.sync.read(readFileSync(`tools/compare/out/latest/oracle-${pad}.png`));
  } catch (e) {
    console.log(`tick ${tick}: no capture (${e.message})`);
    continue;
  }
  const rows = [];
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      const i = (y * 240 + x) * 4;
      const ar = app.data[i], ag = app.data[i + 1], ab = app.data[i + 2];
      const or_ = oracle.data[i], og = oracle.data[i + 1], ob = oracle.data[i + 2];
      if (ar !== or_ || ag !== og || ab !== ob) {
        rows.push({ x, y, app: [ar, ag, ab], oracle: [or_, og, ob] });
      }
    }
  }
  console.log(`\n=== tick ${tick}: ${rows.length}px diff ===`);
  for (const r of rows) {
    console.log(`  (${r.x},${r.y}) app(${r.app.join(",")}) oracle(${r.oracle.join(",")})`);
  }
  if (rows.length) {
    const xs = rows.map((r) => r.x), ys = rows.map((r) => r.y);
    console.log(`  bbox x[${Math.min(...xs)},${Math.max(...xs)}] y[${Math.min(...ys)},${Math.max(...ys)}]`);
  }
}
