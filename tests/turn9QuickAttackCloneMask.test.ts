import { describe, expect, it } from "vitest";
import { drawSpriteSheetBlendedOverFbSkipping, turn9QuickAttackOpaqueMask } from "../src/engine/battleScene.ts";

/**
 * ISSUES #32 (docs/turn9-shake-notes.md's 2026-07-22 PROBE, "Model F"):
 * pins the mask-suppression logic in isolation, on a synthetic overlap -
 * proves the fix's actual mechanism (slot 4's own opaque mask suppresses
 * slot 3's blend there entirely) rather than re-deriving it against the
 * oracle, which `tools/compare/traces/turn9-quickattack.json` already
 * covers pixel-exact (see PROGRESS.md).
 */

// Same formula as battleScene.ts's own private blendChannel (§3 - local to
// that file, replicated here rather than exported, since it's not one of
// this fix's own immediate helpers).
function blendChannel(tgt1: number, tgt2: number, eva: number, evb: number): number {
  return Math.min(255, Math.floor((tgt1 * eva + tgt2 * evb) / 16));
}

// A single 8x8 tile whose top-left 4x4 block is opaque (palette index 1)
// and whose remainder is transparent (index 0) - just enough shape to
// exercise both branches of the mask/skip walk.
function makeHalfOpaqueTileset() {
  const tile = new Array(64).fill(0);
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      tile[y * 8 + x] = 1;
    }
  }
  return { columns: 1, rows: 1, tiles: [tile] };
}

function makeFb(): Uint8Array {
  const fb = new Uint8Array(240 * 160 * 4);
  fb.fill(255); // opaque alpha + a distinct non-zero baseline in every channel
  for (let i = 0; i < fb.length; i += 4) {
    fb[i] = 90;
    fb[i + 1] = 90;
    fb[i + 2] = 90;
    fb[i + 3] = 255;
  }
  return fb;
}

describe("ISSUES #32 fix: turn9QuickAttackOpaqueMask - records exactly which screen pixels a sprite instance's own texels are opaque at", () => {
  it("marks only the tile's opaque (non-zero) texels, offset into screen space", () => {
    const tileset = makeHalfOpaqueTileset();
    const mask = turn9QuickAttackOpaqueMask(tileset, 10, 20, Infinity);
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const expected = x < 4 && y < 4 ? 1 : 0;
        expect(mask[(20 + y) * 240 + (10 + x)]).toBe(expected);
      }
    }
  });

  it("respects the ground clip (maxY) the same way the caller's own erase/redraw clip does", () => {
    const tileset = makeHalfOpaqueTileset();
    const mask = turn9QuickAttackOpaqueMask(tileset, 10, 20, 22); // clips off row y=22 (local row 2) and below
    expect(mask[20 * 240 + 10]).toBe(1); // local (0,0) - kept
    expect(mask[21 * 240 + 10]).toBe(1); // local (0,1) - kept
    expect(mask[22 * 240 + 10]).toBe(0); // local (0,2) - clipped even though the texel is opaque
    expect(mask[23 * 240 + 10]).toBe(0); // local (0,3) - clipped
  });
});

describe("ISSUES #32 fix: drawSpriteSheetBlendedOverFbSkipping - suppresses the OAM-tie loser's blend entirely under the winner's own mask, avoiding the double-blend", () => {
  it("leaves masked pixels completely untouched and blends unmasked pixels with the documented eva/evb formula", () => {
    const tileset = makeHalfOpaqueTileset();
    const palette = [
      { r: 0, g: 0, b: 0 }, // index 0, unused (transparent)
      { r: 200, g: 100, b: 50 }, // index 1
    ];
    const fb = makeFb();
    // Mask out the left half (x<2) of the tile's own opaque region, simulating slot 4's own footprint winning there.
    const skipMask = new Uint8Array(240 * 160);
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        skipMask[(20 + y) * 240 + (10 + x)] = 1;
      }
    }
    drawSpriteSheetBlendedOverFbSkipping(fb, tileset, palette, 10, 20, 12, 8, Infinity, skipMask);
    // Masked pixels (x<2): fb must be untouched (still the 90,90,90 baseline), not blended at all.
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        const o = ((20 + y) * 240 + (10 + x)) * 4;
        expect([fb[o], fb[o + 1], fb[o + 2]]).toEqual([90, 90, 90]);
      }
    }
    // Unmasked opaque pixels (2<=x<4): fb must show the ordinary blend against the pre-existing baseline.
    const expected = [blendChannel(200, 90, 12, 8), blendChannel(100, 90, 12, 8), blendChannel(50, 90, 12, 8)];
    for (let y = 0; y < 4; y += 1) {
      for (let x = 2; x < 4; x += 1) {
        const o = ((20 + y) * 240 + (10 + x)) * 4;
        expect([fb[o], fb[o + 1], fb[o + 2]]).toEqual(expected);
      }
    }
  });

  it("synthetic overlap: suppressing slot 3 under slot 4's mask yields slot 4's blend against the plain post-real baseline, NOT a double-blend of slot 3's own already-blended result (the actual ISSUES #32 bug)", () => {
    const tileset = makeHalfOpaqueTileset(); // stands in for both slot 3 and slot 4's own tile
    const slot3Palette = [{ r: 0, g: 0, b: 0 }, { r: 60, g: 180, b: 220 }];
    const slot4Palette = [{ r: 0, g: 0, b: 0 }, { r: 200, g: 100, b: 50 }];
    const ox = 10;
    const oy = 20;
    const realBaseline = 90; // stands in for the real sprite's own opaque redraw already in fb
    const px = ox; // (10,20) - opaque in both slot 3 and slot 4's own tile (fully overlapping placement)

    // Fixed behavior: slot 4's own mask suppresses slot 3 first, then slot 4 blends against the untouched baseline.
    const fbFixed = makeFb();
    const slot4Mask = turn9QuickAttackOpaqueMask(tileset, ox, oy, Infinity);
    drawSpriteSheetBlendedOverFbSkipping(fbFixed, tileset, slot3Palette, ox, oy, 12, 8, Infinity, slot4Mask);
    drawSpriteSheetBlendedOverFbSkipping(fbFixed, tileset, slot4Palette, ox, oy, 12, 8, Infinity, new Uint8Array(240 * 160));
    const oFixed = (oy * 240 + px) * 4;
    const fixedColor = [fbFixed[oFixed], fbFixed[oFixed + 1], fbFixed[oFixed + 2]];
    const expectedFixed = [
      blendChannel(slot4Palette[1]!.r, realBaseline, 12, 8),
      blendChannel(slot4Palette[1]!.g, realBaseline, 12, 8),
      blendChannel(slot4Palette[1]!.b, realBaseline, 12, 8),
    ];
    expect(fixedColor).toEqual(expectedFixed);

    // The bug this pin guards against: the OLD sequential order (blend slot 3 unconditionally, then blend
    // slot 4 on top of THAT result) double-blends - different from the fixed single-blend-against-baseline result.
    const fbBug = makeFb();
    drawSpriteSheetBlendedOverFbSkipping(fbBug, tileset, slot3Palette, ox, oy, 12, 8, Infinity, new Uint8Array(240 * 160));
    drawSpriteSheetBlendedOverFbSkipping(fbBug, tileset, slot4Palette, ox, oy, 12, 8, Infinity, new Uint8Array(240 * 160));
    const oBug = (oy * 240 + px) * 4;
    const bugColor = [fbBug[oBug], fbBug[oBug + 1], fbBug[oBug + 2]];
    expect(bugColor).not.toEqual(fixedColor);
  });
});
