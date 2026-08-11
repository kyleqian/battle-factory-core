// Scratch verification for the S8 swap-screen worktree brief: composite the
// newly-extracted action-box.json/action-highlight.json tiles (via
// extract-factory-swap-screen.ts) into the CANCEL and PKMN FOR SWAP button
// pill shapes at the exact sprite coordinates battle_factory_screen.c's
// Swap_InitAllSprites uses, and diff against a FRESH oracle capture (this
// script's own bin/oracle run, not a stale committed PNG) of
// battle1-swapyes-b.json frame 30001 - the settled opponent-picker screen
// where both buttons are visible, unhighlighted (§17: neither the CANCEL nor
// action-highlight state is ever exercised on-screen in any committed trace).
//
// Regenerate the capture first (fresh, per this run's "don't trust stale
// PNGs" convention):
//   bin/oracle run tools/compare/traces-groundtruth/battle1-swapyes-b.json -o tools/compare/out/swap-verify-b/
// Run: node tools/compare/scratch/swap_action_buttons_verify.mjs

import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const actionBox = JSON.parse(readFileSync("src/assets/gen/action-box.json", "utf8"));

function tileToIndexed(tile) {
  // tile.tiles[i] is 64 palette indices (row-major 8x8); build a flat
  // columns*8 x rows*8 index grid. Index 0 is OBJ transparency (GBA: OBJ
  // palette-index 0 within a subpalette never draws - the backdrop/BG shows
  // through), so it is kept as raw index, not resolved to a color.
  const w = tile.columns * 8;
  const h = tile.rows * 8;
  const out = new Uint8Array(w * h);
  for (let ty = 0; ty < tile.rows; ty += 1) {
    for (let tx = 0; tx < tile.columns; tx += 1) {
      const px = tile.tiles[ty * tile.columns + tx];
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          out[(ty * 8 + y) * w + (tx * 8 + x)] = px[y * 8 + x];
        }
      }
    }
  }
  return { w, h, indices: out };
}

// Blits only opaque (index != 0) sprite pixels onto the RGB composite,
// leaving transparent pixels as whatever the composite was seeded with
// (the oracle's own crop - i.e. "let the real background show through").
function blit(dst, dstW, sprite, palette, dx, dy) {
  let opaquePixels = 0;
  for (let y = 0; y < sprite.h; y += 1) {
    for (let x = 0; x < sprite.w; x += 1) {
      const idx = sprite.indices[y * sprite.w + x];
      if (idx === 0) continue;
      opaquePixels += 1;
      const c = palette[idx];
      const doff = ((dy + y) * dstW + (dx + x)) * 3;
      dst[doff] = c.r;
      dst[doff + 1] = c.g;
      dst[doff + 2] = c.b;
    }
  }
  return opaquePixels;
}

const left = tileToIndexed(actionBox.left);
const right = tileToIndexed(actionBox.right);
const palette = actionBox.palette;

const oraclePng = PNG.sync.read(readFileSync("tools/compare/out/swap-verify-b/frame-30001.png"));
const W = oraclePng.width;

// Seeds the composite from the oracle's own crop (so transparent sprite
// pixels - and the separate BG text-window layer this extractor does NOT
// cover - trivially "match"), then overlays only the sprite's own opaque
// pixels and diffs just those against the oracle. This isolates "does the
// extracted button graphic's own opaque pixels match the oracle" from (a)
// OBJ transparency letting BG chrome show through and (b) the CANCEL/PKMN
// FOR SWAP text labels, which are a separate BG window layer
// (SWAP_WIN_ACTION_FADE/OPTIONS) not part of this extraction.
function cropDiff(label, dx, dy, w, h, sprites) {
  const composite = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const oOff = ((dy + y) * W + (dx + x)) * 4;
      const cOff = (y * w + x) * 3;
      composite[cOff] = oraclePng.data[oOff];
      composite[cOff + 1] = oraclePng.data[oOff + 1];
      composite[cOff + 2] = oraclePng.data[oOff + 2];
    }
  }
  const opaqueMask = new Uint8Array(w * h);
  let totalOpaque = 0;
  for (const [sprite, ox, oy] of sprites) {
    totalOpaque += blit(composite, w, sprite, palette, ox - dx, oy - dy);
    for (let y = 0; y < sprite.h; y += 1) {
      for (let x = 0; x < sprite.w; x += 1) {
        if (sprite.indices[y * sprite.w + x] !== 0) opaqueMask[(oy - dy + y) * w + (ox - dx + x)] = 1;
      }
    }
  }
  // The button pill's own opaque pixels sit UNDER a separate BG text-window
  // layer (SWAP_WIN_ACTION_FADE/OPTIONS) that prints "CANCEL"/"PKMN FOR
  // SWAP" in solid white (255,255,255) - not part of this extraction (no
  // sprite here draws text). Mismatches where the oracle is pure white are
  // that text showing through; anything else is a genuine extraction defect.
  let textOverlayPixels = 0;
  let unexplainedMismatches = 0;
  const mismatchList = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (!opaqueMask[y * w + x]) continue; // only check pixels this asset actually draws
      const oOff = ((dy + y) * W + (dx + x)) * 4;
      const cOff = (y * w + x) * 3;
      const or = oraclePng.data[oOff];
      const og = oraclePng.data[oOff + 1];
      const ob = oraclePng.data[oOff + 2];
      const cr = composite[cOff];
      const cg = composite[cOff + 1];
      const cb = composite[cOff + 2];
      if (or === cr && og === cg && ob === cb) continue;
      if (or === 255 && og === 255 && ob === 255) {
        textOverlayPixels += 1;
        continue;
      }
      unexplainedMismatches += 1;
      if (mismatchList.length < 8) mismatchList.push({ x: dx + x, y: dy + y, oracle: [or, og, ob], composite: [cr, cg, cb] });
    }
  }
  console.log(
    `${label}: ${unexplainedMismatches} unexplained mismatches, ${textOverlayPixels} text-overlay (excluded) / ${totalOpaque} opaque pixels`,
  );
  if (unexplainedMismatches > 0) console.log(JSON.stringify(mismatchList, null, 2));
  return { unexplainedMismatches, textOverlayPixels, totalOpaque };
}

// CANCEL: box_left (16x16) at x=192,y=144; box_right (32x16) at x=208,y=144.
// Total bbox 192..240 x 144..160.
const cancelMismatches = cropDiff("CANCEL button (192,144,48,16)", 192, 144, 48, 16, [
  [left, 192, 144],
  [right, 208, 144],
]);

// PKMN FOR SWAP: box_left at x=160,y=120; box_right at x=176,y=120; box_right
// again at x=208,y=120. Total bbox 160..240 x 120..136.
const pkmnMismatches = cropDiff("PKMN FOR SWAP button (160,120,80,16)", 160, 120, 80, 16, [
  [left, 160, 120],
  [right, 176, 120],
  [right, 208, 120],
]);

const totalUnexplained = cancelMismatches.unexplainedMismatches + pkmnMismatches.unexplainedMismatches;
const totalText = cancelMismatches.textOverlayPixels + pkmnMismatches.textOverlayPixels;
const totalOpaque = cancelMismatches.totalOpaque + pkmnMismatches.totalOpaque;
console.log(
  `\nTotal: ${totalUnexplained} unexplained mismatches, ${totalText} text-overlay (excluded) / ${totalOpaque} opaque button-graphic pixels`,
);
if (totalUnexplained > 0) process.exit(1);
