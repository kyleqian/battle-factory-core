import { describe, expect, it } from "vitest";
import { calcBarFilledPixels, composeOpponentHealthbox, composePlayerHealthboxHpOverlay, HEALTHBOX_FRAME_ORIGIN, HP_BAR_FULL_TILES, pickHpBarBand, rightAlign3GlyphCodes } from "../src/engine/healthboxAssembly.ts";
import { CHAR_SPACER } from "../src/engine/battleMenu.ts";
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

const assets = {
  frame: battleHealthbox.singlesOpponent,
  hpbar: battleHealthbox.hpbar,
  hpbarAnim: battleHealthbox.hpbarAnim,
  statusIcons: battleHealthbox.status2,
};

/** Decodes sheet tile `tileIndex`'s pixel `(x,y)` through `palette` (with optional per-index overrides), GBA 4bpp convention (index 0 = transparent). */
function tilePixel(sheet: { tileset: { tiles: number[][] } }, palette: { r: number; g: number; b: number }[], tileIndex: number, x: number, y: number): { r: number; g: number; b: number } | null {
  const tile = sheet.tileset.tiles[tileIndex]!;
  const idx = tile[y * 8 + x]!;
  if (idx === 0) return null;
  return palette[idx] ?? null;
}

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

  it("rejects out-of-range HP fractions and unknown statuses instead of guessing", () => {
    expect(() => composeOpponentHealthbox(assets, { name: "GROVYLE", level: 50, gender: "male", hpFraction: 1.5, status: "none" })).toThrow();
    expect(() => composeOpponentHealthbox(assets, { name: "GROVYLE", level: 50, gender: "male", hpFraction: -0.1, status: "none" })).toThrow();
    // @ts-expect-error - deliberately invalid status, must still throw rather than draw nothing
    expect(() => composeOpponentHealthbox(assets, { name: "GROVYLE", level: 50, gender: "male", hpFraction: 1, status: "confusion" })).toThrow();
  });

  it("stays parameterized: a different name/gender/level renders without GROVYLE-specific constants", () => {
    const female = composeOpponentHealthbox(assets, { name: "MISDREAVUS", level: 100, gender: "female", hpFraction: 1, status: "none" });
    const none = composeOpponentHealthbox(assets, { name: "MAGIKARP", level: 5, gender: "none", hpFraction: 1, status: "none" });
    expect(female.width).toBe(128);
    expect(female.pixels.some((p) => p !== null)).toBe(true);
    expect(none.pixels.some((p) => p !== null)).toBe(true);
  });
});

