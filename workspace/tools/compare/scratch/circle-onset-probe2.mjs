// Follow-up to circle-onset-probe.mjs: full-frame scan (not just row 0/159)
// for the first frame containing a distinctive (non-white/gray/black) circle
// sprite palette color, to pin the true onset independent of which specific
// row a sprite's edge first reaches.
import { PNG } from "pngjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import circlesAsset from "../../../src/assets/gen/battle-transition-frontier-circles.json" with { type: "json" };

const EXCLUDE = new Set(["0,0,0", "255,255,255", "115,123,132"]);
const PALETTE = new Set(
  circlesAsset.circleSprites.palette
    .map((c) => `${c.r},${c.g},${c.b}`)
    .filter((key) => !EXCLUDE.has(key)),
);

function scanDir(dir, prefix, startAbs, endAbs) {
  const out = [];
  for (let abs = startAbs; abs <= endAbs; abs += 1) {
    const name = `${prefix}${String(abs).padStart(5, "0")}.png`;
    const path = join(dir, name);
    let png;
    try {
      png = PNG.sync.read(readFileSync(path));
    } catch {
      continue;
    }
    let hits = 0;
    let minX = 999, maxX = -1, minY = 999, maxY = -1;
    for (let y = 0; y < 160; y += 1) {
      for (let x = 0; x < 240; x += 1) {
        const off = (y * 240 + x) * 4;
        const key = `${png.data[off]},${png.data[off + 1]},${png.data[off + 2]}`;
        if (PALETTE.has(key)) {
          hits += 1;
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      }
    }
    if (hits > 0) out.push({ abs, hits, bbox: [minX, minY, maxX, maxY] });
  }
  return out;
}

console.log("GOLD (abs 2495-2620), first 5 hit frames:");
console.log(scanDir("/tmp/gold-close-probe", "pre-checkpoint-frame-", 2495, 2620).slice(0, 5));

console.log("\nSILVER (abs 3195-3300), first 5 hit frames:");
console.log(scanDir("/tmp/silver-flicker-probe", "pre-checkpoint-frame-", 3195, 3300).slice(0, 5));
