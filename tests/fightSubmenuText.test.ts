// Tier-1 pins for src/engine/fightSubmenuText.ts, closing ISSUES #20's
// remainder (the drawFightSubmenuWindow rewire itself, past the extraction
// half tests/fontNarrow.test.ts already closed). Three layers:
//
// 1. THE decisive identity test - composes the SAME two-step draw
//    battleScene.ts's drawFightSubmenuChrome now does (blit the oracle-
//    harvested chrome patch, then drawFightSubmenuText on top) for all 4
//    cursor positions of battle 1's real, fixed Onix moveset, and compares
//    the result BYTE-EXACT against the FULL fight-submenu-window.json patch
//    (not just each glyph's own crop, the way fontNarrow.test.ts's own
//    decisive test does - this one also proves the new blank-then-redraw
//    rects land exactly on the window boundaries text.c's own PIXEL_FILL
//    convention would, with no bleed into the surrounding chrome/border).
// 2. Structural pin - PP_STATE_COLORS (the state->color-pair table
//    SetPPNumbersPaletteInMoveSelection reads at render time) matches a
//    FRESH re-parse of text_pp.pal, independent of the committed literal.
// 3. Generality - a wholly different, real moveset (KABUTO's, S8 battle 2 -
//    src/data/gen/battle2-turn1-battler-dump.json's own RAM-dumped
//    moves/pp) renders through the exact same path without throwing, and
//    each of the 4 PP-color states it can hit is independently re-rendered
//    (via drawText/drawGlyphCodes with colors sourced fresh from
//    text_pp.pal, not the module's own table) and compared byte-exact
//    against drawFightSubmenuText's own output at the "PP" label and PP-
//    remaining-digits windows - pinning the dynamic-color wiring itself,
//    not just the table's transcription.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadJascPal } from "../tools/extract/jascPal.ts";
import { createFramebuffer, SCREEN_WIDTH } from "../src/engine/framebuffer.ts";
import { drawGlyphCodes, drawText, type FontData, type TextColors } from "../src/engine/font.ts";
import type { RgbColor } from "../src/engine/bg.ts";
import {
  buildFightMoveset,
  drawFightSubmenuText,
  PP_STATE_COLORS,
  TYPE_DISPLAY_NAMES,
} from "../src/engine/fightSubmenuText.ts";
import { FIGHT_SUBMENU_SLOT_NAMES, getCurrentPPToMaxPPState, ppRemainingGlyphCodes, ROCK_SLIDE_PP_REMAINING_ORIGIN } from "../src/engine/battleMenu.ts";
import fontNarrowData from "../src/data/gen/font-narrow.json" with { type: "json" };
import fontNormalData from "../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../src/data/gen/charmap.json" with { type: "json" };
import fightSubmenuWindowAsset from "../src/assets/gen/fight-submenu-window.json" with { type: "json" };

const HERE = dirname(fileURLToPath(import.meta.url));
const REF = join(HERE, "..", "reference", "pokeemerald");

const fontNarrow = fontNarrowData as unknown as FontData;
const fontNormal = fontNormalData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);
const fightSubmenuWindow = fightSubmenuWindowAsset as {
  x: number;
  y: number;
  width: number;
  height: number;
  slots: Record<string, number[]>;
};

/** Blits a harvested slot patch flat onto a fresh framebuffer, exactly the shape `battleScene.ts`'s own `drawRect` composites (opaque, no masking). */
function drawChromePatch(slotName: string): Uint8Array {
  const fb = createFramebuffer();
  const patch = fightSubmenuWindow.slots[slotName]!;
  const { x, y, width, height } = fightSubmenuWindow;
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const i = (py * width + px) * 3;
      const o = ((y + py) * SCREEN_WIDTH + (x + px)) * 4;
      fb[o] = patch[i]!;
      fb[o + 1] = patch[i + 1]!;
      fb[o + 2] = patch[i + 2]!;
      fb[o + 3] = 255;
    }
  }
  return fb;
}

function extractPatchRegionFromFb(fb: Uint8Array): number[] {
  const { x, y, width, height } = fightSubmenuWindow;
  const out: number[] = [];
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      const o = ((y + py) * SCREEN_WIDTH + (x + px)) * 4;
      out.push(fb[o]!, fb[o + 1]!, fb[o + 2]!);
    }
  }
  return out;
}

// Onix's fixed battle-1 moveset, all 4 moves at full PP - the harvest's own
// captured state (tests/fontNarrow.test.ts's header comment already
// establishes this for the same harvest asset).
const ONIX_MOVE_IDS: readonly [number, number, number, number] = [157, 20, 225, 201];
const ONIX_FULL_PP: readonly [number, number, number, number] = [10, 20, 20, 10];