// CalcBarFilledPixels (battle_interface.c:2413-2456) boundary cases - source-
// decoded arithmetic, no oracle pixels exist for partial HP yet (see the
// doc's deferred-validation note).
describe("calcBarFilledPixels (ISSUES #16 round 3)", () => {
  it("full HP: all 6 columns maxed at 8px, matching HP_BAR_FULL_TILES' fill portion", () => {
    const { filledPixels, columns } = calcBarFilledPixels(1);
    expect(filledPixels).toBe(48);
    expect(columns).toEqual([8, 8, 8, 8, 8, 8]);
  });

  it("zero HP: fully empty, no forced sliver", () => {
    const { filledPixels, columns } = calcBarFilledPixels(0);
    expect(filledPixels).toBe(0);
    expect(columns).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("1 HP (rounds to 0px but not fainted): forced to a 1px sliver in column 0, not a blank bar", () => {
    const { filledPixels, columns } = calcBarFilledPixels(1 / 700);
    expect(filledPixels).toBe(1);
    expect(columns).toEqual([1, 0, 0, 0, 0, 0]);
  });

  it("50% HP is exactly the green/yellow boundary and lands on the yellow side (> 50%, not >=)", () => {
    expect(calcBarFilledPixels(0.5).filledPixels).toBe(24);
    expect(pickHpBarBand(24)).toBe("yellow");
    expect(calcBarFilledPixels(25 / 48).filledPixels).toBe(25);
    expect(pickHpBarBand(25)).toBe("green");
  });

  it("20% HP is exactly the yellow/red boundary and lands on the red side (> 20%, not >=)", () => {
    expect(calcBarFilledPixels(0.2).filledPixels).toBe(9);
    expect(pickHpBarBand(9)).toBe("red");
    expect(calcBarFilledPixels(10 / 48).filledPixels).toBe(10);
    expect(pickHpBarBand(10)).toBe("yellow");
  });
});

describe("composeOpponentHealthbox partial HP + status (ISSUES #16 round 3, no oracle pixels yet - see the doc)", () => {
  it("half HP (yellow band) lands the exact hpbarAnim tile bytes at each of the 6 subsprite-correct fill columns", () => {
    const result = composeOpponentHealthbox(assets, { name: "GROVYLE", level: 50, gender: "male", hpFraction: 0.5, status: "none" });
    const { filledPixels, columns } = calcBarFilledPixels(0.5);
    expect(filledPixels).toBe(24);
    expect(pickHpBarBand(filledPixels)).toBe("yellow");
    expect(columns).toEqual([8, 8, 8, 0, 0, 0]);

    // Caption "H"/"P" tiles (hpbar sheet, band-independent) at canvas x=24,32
    // - only asserted where the tile itself is opaque (transparent cells
    // just let whatever's beneath show through, nothing to pin here).
    for (let x = 0; x < 8; x += 1) {
      for (let y = 0; y < 8; y += 1) {
        const h = tilePixel(battleHealthbox.hpbar, battleHealthbox.hpbar.palette, 1, x, y);
        if (h) expect(result.pixels[(16 + y) * result.width + (24 + x)]).toEqual(h);
        const p = tilePixel(battleHealthbox.hpbar, battleHealthbox.hpbar.palette, 2, x, y);
        if (p) expect(result.pixels[(16 + y) * result.width + (32 + x)]).toEqual(p);
      }
    }

    // 6 fill columns, canvas x=40..87, sourced from hpbarAnim's yellow band
    // (local tiles 0-8, base offset 0) - only asserted where the fill tile
    // itself is opaque (its transparent top row lets the frame's own border
    // art show through, which is legitimate and not this test's concern).
    for (let col = 0; col < 6; col += 1) {
      const tileIndex = 0 + columns[col]!;
      const destX = 40 + col * 8;
      for (let x = 0; x < 8; x += 1) {
        for (let y = 0; y < 8; y += 1) {
          const expected = tilePixel(battleHealthbox.hpbarAnim, battleHealthbox.hpbarAnim.palette, tileIndex, x, y);
          if (expected) expect(result.pixels[(16 + y) * result.width + (destX + x)], `column ${col} px (${x},${y})`).toEqual(expected);
        }
      }
    }
  });

  it("a status renders its 3-tile icon at the opponent's fixed canvas position with the status-specific dynamic color", () => {
    const result = composeOpponentHealthbox(assets, { name: "GROVYLE", level: 50, gender: "male", hpFraction: 1, status: "poison" });
    const palette = battleHealthbox.status2.palette.map((c) => ({ ...c }));
    palette[13] = { r: 198, g: 99, b: 198 }; // expand5to8(24,12,24) - see STATUS_ICON_COLORS' doc.

    // Tiles 0-1 (canvas x=8..23) never overlap the HP bar - asserted in full.
    for (let tile = 0; tile < 2; tile += 1) {
      const destX = 8 + tile * 8;
      for (let x = 0; x < 8; x += 1) {
        for (let y = 0; y < 8; y += 1) {
          expect(result.pixels[(16 + y) * result.width + (destX + x)], `tile ${tile} px (${x},${y})`).toEqual(tilePixel(battleHealthbox.status2, palette, tile, x, y));
        }
      }
    }

    // Tile 2 (canvas x=24..31) shares its footprint with the HP bar's own
    // "H" caption tile, which is unconditional (drawn regardless of status)
    // and, per the established round-2 z-order rule, wins wherever it's
    // opaque - so this tile is only the status icon's own color where the
    // "H" tile is transparent.
    for (let x = 0; x < 8; x += 1) {
      for (let y = 0; y < 8; y += 1) {
        const hPixel = tilePixel(battleHealthbox.hpbar, battleHealthbox.hpbar.palette, 1, x, y);
        const expected = hPixel ?? tilePixel(battleHealthbox.status2, palette, 2, x, y);
        if (expected) expect(result.pixels[(16 + y) * result.width + (24 + x)], `tile 2 px (${x},${y})`).toEqual(expected);
      }
    }
  });

  it("different statuses select different rows of the status2 sheet and different dynamic colors", () => {
    const poison = composeOpponentHealthbox(assets, { name: "GROVYLE", level: 50, gender: "male", hpFraction: 1, status: "poison" });
    const burn = composeOpponentHealthbox(assets, { name: "GROVYLE", level: 50, gender: "male", hpFraction: 1, status: "burn" });
    let differs = false;
    for (let i = 0; i < poison.pixels.length; i += 1) {
      const a = poison.pixels[i];
      const b = burn.pixels[i];
      if (JSON.stringify(a) !== JSON.stringify(b)) differs = true;
    }
    expect(differs).toBe(true);
  });
});

// S7 slice E1b (docs/battle-menu-notes.md §14, docs/battle-turn-notes.md
// §12) - the player healthbox's own HP-bar drain + digit text overlay.
// Oracle-pixel-confirmed this session (0 mismatches at 6 ticks spanning the
// drain, and 105/106 via tools/compare/traces/turn2-endeavor-drain.json,
// the 1 residual being ISSUES #19's own pre-existing family at tick 2906) -
// these Tier-1 pins cover the hermetic layout/wiring, not a re-derivation of
// that pixel evidence.
describe("composePlayerHealthboxHpOverlay (S7 slice E1b)", () => {
  const overlayAssets = {
    hpbar: battleHealthbox.hpbar,
    hpbarAnim: battleHealthbox.hpbarAnim,
    textPalette: battleHealthbox.singlesPlayer.palette,
  };

  it("full HP (117/117): all 48 bar columns green-filled at local origin (47,14) - the SAME HP_BAR_FULL_TILES fill selection the opponent's bar uses, minus its 2 caption tiles (baked into the player's own static frame harvest here, never redrawn)", () => {
    const result = composePlayerHealthboxHpOverlay(overlayAssets, 117, 117);
    const fillTiles = HP_BAR_FULL_TILES.slice(2);
    // Bar tile row 7 (local y=21) is the text patch's own top row too (`PLAYER_HP_TEXT_ORIGIN.y`=21) -
    // legitimately overwritten by the text layer's bg-clear (drawn after the bar), so excluded here.
    for (let i = 0; i < 6; i += 1) {
      for (let x = 0; x < 8; x += 1) {
        for (let y = 0; y < 7; y += 1) {
          const expected = tilePixel(battleHealthbox.hpbar, battleHealthbox.hpbar.palette, fillTiles[i]!, x, y);
          expect(result.pixels[(14 + y) * result.width + (47 + i * 8 + x)], `fill tile ${i} px (${x},${y})`).toEqual(expected);
        }
      }
    }
  });

  it("partial HP (101/117, ENDEAVOR's own settled endpoint): bar fill matches calcBarFilledPixels(101/117)'s own column split (41px), band still green (86% > 50% threshold)", () => {
    const result = composePlayerHealthboxHpOverlay(overlayAssets, 101, 117);
    const { filledPixels, columns } = calcBarFilledPixels(101 / 117);
    expect(filledPixels).toBe(41);
    expect(pickHpBarBand(filledPixels)).toBe("green");
    for (let i = 0; i < 6; i += 1) {
      const tileIdx = 3 + columns[i]!; // HP_BAR_GREEN_BASE
      for (let x = 0; x < 8; x += 1) {
        for (let y = 0; y < 7; y += 1) {
          const expected = tilePixel(battleHealthbox.hpbar, battleHealthbox.hpbar.palette, tileIdx, x, y);
          expect(result.pixels[(14 + y) * result.width + (47 + i * 8 + x)], `fill tile ${i} px (${x},${y})`).toEqual(expected);
        }
      }
    }
  });

  it("digit text lands in the frame's own 9-row band (local y=21..29), NOT the opponent's 11-row TEXT_VIS_Y0..Y1 band reused verbatim (an earlier iteration this session did exactly that - ink-exact but clobbered the frame's own static divider line at local y=30 with the printer window's bg-fill color, caught only once oracle pixels OUTSIDE the ink were checked too)", () => {
    const full = composePlayerHealthboxHpOverlay(overlayAssets, 117, 117);
    const drained = composePlayerHealthboxHpOverlay(overlayAssets, 101, 117);
    const width = full.width;
    for (let x = 59; x < 59 + 35; x += 1) {
      expect(full.pixels[30 * width + x], `full HP row30 x=${x}`).toBeNull();
      expect(drained.pixels[30 * width + x], `drained row30 x=${x}`).toBeNull();
    }
    let anyPaintedRow29 = false;
    for (let x = 59; x < 59 + 35; x += 1) {
      if (full.pixels[29 * width + x]) anyPaintedRow29 = true;
    }
    expect(anyPaintedRow29).toBe(true);
  });

  it("differs from the full-HP overlay only within the bar-fill/text footprint (no stray writes elsewhere on the 103x36 canvas)", () => {
    const full = composePlayerHealthboxHpOverlay(overlayAssets, 117, 117);
    const drained = composePlayerHealthboxHpOverlay(overlayAssets, 101, 117);
    for (let y = 0; y < full.height; y += 1) {
      for (let x = 0; x < full.width; x += 1) {
        const inBar = x >= 47 && x < 95 && y >= 14 && y < 22;
        const inText = x >= 59 && x < 94 && y >= 21 && y < 30;
        if (inBar || inText) continue;
        const i = y * full.width + x;
        expect(drained.pixels[i], `stray write at (${x},${y})`).toEqual(full.pixels[i]);
      }
    }
  });

  // S7 slice J (docs/battle-turn-notes.md §13/§23): turn 5's ENDEAVOR drains
  // Onix 88->1 - the FIRST time this engine's own player-side healthbox
  // crosses green->yellow->red AND lands on the 1-HP "never fully empty"
  // sliver, oracle-pixel-confirmed this session (tools/compare/traces/
  // turn5-endeavor.json, 254/254, 0 diff, spanning the whole drain) - this
  // compositor path was hermetically pinned but never oracle-exercised on
  // the player side before now (ISSUES #16's own "never oracle-exercised"
  // caveat, closed for hp=1 specifically).
  it("hp=1/117 (turn 5's ENDEAVOR endpoint): calcBarFilledPixels forces the 1px sliver rule (floor(1/117*48)=0, but hp>0), band is red - matches real hardware, no compositor change needed", () => {
    const { filledPixels, columns } = calcBarFilledPixels(1 / 117);
    expect(filledPixels).toBe(1);
    expect(columns).toEqual([1, 0, 0, 0, 0, 0]);
    expect(pickHpBarBand(filledPixels)).toBe("red");
    const result = composePlayerHealthboxHpOverlay(overlayAssets, 1, 117);
    const tileIdx = 9 + columns[0]!; // HP_BAR_RED_BASE(9) + 1px column
    for (let x = 0; x < 8; x += 1) {
      for (let y = 0; y < 7; y += 1) {
        const expected = tilePixel(battleHealthbox.hpbarAnim, battleHealthbox.hpbarAnim.palette, tileIdx, x, y);
        expect(result.pixels[(14 + y) * result.width + (47 + x)], `sliver fill tile px (${x},${y})`).toEqual(expected);
      }
    }
    // Every OTHER fill column reads the red sheet's own empty tile (base+0).
    for (let i = 1; i < 6; i += 1) {
      for (let x = 0; x < 8; x += 1) {
        for (let y = 0; y < 7; y += 1) {
          const expected = tilePixel(battleHealthbox.hpbarAnim, battleHealthbox.hpbarAnim.palette, 9, x, y);
          expect(result.pixels[(14 + y) * result.width + (47 + i * 8 + x)], `empty tile ${i} px (${x},${y})`).toEqual(expected);
        }
      }
    }
  });
});

describe("rightAlign3GlyphCodes (ConvertIntToDecimalStringN's own STR_CONV_MODE_RIGHT_ALIGN, string_util.c:163-217, as UpdateHpTextInHealthbox uses it)", () => {
  it("3-digit values: 3 glyphs, no padding", () => {
    expect(rightAlign3GlyphCodes(117)).toEqual([162, 162, 168]); // '1','1','7'
    expect(rightAlign3GlyphCodes(101)).toEqual([162, 161, 162]); // '1','0','1'
  });

  it("fewer digits get leading CHAR_SPACER, NOT a literal space - matches ppRemainingGlyphCodes' own established convention for the exact same source function (battleMenu.ts)", () => {
    expect(rightAlign3GlyphCodes(8)).toEqual([CHAR_SPACER, CHAR_SPACER, 169]); // '  8'
    expect(rightAlign3GlyphCodes(42)).toEqual([CHAR_SPACER, 165, 163]); // ' 42'
  });

  it("0 still writes its trailing digit (never fully blank) - ConvertIntToDecimalStringN's own `powerOfTen == 1` escape", () => {
    expect(rightAlign3GlyphCodes(0)).toEqual([CHAR_SPACER, CHAR_SPACER, 161]);
  });
});
