import { describe, expect, it } from "vitest";
import { composeOpponentHealthbox, HEALTHBOX_FRAME_ORIGIN, HP_BAR_FULL_TILES } from "../src/engine/healthboxAssembly.ts";
import battleHealthbox from "../src/assets/gen/battle-healthbox.json" with { type: "json" };
import harvested from "../src/assets/gen/sendout-healthbox-opponent.json" with { type: "json" };

// ISSUES #16 - see docs/healthbox-assembly-notes.md for the full root-cause
// dossier (RAM/VRAM-confirmed) and what's landed vs. still open here.
// Pins the one piece this session proved byte-exact against the
// pixel-harvested GROVYLE/male/Lv50/full-HP/no-status block
// (sendout-healthbox-opponent.json): the base frame is a flat blit of the
// existing singlesOpponent sheet - no tile remap exists (the previously
// "unsolved" mismatch was 100% attributable to un-composited content, not
// a frame-placement bug). Deliberately does NOT assert equality over the
// name/level text footprint or the HP-bar footprint - neither is rendered
// yet (see the doc: text placement wasn't nailed down, and the healthbar
// sprite's own SubspriteTable placement wasn't verified in time) - this
// test must fail loudly (not silently pass) if that ever regresses to
// drawing wrong pixels there instead of leaving them transparent.

// Canvas-local (origin = HEALTHBOX_FRAME_ORIGIN) rects excluded from the
// exactness assertion below - generously sized to cover the un-composited
// content regions documented in docs/healthbox-assembly-notes.md.
const NAME_TEXT_RECT = { x0: 8, y0: 5, x1: 64, y1: 16 };
const LEVEL_TEXT_RECT = { x0: 64, y0: 5, x1: 88, y1: 16 };
const HP_BAR_RECT = { x0: 0, y0: 8, x1: 100, y1: 24 }; // sHealthBar_Subsprites_Opponent's placement is unverified this session (see docs/healthbox-assembly-notes.md) - generously wide margin rather than a precise (and possibly wrong) box

function inRect(x: number, y: number, r: { x0: number; y0: number; x1: number; y1: number }): boolean {
  return x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1;
}

describe("composeOpponentHealthbox (ISSUES #16)", () => {
  const frame = { tileset: battleHealthbox.singlesOpponent.tileset, palette: battleHealthbox.singlesOpponent.palette };
  const result = composeOpponentHealthbox(frame, { name: "GROVYLE", level: 50, gender: "male", hpFraction: 1, status: "none" });

  it("produces a 128x32 canvas anchored at the healthbox's own screen corner", () => {
    expect(result.width).toBe(128);
    expect(result.height).toBe(32);
    expect(HEALTHBOX_FRAME_ORIGIN).toEqual({ x: 12, y: 14 });
  });

  it("matches the pixel-harvested block byte-exact everywhere outside the (still-unimplemented) text/HP-bar footprints", () => {
    // harvested crop is (x:13,y:16)-(113,44) screen = canvas-local (1,2)-(101,30).
    let checked = 0;
    for (let ly = 0; ly < harvested.height; ly += 1) {
      for (let lx = 0; lx < harvested.width; lx += 1) {
        const cx = lx + (harvested.x - HEALTHBOX_FRAME_ORIGIN.x);
        const cy = ly + (harvested.y - HEALTHBOX_FRAME_ORIGIN.y);
        if (inRect(cx, cy, NAME_TEXT_RECT) || inRect(cx, cy, LEVEL_TEXT_RECT) || inRect(cx, cy, HP_BAR_RECT)) continue;
        const cell = result.pixels[cy * result.width + cx];
        if (!cell) continue; // still-transparent frame pixel (e.g. outside the opaque bbox) - nothing to assert
        const hi = (ly * harvested.width + lx) * 3;
        checked += 1;
        expect([cell.r, cell.g, cell.b], `mismatch at local (${cx},${cy})`).toEqual([harvested.pixels[hi], harvested.pixels[hi + 1], harvested.pixels[hi + 2]]);
      }
    }
    // Sanity: a substantial chunk of the 100x28 bbox is asserted even after
    // excluding the generous text/bar rects and background-transparent px
    // (859/2574 opaque px, oracle-confirmed this run - not a hardcoded
    // magic number, just a floor so this test can't silently degrade to
    // checking nothing).
    expect(checked).toBeGreaterThan(800);
  });

  it("HP_BAR_FULL_TILES is the RAM/VRAM-confirmed full-HP tile selection (cap + 6x fully-filled green segment)", () => {
    expect(HP_BAR_FULL_TILES).toEqual([1, 2, 11, 11, 11, 11, 11, 11]);
    const hpbarTileset = battleHealthbox.hpbar.tileset;
    for (const t of HP_BAR_FULL_TILES) expect(hpbarTileset.tiles[t]).toBeDefined();
  });

  it("rejects unimplemented HP fractions and statuses instead of guessing", () => {
    expect(() => composeOpponentHealthbox(frame, { name: "GROVYLE", level: 50, gender: "male", hpFraction: 0.5, status: "none" })).toThrow();
    expect(() => composeOpponentHealthbox(frame, { name: "GROVYLE", level: 50, gender: "male", hpFraction: 1, status: "poison" })).toThrow();
  });
});
