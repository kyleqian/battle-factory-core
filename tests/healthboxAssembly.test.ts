import { describe, expect, it } from "vitest";
import { composeOpponentHealthbox, HEALTHBOX_FRAME_ORIGIN, HP_BAR_FULL_TILES } from "../src/engine/healthboxAssembly.ts";
import battleHealthbox from "../src/assets/gen/battle-healthbox.json" with { type: "json" };
import harvested from "../src/assets/gen/sendout-healthbox-opponent.json" with { type: "json" };

// ISSUES #16 - see docs/healthbox-assembly-notes.md for the full root-cause
// dossier (RAM/VRAM-confirmed) and what landed.
// Pins the full content-assembly pipeline byte-exact against the
// pixel-harvested GROVYLE/male/Lv50/full-HP/no-status block
// (sendout-healthbox-opponent.json): the base frame (a flat blit - no tile
// remap), the HP bar (full-HP tile selection + its own SubspriteTable
// placement), and the nickname/gender + level text (the real FONT_SMALL
// window-printer path, including the dynamic-color gender-symbol
// override). Every opaque pixel of the harvested 100x28 block is asserted -
// no exclusion rects.

const assets = { frame: battleHealthbox.singlesOpponent, hpbar: battleHealthbox.hpbar };

describe("composeOpponentHealthbox (ISSUES #16)", () => {
  const result = composeOpponentHealthbox(assets, { name: "GROVYLE", level: 50, gender: "male", hpFraction: 1, status: "none" });

  it("produces a 128x32 canvas anchored at the healthbox's own screen corner", () => {
    expect(result.width).toBe(128);
    expect(result.height).toBe(32);
    expect(HEALTHBOX_FRAME_ORIGIN).toEqual({ x: 12, y: 14 });
  });

  it("matches the entire pixel-harvested block byte-exact", () => {
    // harvested crop is (x:13,y:16)-(113,44) screen = canvas-local (1,2)-(101,30).
    let checked = 0;
    for (let ly = 0; ly < harvested.height; ly += 1) {
      for (let lx = 0; lx < harvested.width; lx += 1) {
        const cx = lx + (harvested.x - HEALTHBOX_FRAME_ORIGIN.x);
        const cy = ly + (harvested.y - HEALTHBOX_FRAME_ORIGIN.y);
        const cell = result.pixels[cy * result.width + cx];
        if (!cell) continue; // still-transparent frame pixel (outside the healthbox's own opaque shape) - nothing to assert
        const hi = (ly * harvested.width + lx) * 3;
        checked += 1;
        expect([cell.r, cell.g, cell.b], `mismatch at local (${cx},${cy})`).toEqual([harvested.pixels[hi], harvested.pixels[hi + 1], harvested.pixels[hi + 2]]);
      }
    }
    // Every opaque pixel of the harvested 100x28 bbox is asserted (2574/2574,
    // oracle-confirmed this run) - not a hardcoded magic number to hit, just
    // a floor so this test can't silently degrade to checking nothing.
    expect(checked).toBe(2574);
  });

  it("HP_BAR_FULL_TILES is the RAM/VRAM-confirmed full-HP tile selection (cap + 6x fully-filled green segment)", () => {
    expect(HP_BAR_FULL_TILES).toEqual([1, 2, 11, 11, 11, 11, 11, 11]);
    const hpbarTileset = battleHealthbox.hpbar.tileset;
    for (const t of HP_BAR_FULL_TILES) expect(hpbarTileset.tiles[t]).toBeDefined();
  });

  it("rejects unimplemented HP fractions and statuses instead of guessing", () => {
    expect(() => composeOpponentHealthbox(assets, { name: "GROVYLE", level: 50, gender: "male", hpFraction: 0.5, status: "none" })).toThrow();
    expect(() => composeOpponentHealthbox(assets, { name: "GROVYLE", level: 50, gender: "male", hpFraction: 1, status: "poison" })).toThrow();
  });

  it("stays parameterized: a different name/gender/level renders without GROVYLE-specific constants", () => {
    const female = composeOpponentHealthbox(assets, { name: "MISDREAVUS", level: 100, gender: "female", hpFraction: 1, status: "none" });
    const none = composeOpponentHealthbox(assets, { name: "MAGIKARP", level: 5, gender: "none", hpFraction: 1, status: "none" });
    expect(female.width).toBe(128);
    expect(female.pixels.some((p) => p !== null)).toBe(true);
    expect(none.pixels.some((p) => p !== null)).toBe(true);
  });
});
