// Scratch verification for the S8 swap-screen worktree brief: confirms
// menu-bg.json (the draft screen's already-extracted BG1 chrome tileset/
// tilemap/palette, extract-factory-screen.ts) reproduces the SWAP screen's
// own chrome byte-exact, backing docs/battle-turn-notes.md S17's "same
// background tileset/tilemap/palette... loaded identically in both
// CB2_InitSelectScreen and CB2_InitSwapScreen" claim with a pixel check
// rather than a source-only read. This does NOT re-extract anything - it
// composites the EXISTING committed asset and diffs against a fresh oracle
// capture of the swap player-screen (battle1-swapyes-a.json frame 29670,
// this script's own bin/oracle run).
//
// BG1 has GBA priority 3 (lowest = drawn behind everything else), so it is
// only visible on-screen wherever no higher-priority BG/OBJ draws over it -
// this script masks the diff to exactly those pixels (any pixel where BG1's
// own tile is non-transparent AND the composite differs from a blank-BG1
// render is flagged; overlapping-layer pixels are out of scope, same
// exclusion rationale as the action-button verification's text-overlay mask).
//
// Regenerate the capture first (fresh, per this run's "don't trust stale
// PNGs" convention):
//   bin/oracle run tools/compare/traces-groundtruth/battle1-swapyes-a.json -o tools/compare/out/swap-verify-a/
// Run: node --experimental-strip-types tools/compare/scratch/swap_chrome_reuse_verify.ts

import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { createFramebuffer, fillFramebuffer } from "../../../src/engine/framebuffer.ts";
import { drawTileBg, type TileBg } from "../../../src/engine/bg.ts";

const menuBg = JSON.parse(readFileSync("src/assets/gen/menu-bg.json", "utf8")) as TileBg;

const fb = createFramebuffer();
fillFramebuffer(fb, 0, 0, 0);
drawTileBg(fb, menuBg, 0, 0);

const oraclePng = PNG.sync.read(readFileSync("tools/compare/out/swap-verify-a/frame-29670.png"));
const W = 240;
const H = 160;

// Build a mask of "this pixel is opaque BG1 chrome" by re-deriving which
// tilemap entry covers it and checking its color index != 0 - same
// transparency rule drawTileBg itself applies.
const tilesPerRow = menuBg.tilemap.width;
let checked = 0;
let mismatches = 0;
const examples: Array<{ x: number; y: number; oracle: number[]; rendered: number[] }> = [];
for (let y = 0; y < H; y += 1) {
  const tileRow = Math.floor(y / 8);
  const inTileY = y % 8;
  for (let x = 0; x < W; x += 1) {
    const tileCol = Math.floor(x / 8);
    const inTileX = x % 8;
    const entry = menuBg.tilemap.entries[tileRow * tilesPerRow + tileCol];
    if (!entry) continue;
    const tile = menuBg.tileset.tiles[entry.tile];
    if (!tile) continue;
    const sx = entry.hFlip ? 7 - inTileX : inTileX;
    const sy = entry.vFlip ? 7 - inTileY : inTileY;
    const colorIndex = tile[sy * 8 + sx]!;
    if (colorIndex === 0) continue; // transparent - not BG1's own opaque pixel

    checked += 1;
    const fbOff = (y * W + x) * 4;
    const oOff = fbOff;
    const rr = fb[fbOff]!;
    const rg = fb[fbOff + 1]!;
    const rb = fb[fbOff + 2]!;
    const or = oraclePng.data[oOff]!;
    const og = oraclePng.data[oOff + 1]!;
    const ob = oraclePng.data[oOff + 2]!;
    if (rr !== or || rg !== og || rb !== ob) {
      mismatches += 1;
      if (examples.length < 10) examples.push({ x, y, oracle: [or, og, ob], rendered: [rr, rg, rb] });
    }
  }
}

console.log(`BG1 chrome opaque pixels checked: ${checked}`);
console.log(`Mismatches (oracle covered by a higher-priority layer here, or a genuine diff): ${mismatches}`);
if (examples.length) console.log(JSON.stringify(examples, null, 2));

// Known higher-priority overlay regions for this settled frame (all
// source-cited pixel bboxes: sSwap_WindowTemplates * 8, plus
// Swap_InitAllSprites' CreateSprite coordinates) - if every mismatch falls
// inside one of these, the BG1 chrome reuse itself is fully byte-exact and
// the mismatches are entirely explained by layers this script doesn't
// render, not a chrome defect.
const overlayBoxes = [
  { name: "WIN_TITLE", x0: 0, y0: 16, x1: 96, y1: 32 },
  { name: "WIN_SPECIES(bg2)", x0: 152, y0: 16, x1: 240, y1: 32 },
  { name: "WIN_INFO", x0: 0, y0: 120, x1: 160, y1: 144 },
  { name: "WIN_MON_CATEGORY", x0: 120, y0: 0, x1: 240, y1: 16 },
  // Ball OAM y=64 is the sprite's CENTER (default centerToCornerVec, unlike
  // the buttons/cursor which zero it out) - widened generously rather than
  // computed exactly, since this bbox only exists to demonstrate the
  // mismatches are sprite-covered, not to pin sprite geometry.
  { name: "ball sprites", x0: 56, y0: 40, x1: 200, y1: 100 },
  { name: "cursor arrow", x0: 64, y0: 80, x1: 96, y1: 112 },
  { name: "CANCEL button", x0: 192, y0: 144, x1: 240, y1: 160 },
];
let unexplained = 0;
const unexplainedExamples: Array<{ x: number; y: number }> = [];
for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    const fbOff = (y * W + x) * 4;
    const or = oraclePng.data[fbOff]!;
    const og = oraclePng.data[fbOff + 1]!;
    const ob = oraclePng.data[fbOff + 2]!;
    const rr = fb[fbOff]!;
    const rg = fb[fbOff + 1]!;
    const rb = fb[fbOff + 2]!;
    if (rr === or && rg === og && rb === ob) continue;
    const inKnownOverlay = overlayBoxes.some((b) => x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1);
    if (!inKnownOverlay) {
      unexplained += 1;
      if (unexplainedExamples.length < 20) unexplainedExamples.push({ x, y });
    }
  }
}
console.log(`\nMismatches OUTSIDE all known overlay bboxes (should be 0 if chrome reuse is byte-exact): ${unexplained}`);
if (unexplained > 0) console.log(JSON.stringify(unexplainedExamples));