describe("drawFightSubmenuText: battle-1 identity (full window, byte-exact against the oracle harvest)", () => {
  const moveset = buildFightMoveset(ONIX_MOVE_IDS, ONIX_FULL_PP);

  for (let cursor = 0; cursor < 4; cursor += 1) {
    const slotName = FIGHT_SUBMENU_SLOT_NAMES[cursor]!;
    it(`cursor ${cursor} (${slotName} highlighted) reproduces fight-submenu-window.json's own "${slotName}" patch exactly`, () => {
      const fb = drawChromePatch(slotName);
      drawFightSubmenuText(fb, fightSubmenuWindow.x, fightSubmenuWindow.y, moveset, cursor as 0 | 1 | 2 | 3);
      const rendered = extractPatchRegionFromFb(fb);
      expect(rendered).toEqual(fightSubmenuWindow.slots[slotName]);
    });
  }
});

describe("PP_STATE_COLORS structural pin", () => {
  it("matches a fresh gbaRoundTrip re-parse of graphics/battle_interface/text_pp.pal, not just the committed literal", () => {
    const pal = loadJascPal(join(REF, "graphics", "battle_interface", "text_pp.pal"));
    for (let state = 0; state < 4; state += 1) {
      expect(PP_STATE_COLORS[state]!.fg).toEqual(pal[state * 2]);
      expect(PP_STATE_COLORS[state]!.shadow).toEqual(pal[state * 2 + 1]);
    }
  });

  it("state 3 (full PP) matches tests/fontNarrow.test.ts's own already-pinned pair", () => {
    expect(PP_STATE_COLORS[3]).toEqual({ fg: { r: 74, g: 74, b: 74 }, shadow: { r: 222, g: 222, b: 222 } });
  });
});

describe("TYPE_DISPLAY_NAMES structural pin", () => {
  it("matches a fresh re-parse of gTypeNames (battle_main.c) - not a plain TYPE_-prefix strip (FIGHTING->FIGHT, ELECTRIC->ELECTR, etc diverge)", () => {
    const src = readFileSync(join(REF, "src", "battle_main.c"), "utf8");
    const match = /const u8 gTypeNames\[NUMBER_OF_MON_TYPES\]\[TYPE_NAME_LENGTH \+ 1\] =\s*\{([^}]*)\}/s.exec(src);
    expect(match).not.toBeNull();
    const entries = [...match![1]!.matchAll(/\[(TYPE_\w+)\]\s*=\s*_\("([^"]*)"\)/g)];
    expect(entries.length).toBeGreaterThan(0);
    for (const [, typeId, display] of entries) {
      expect(TYPE_DISPLAY_NAMES[typeId!]).toBe(display);
    }
  });
});

// KABUTO, S8 battle 2's real opponent (species 140 - src/data/gen/battle2-
// turn1-battler-dump.json's battler1, tick 33031, pre-turn-1 settled menu) -
// a wholly different moveset from Onix's, proving the live path isn't
// battle-1-special-cased. Move ids/PP are the RAM-dumped values verbatim.
const KABUTO_MOVE_IDS: readonly [number, number, number, number] = [72, 246, 28, 182]; // MEGA_DRAIN/ANCIENTPOWER/SAND-ATTACK/PROTECT
const KABUTO_MAX_PP: readonly [number, number, number, number] = [10, 5, 15, 10];

