// Scratch probe (rung 2): scan the already-banked oracle PNG sets for the
// first frame where row 0 (top circle sprite) or row 159 (left/right circle
// sprites) contains one of the circle sprite's own distinctive palette
// colors (not scene/room colors) - i.e. the real circle-sprite onset, not
// hand-derived from sprite-geometry formulas. See PROGRESS.md 1310's Next /
// docs/noland-brain-intro-gold-ground-truth.md §8" for context.
import { PNG } from "pngjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import circlesAsset from "../../../src/assets/gen/battle-transition-frontier-circles.json" with { type: "json" };

// Exclude black (transparent index) and white/gray (255,255,255 /
// 115,123,132 both hit the baseline scene from frame 0 - not distinctive).
const EXCLUDE = new Set(["0,0,0", "255,255,255", "115,123,132"]);
const PALETTE = new Set(
  circlesAsset.circleSprites.palette
    .map((c) => `${c.r},${c.g},${c.b}`)
    .filter((key) => !EXCLUDE.has(key)),
);
console.error("Searching for palette colors:", [...PALETTE]);

function scanDir(dir, prefix, startAbs, endAbs) {
  const rows = { 0: [], 159: [] };
  for (let abs = startAbs; abs <= endAbs; abs += 1) {
    const name = `${prefix}${String(abs).padStart(5, "0")}.png`;
    const path = join(dir, name);
    let png;
    try {
      png = PNG.sync.read(readFileSync(path));
    } catch {
      continue;
    }
    for (const y of [0, 159]) {
      let hits = 0;
      const xs = [];
      for (let x = 0; x < 240; x += 1) {
        const off = (y * 240 + x) * 4;
        const key = `${png.data[off]},${png.data[off + 1]},${png.data[off + 2]}`;
        if (PALETTE.has(key)) {
          hits += 1;
          xs.push(x);
        }
      }
      if (hits > 0) rows[y].push({ abs, hits, xRange: [xs[0], xs[xs.length - 1]] });
    }
  }
  return rows;
}

const gold = scanDir("/tmp/gold-close-probe", "pre-checkpoint-frame-", 2495, 2620);
const silver = scanDir("/tmp/silver-flicker-probe", "pre-checkpoint-frame-", 3195, 3300);

console.log("GOLD (abs 2495-2620) - trace-relative = abs-2495:");
console.log("row0 (top) first hits:", gold[0].slice(0, 3));
console.log("row159 (bottom) first hits:", gold[159].slice(0, 3));

console.log("\nSILVER (abs 3195-3300) - flicker-fixture elapsed = abs-3201:");
console.log("row0 (top) first hits:", silver[0].slice(0, 3));
console.log("row159 (bottom) first hits:", silver[159].slice(0, 3));
