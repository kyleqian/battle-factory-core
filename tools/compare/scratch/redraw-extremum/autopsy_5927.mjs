// Scratch: pixel autopsy of tick 5927 (docs/battle-turn-notes.md §23's own
// "redraw extremum" exclusion in turn5-menu.json's reopen). Dense oracle-only
// window 5920-5935 to see exactly what changes at 5927 relative to both
// neighbors.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";

const ORACLE_URL = (process.env.POKEBENCH_ORACLE_URL ?? "http://127.0.0.1:8012").replace(/\/$/, "");

const trace = JSON.parse(readFileSync("tools/compare/traces/turn5-menu.json", "utf8"));
const ticks = [];
for (let t = 5920; t <= 5935; t++) ticks.push(t);
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

const outDir = "tools/compare/scratch/redraw-extremum/out-5927";
mkdirSync(outDir, { recursive: true });
for (const [tick, { sha, rgba }] of byTick) {
  writeFileSync(`${outDir}/tick-${tick}.png`, PNG.sync.write({ width: 240, height: 160, data: rgba }));
  console.log(tick, sha.slice(0, 12));
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

console.log("\n--- oracle-only consecutive-neighbor diffs, 5920..5935 ---");
for (let t = 5920; t < 5935; t++) {
  const a = byTick.get(t), b = byTick.get(t + 1);
  if (!a || !b) continue;
  console.log(t, "->", t + 1, diffRect(a.rgba, b.rgba));
}

console.log("\n--- is oracle(5927) == oracle(5926) or == oracle(5928)? ---");
const t26 = byTick.get(5926), t27 = byTick.get(5927), t28 = byTick.get(5928);
console.log("5927 vs 5926:", diffRect(t26.rgba, t27.rgba));
console.log("5927 vs 5928:", diffRect(t27.rgba, t28.rgba));
console.log("5926 vs 5928:", diffRect(t26.rgba, t28.rgba));

function px(rgba, x, y) {
  const o = (y * 240 + x) * 4;
  return [rgba[o], rgba[o + 1], rgba[o + 2]];
}
console.log("\n--- sample pixels in the onix silhouette region (x=44-99,y=49-110) at 5926/5927/5928 ---");
for (const [x, y] of [[60, 60], [70, 80], [80, 100], [50, 55], [90, 105], [65, 70]]) {
  console.log(`(${x},${y})`, "5926=", px(t26.rgba, x, y), "5927=", px(t27.rgba, x, y), "5928=", px(t28.rgba, x, y));
}