describe("drawFightSubmenuText: KABUTO's moveset (S8 battle 2, non-battle-1) renders without throwing", () => {
  it("renders all 4 cursor positions at full PP without throwing", () => {
    const moveset = buildFightMoveset(KABUTO_MOVE_IDS, KABUTO_MAX_PP);
    for (let cursor = 0; cursor < 4; cursor += 1) {
      const fb = createFramebuffer();
      expect(() => drawFightSubmenuText(fb, fightSubmenuWindow.x, fightSubmenuWindow.y, moveset, cursor as 0 | 1 | 2 | 3)).not.toThrow();
    }
  });

  it('move names/type are correct per moves.json ("SAND-ATTACK" hyphen, "ANCIENTPOWER" no space, GROUND/GRASS/ROCK/NORMAL types)', () => {
    const moveset = buildFightMoveset(KABUTO_MOVE_IDS, KABUTO_MAX_PP);
    expect(moveset.map((m) => m.name)).toEqual(["MEGA DRAIN", "ANCIENTPOWER", "SAND-ATTACK", "PROTECT"]);
    expect(moveset.map((m) => m.type)).toEqual(["TYPE_GRASS", "TYPE_ROCK", "TYPE_GROUND", "TYPE_NORMAL"]);
  });

  // Four synthetic PP levels, one per GetCurrentPPToMaxPPState band, against
  // ANCIENTPOWER's real maxPP (5) - band boundaries independently re-derived
  // in tests/battleMenu.test.ts already; this pins that drawFightSubmenuText
  // actually WIRES the resulting state to the right color pair on both the
  // "PP" label and the PP-remaining digits windows, re-rendered here via an
  // independently-sourced (fresh text_pp.pal parse) palette rather than the
  // module's own table.
  it("GetCurrentPPToMaxPPState bands for ANCIENTPOWER's real maxPP(5) match the synthetic cases below (maxPP<=7 branch)", () => {
    expect(getCurrentPPToMaxPPState(0, 5)).toBe(2);
    expect(getCurrentPPToMaxPPState(1, 5)).toBe(1);
    expect(getCurrentPPToMaxPPState(2, 5)).toBe(0);
    expect(getCurrentPPToMaxPPState(3, 5)).toBe(3);
    expect(getCurrentPPToMaxPPState(5, 5)).toBe(3);
  });

  const pal = loadJascPal(join(REF, "graphics", "battle_interface", "text_pp.pal"));
  function independentPpColors(state: 0 | 1 | 2 | 3): { palette: RgbColor[]; colors: TextColors } {
    const palette: RgbColor[] = [];
    palette[12] = pal[state * 2]!;
    palette[14] = { r: 255, g: 255, b: 255 };
    palette[11] = pal[state * 2 + 1]!;
    return { palette, colors: { fg: 12, bg: 14, shadow: 11 } };
  }

  for (const { currentPP, maxPP, label } of [
    { currentPP: 0, maxPP: 5, label: "state 2 (empty)" },
    { currentPP: 1, maxPP: 5, label: "state 1 (low)" },
    { currentPP: 2, maxPP: 5, label: "state 0 (mid)" },
    { currentPP: 5, maxPP: 5, label: "state 3 (full)" },
  ] as { currentPP: number; maxPP: number; label: string }[]) {
    it(`ANCIENTPOWER at ${currentPP}/${maxPP} (${label}): "PP" label and PP-remaining digits both use the independently-sourced color for that state`, () => {
      const moveset = buildFightMoveset(KABUTO_MOVE_IDS, [KABUTO_MAX_PP[0]!, currentPP, KABUTO_MAX_PP[2]!, KABUTO_MAX_PP[3]!]);
      // moveset[1].maxPP comes from moves.json (5, ANCIENTPOWER's real base PP) - override currentPP only.
      const fb = drawFightSubmenuTextAt(moveset, 1);

      const state = getCurrentPPToMaxPPState(currentPP, maxPP);
      const { palette, colors } = independentPpColors(state);

      const expectedFb = createFramebuffer();
      fillRectWhite(expectedFb, fightSubmenuWindow.x + 167, fightSubmenuWindow.y + 7, 32, 16);
      fillRectWhite(expectedFb, fightSubmenuWindow.x + ROCK_SLIDE_PP_REMAINING_ORIGIN.x - 2, fightSubmenuWindow.y + 7, 32, 16);
      drawText(expectedFb, fontNarrow, charmap, "PP", fightSubmenuWindow.x + 167, fightSubmenuWindow.y + 8, palette, colors);
      drawGlyphCodes(
        expectedFb,
        fontNormal,
        ppRemainingGlyphCodes(currentPP, maxPP),
        fightSubmenuWindow.x + ROCK_SLIDE_PP_REMAINING_ORIGIN.x,
        fightSubmenuWindow.y + ROCK_SLIDE_PP_REMAINING_ORIGIN.y,
        palette,
        colors,
      );

      // Compare only the two dynamic-color windows (PP label + PP-remaining) - the rest of the frame (move names/type/chrome) differs because `fb` also has the other 3 windows' live text drawn, `expectedFb` doesn't.
      expect(extractRect(fb, fightSubmenuWindow.x + 167, fightSubmenuWindow.y + 7, 32, 16)).toEqual(
        extractRect(expectedFb, fightSubmenuWindow.x + 167, fightSubmenuWindow.y + 7, 32, 16),
      );
      expect(extractRect(fb, fightSubmenuWindow.x + ROCK_SLIDE_PP_REMAINING_ORIGIN.x - 2, fightSubmenuWindow.y + 7, 32, 16)).toEqual(
        extractRect(expectedFb, fightSubmenuWindow.x + ROCK_SLIDE_PP_REMAINING_ORIGIN.x - 2, fightSubmenuWindow.y + 7, 32, 16),
      );
    });
  }
});

function drawFightSubmenuTextAt(moveset: ReturnType<typeof buildFightMoveset>, cursor: 0 | 1 | 2 | 3): Uint8Array {
  const fb = createFramebuffer();
  drawFightSubmenuText(fb, fightSubmenuWindow.x, fightSubmenuWindow.y, moveset, cursor);
  return fb;
}

function fillRectWhite(fb: Uint8Array, x: number, y: number, w: number, h: number): void {
  for (let py = 0; py < h; py += 1) {
    for (let px = 0; px < w; px += 1) {
      const o = ((y + py) * SCREEN_WIDTH + (x + px)) * 4;
      fb[o] = 255;
      fb[o + 1] = 255;
      fb[o + 2] = 255;
      fb[o + 3] = 255;
    }
  }
}

function extractRect(fb: Uint8Array, x: number, y: number, w: number, h: number): number[] {
  const out: number[] = [];
  for (let py = 0; py < h; py += 1) {
    for (let px = 0; px < w; px += 1) {
      const o = ((y + py) * SCREEN_WIDTH + (x + px)) * 4;
      out.push(fb[o]!, fb[o + 1]!, fb[o + 2]!);
    }
  }
  return out;
}
