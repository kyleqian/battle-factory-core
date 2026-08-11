// Ground-truth scout probe for ISSUES #80 rank 6 (party-menu residual classes).
// Per-class pixel attribution on the party-menu-status-item-off settled window.
// Reads oracle-NNNNN.png + app-NNNNN.png from a compare run out/ dir and reports,
// per known class region + per oracle->app color pair, the diff pixel counts.
// Run: node --experimental-strip-types tools/probe/rank6-attrib.ts <outdir> [frames...]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const [outDir, ...frameArgs] = process.argv.slice(2);
const frames = frameArgs.length > 0 ? frameArgs.map(Number) : [2150, 2200, 2250];

// Known geometry from docs/party-menu-status-item-ground-truth.md and the
// source (data/party_menu.h sPartyBoxInfoRects / sPartyMenuSpriteCoords).
const REGIONS: Record<string, [number, number, number, number]> = {
  // slot 0 left card: box (8,24) main slot + its text/icon footprint
  "card0-left-box": [8, 24, 88, 56],
  "card0-left-text": [32, 39, 76, 62],
  "card0-mon-icon": [0, 24, 32, 56],
  // slot 1 right top card: wide slot at (96,8)
  "card1-right-top": [96, 8, 232, 40],
  "card1-text": [118, 11, 220, 26],
  "card1-mon-icon": [88, 2, 120, 34],
  // slot 2 right bottom card: wide slot at (96,32)
  "card2-right-bot": [96, 32, 232, 64],
  "card2-text": [118, 35, 220, 50],
  "card2-mon-icon": [88, 26, 120, 58],
  // pokeball/CANCEL buttons
  "buttons": [184, 134, 234, 153],
  // message window strip
  "message-window": [0, 128, 176, 152],
};

function load(path: string): Buffer {
  const png = PNG.sync.read(readFileSync(path));
  return png.data;
}

for (const frame of frames) {
  const pad = String(frame).padStart(5, "0");
  const a = load(join(outDir, `oracle-${pad}.png`));
  const b = load(join(outDir, `app-${pad}.png`));
  let total = 0;
  const regionCounts = new Map<string, number>();
  const colorPairs = new Map<string, { count: number; bbox: [number, number, number, number] }>();
  const topRegionColorPairs = new Map<string, number>();
  for (let y = 0; y < 160; y += 1) {
    for (let x = 0; x < 240; x += 1) {
      const o = (y * 240 + x) * 4;
      const same = a[o] === b[o] && a[o + 1] === b[o + 1] && a[o + 2] === b[o + 2];
      if (same) continue;
      total += 1;
      for (const [name, [x0, y0, x1, y1]] of Object.entries(REGIONS)) {
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
          regionCounts.set(name, (regionCounts.get(name) ?? 0) + 1);
        }
      }
      const key = `(${a[o]},${a[o + 1]},${a[o + 2]})->(${b[o]},${b[o + 1]},${b[o + 2]})`;
      const entry = colorPairs.get(key);
      if (entry) {
        entry.count += 1;
        if (x < entry.bbox[0]) entry.bbox[0] = x;
        if (y < entry.bbox[1]) entry.bbox[1] = y;
        if (x > entry.bbox[2]) entry.bbox[2] = x;
        if (y > entry.bbox[3]) entry.bbox[3] = y;
      } else {
        colorPairs.set(key, { count: 1, bbox: [x, y, x, y] });
      }
      if (y <= 80) topRegionColorPairs.set(key, (topRegionColorPairs.get(key) ?? 0) + 1);
    }
  }
  console.log(`\n=== frame ${frame}: total diff ${total}px ===`);
  console.log("per-region counts:");
  for (const [name, count] of [...regionCounts.entries()].sort((p, q) => q[1] - p[1])) {
    console.log(`  ${name.padEnd(20)} ${String(count).padStart(6)}`);
  }
  const assigned = [...regionCounts.values()].reduce((s, n) => s + n, 0);
  console.log(`  sum of region counts: ${assigned} (overlap allowed)`);
  console.log("top color pairs (oracle)->(app):");
  const top = [...colorPairs.entries()].sort((p, q) => q[1].count - p[1].count).slice(0, 25);
  for (const [pair, { count, bbox }] of top) {
    console.log(`  ${String(count).padStart(6)} ${pair.padEnd(34)} bbox=${bbox.join(",")}`);
  }
  console.log(`top color pairs in y<=80 region (cards):`);
  for (const [pair, count] of [...topRegionColorPairs.entries()].sort((p, q) => q[1] - p[1]).slice(0, 20)) {
    console.log(`  ${String(count).padStart(6)} ${pair}`);
  }
}
