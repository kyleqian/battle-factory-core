// Scratch: fetch a handful of ticks and diff them against each other to
// classify the 1742-1747 blank-box / 1748 menu-draw / idle-cycle behavior,
// and to find the exact rectangle that changes relative to the tick-1741
// static-hold frame (harvest-base candidate).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";

const ORACLE_URL = (process.env.POKEBENCH_ORACLE_URL ?? "http://127.0.0.1:8012").replace(/\/$/, "");

const trace = JSON.parse(readFileSync("tools/compare/traces/menu-materialize.json", "utf8"));
const ticks = [1693, 1741, 1742, 1747, 1748, 1749, 1750, 1759, 1768, 1777, 1786, 1812, 1813];
trace.captureFrames = ticks;

const res = await fetch(`${ORACLE_URL}/v1/run`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(trace),
});
const payload = await res.json();
const byTick = new Map();
for (const c of payload.captures) {
  const png = PNG.sync.read(Buffer.from(c.pngBase64, "base64"));
  byTick.set(c.frame, { sha: c.sha256, rgba: png.data });
}

mkdirSync("tools/compare/scratch/menu-idle/out", { recursive: true });
for (const [tick, { sha, rgba }] of byTick) {
  writeFileSync(`tools/compare/scratch/menu-idle/out/tick-${tick}.png`, PNG.sync.write({ width: 240, height: 160, data: rgba }));
  console.log(tick, sha.slice(0, 8));
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

console.log("--- diffs vs 1741 ---");
const base = byTick.get(1741).rgba;
for (const t of [1693, 1742, 1747, 1748]) {
  console.log(t, diffRect(base, byTick.get(t).rgba));
}

console.log("--- 1742 vs 1747 (should be identical, flat blank hold) ---");
console.log(diffRect(byTick.get(1742).rgba, byTick.get(1747).rgba));

console.log("--- sample pixel colors in message-box region at 1742 ---");
function px(rgba, x, y) {
  const o = (y * 240 + x) * 4;
  return [rgba[o], rgba[o + 1], rgba[o + 2]];
}
for (const [x, y] of [[20, 115], [16, 121], [120, 130], [16, 140], [8, 113], [230, 155]]) {
  console.log(x, y, px(byTick.get(1742).rgba, x, y));
}

console.log("--- idle cycle diffs among phase-representative ticks ---");
for (const [a, b] of [[1750, 1759], [1759, 1768], [1768, 1777], [1777, 1786]]) {
  console.log(a, "vs", b, diffRect(byTick.get(a).rgba, byTick.get(b).rgba));
}

console.log("--- 1748 vs 1750 (should be identical, phase-0 sha match per dossier) ---");
console.log(diffRect(byTick.get(1748).rgba, byTick.get(1750).rgba));

console.log("--- 1749 vs 1777 (both phase-3-ish per dossier table) ---");
console.log(diffRect(byTick.get(1749).rgba, byTick.get(1777).rgba));
