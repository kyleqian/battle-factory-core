// Scratch: pixel autopsy of tick 4934 (docs/battle-turn-notes.md §22's own
// "redraw extremum" exclusion in turn4-doubleteam.json). Replays the
// committed trace's own button script verbatim, capturing a dense window
// 4925-4943 (press tick through +18) to see EXACTLY what changes at 4934
// relative to both neighbors, and whether it matches the previous tick's
// content, the next tick's, or neither.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { PNG } from "pngjs";

const ORACLE_URL = (process.env.POKEBENCH_ORACLE_URL ?? "http://127.0.0.1:8012").replace(/\/$/, "");

const trace = JSON.parse(readFileSync("tools/compare/traces/turn4-doubleteam.json", "utf8"));
const ticks = [];
for (let t = 4925; t <= 4943; t++) ticks.push(t);
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

const outDir = "tools/compare/scratch/redraw-extremum/out-4934";
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

console.log("\n--- consecutive-neighbor diffs, 4925..4943 ---");
for (let t = 4925; t < 4943; t++) {
  const a = byTick.get(t), b = byTick.get(t + 1);
  if (!a || !b) continue;
  console.log(t, "->", t + 1, diffRect(a.rgba, b.rgba));
}

console.log("\n--- is tick 4934 == tick 4933 (late) or == tick 4935 (early) or neither? ---");
const t33 = byTick.get(4933), t34 = byTick.get(4934), t35 = byTick.get(4935);
console.log("4934 vs 4933:", diffRect(t33.rgba, t34.rgba));
console.log("4934 vs 4935:", diffRect(t34.rgba, t35.rgba));
console.log("4933 vs 4935:", diffRect(t33.rgba, t35.rgba));

function px(rgba, x, y) {
  const o = (y * 240 + x) * 4;
  return [rgba[o], rgba[o + 1], rgba[o + 2]];
}

// Sample a grid inside the message-box region (roughly y=113-155, x=8-231
// per this dossier's own established message-box bbox) to see WHAT's there.
console.log("\n--- sample pixels in the message-box region at 4933/4934/4935 ---");
for (const [x, y] of [[16, 118], [16, 128], [16, 140], [120, 118], [120, 140], [200, 140], [16, 155], [120, 128]]) {
  console.log(
    `(${x},${y})`,
    "4933=", px(t33.rgba, x, y),
    "4934=", px(t34.rgba, x, y),
    "4935=", px(t35.rgba, x, y),
  );
}
