// Tier-1 pins for src/data/gen/font-narrow.json (tools/extract/extract-font-narrow.ts),
// closing ISSUES #20's extraction half. Two layers:
//
// 1. Structural pins - the extraction is PRESENT and matches its own source
//    tables (a fresh re-decode of latin_narrow.png / re-parse of fonts.c
//    equals the committed JSON byte-for-byte). This catches drift, not
//    wrong-glyph-base bugs (an extractor bug would reproduce identically
//    here since the same decode logic runs both places).
// 2. THE decisive test - renders the FIGHT submenu's real, committed content
//    (Onix's 4 moves + the "PP"/"TYPE/" labels, docs/battle-menu-notes.md
//    §8's fixed battle-1 moveset) with these glyphs+widths through the
//    engine's own `drawText`/`measureText` (src/engine/font.ts, already
//    proven against the oracle for FONT_NORMAL - reused verbatim here, not
//    reimplemented) and compares the result BYTE-EXACT, full sub-rectangle
//    (ink + shadow + flat-white background alike), against the
//    oracle-harvested ground truth in src/assets/gen/fight-submenu-window.json
//    (tools/extract/extract-fight-submenu-window.ts). This is the layer that
//    actually proves glyph base, width table, and shadow/palette mapping are
//    all correct, not merely present.
//
// **Text-origin mapping (harvest-patch-local pixel coordinates -> which
// window).** fight-submenu-window.json's patch origin is screen (1,113);
// sStandardBattleWindowTemplates (reference/pokeemerald/src/battle_bg.c:
// 192-260) gives each B_WIN_MOVE_NAME_*/B_WIN_PP/B_WIN_MOVE_TYPE window's
// *tile* position - MOVE_NAME_2 is +9 tiles (+72px) right of MOVE_NAME_1,
// MOVE_NAME_3 is +2 tiles (+16px) down, MOVE_NAME_4 is both, and
// B_WIN_PP/B_WIN_MOVE_TYPE are +19 tiles (+152px) right of the name column,
// +0/+2 tiles down respectively - a self-consistent grid. The absolute
// per-patch pixel origins below were found by exhaustively searching every
// (x,y) offset in a generous local window and keeping the one where the
// rendered glyph rectangle matches the harvest with **zero** mismatched
// pixels (every neighboring offset mismatches on most pixels) - and that
// unique best-fit origin reproduces EXACTLY the tile-grid deltas above, an
// independent source-side confirmation this isn't a coincidental pixel fit.
//
// **Color source, not guessed.** B_WIN_MOVE_NAME_*/B_WIN_MOVE_TYPE
// (battle_message.c:1509-1549,1580-1589) use fgColor=13/bgColor=14/
// shadowColor=15 into BG palette bank 5, loaded from
// graphics/battle_interface/text.pal (LoadBattleMenuWindowGfx,
// battle_bg.c:741-753) - index13=(74,74,74), index14=(255,255,255),
// index15=(214,214,206) after the same gbaRoundTrip 5-bit expansion every
// other extractor here uses (tools/extract/jascPal.ts), matching the
// harvest's own sampled colors exactly. B_WIN_PP (battle_message.c:1550-
// 1559) nominally uses fgColor=12/shadowColor=11 from the SAME bank-5 load,
// but `SetPPNumbersPaletteInMoveSelection` (battle_message.c:3030-3044)
// overwrites bank-5 indices 11/12 at render time from
// graphics/battle_interface/text_pp.pal (`gPPTextPalette`), indexed by
// `GetCurrentPPToMaxPPState` (0-3, full/partial/empty) - all 4 of this
// battle's moves are at full PP in the harvest (10/10 or 20/20), so
// `GetCurrentPPToMaxPPState` returns 3 uniformly (maxPP==currentPP,
// battle_message.c:3049-3051), giving text_pp.pal's index 6 (fg,
// (74,74,74)) / index 7 (shadow, (222,222,222)) - a real, source-confirmed
// mechanism, not a structural blocker (every harvested slot happens to
// share the same full-PP state, so this test hardcodes that one resolved
// color pair rather than re-deriving the state machine).
//
// **Scope boundary, source-confirmed.** MoveSelectionDisplayMoveType
// (battle_controller_player.c:1491-1502) prints "TYPE/" in the window's own
// FONT_NARROW, then splices in an EXT_CTRL_CODE_FONT control code to switch
// to FONT_NORMAL for the type name itself (e.g. "ROCK") - and
// MoveSelectionDisplayPPNumber (battle_controller_player.c:1476-1487) prints
// "10/10" on an entirely separate window, B_WIN_PP_REMAINING, whose own
// template (battle_message.c:1560-1569) is FONT_NORMAL, not FONT_NARROW at
// all. So this file's decisive test renders exactly the FONT_NARROW-set
// substrings - the 4 move names verbatim, "PP", and "TYPE/" - against the
// harvest; the FONT_NORMAL-rendered PP-number/type-name suffixes are out of
// THIS extraction's scope (font-normal.json already exists and is proven
// elsewhere) and are deliberately left untested here.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../tools/extract/indexedPng.ts";
import { drawText, measureText, type FontData, type TextColors } from "../src/engine/font.ts";
import { createFramebuffer, SCREEN_WIDTH } from "../src/engine/framebuffer.ts";
import type { RgbColor } from "../src/engine/bg.ts";
import fontNarrowData from "../src/data/gen/font-narrow.json" with { type: "json" };
import charmapData from "../src/data/gen/charmap.json" with { type: "json" };
import fightSubmenuWindowAsset from "../src/assets/gen/fight-submenu-window.json" with { type: "json" };

const HERE = dirname(fileURLToPath(import.meta.url));
const REF = join(HERE, "..", "reference", "pokeemerald");

const fontNarrow = fontNarrowData as unknown as FontData;
const charmap = new Map<string, number>((charmapData as { entries: [string, number][] }).entries);
const fightSubmenuWindow = fightSubmenuWindowAsset as {
  x: number;
  y: number;
  width: number;
  height: number;
  slots: Record<string, number[]>;
};

describe("font-narrow.json structural pins", () => {
  it("is a 16x32 grid of 16px cells (512 glyphs), matching latin_narrow.png's own dimensions", () => {
    const img = decodeIndexedPng(join(REF, "graphics", "fonts", "latin_narrow.png"));
    expect(fontNarrow.cellSize).toBe(16);
    expect(img.width / fontNarrow.cellSize).toBe(fontNarrow.columns);
    expect(img.height / fontNarrow.cellSize).toBe(fontNarrow.rows);
    expect(fontNarrow.columns * fontNarrow.rows).toBe(512);
    expect(fontNarrow.widths.length).toBe(512);
    expect(fontNarrow.glyphs.length).toBe(512);
  });

  it("DecompressGlyph_Narrow's hardcoded glyph height (text.c:1753)", () => {
    expect(fontNarrow.glyphHeight).toBe(15);
  });

  it("every glyph bitmap matches a fresh decode of latin_narrow.png byte-for-byte (not just present - not stale)", () => {
    const img = decodeIndexedPng(join(REF, "graphics", "fonts", "latin_narrow.png"));
    const CELL = fontNarrow.cellSize;
    for (let code = 0; code < fontNarrow.columns * fontNarrow.rows; code += 1) {
      const gx = (code % fontNarrow.columns) * CELL;
      const gy = Math.floor(code / fontNarrow.columns) * CELL;
      const bitmap: number[] = [];
      for (let y = 0; y < CELL; y += 1) {
        for (let x = 0; x < CELL; x += 1) {
          bitmap.push(img.indices[(gy + y) * img.width + (gx + x)]!);
        }
      }
      expect(bitmap, `glyph code ${code}`).toEqual(fontNarrow.glyphs[code]);
    }
  });

  it("every glyph width matches a fresh re-parse of gFontNarrowLatinGlyphWidths in fonts.c", () => {
    const fontsC = readFileSync(join(REF, "src", "fonts.c"), "utf8");
    const match = /gFontNarrowLatinGlyphWidths\[\]\s*=\s*\{([^}]*)\}/s.exec(fontsC);
    expect(match).not.toBeNull();
    const widths = match![1]!
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(Number);
    expect(widths).toEqual(fontNarrow.widths);
  });

  it("spot-checks a few known glyph widths sampled directly from fonts.c's table", () => {
    // fonts.c:76-108 (gFontNarrowLatinGlyphWidths), row = code>>4, col = code&0xF.
    expect(fontNarrow.widths[charmap.get("R")!]).toBe(5); // row 12 (codes 192-207), col 12
    expect(fontNarrow.widths[charmap.get("A")!]).toBe(5); // row 11 (codes 176-191), col 11
    expect(fontNarrow.widths[charmap.get(" ")!]).toBe(3); // row 0, col 0
    expect(fontNarrow.widths[charmap.get("1")!]).toBe(5); // row 10 (codes 160-175), col 2
    expect(fontNarrow.widths[charmap.get("/")!]).toBe(6); // row 11, col 10 (CHAR_SLASH) - narrower font, wider slash than most glyphs
  });
});

// --- THE decisive test: render real FIGHT-submenu content, compare byte-exact against the oracle harvest ---

// text.pal (graphics/battle_interface/text.pal), gbaRoundTrip-expanded -
// see header comment for the full color-source citation.
const NAME_PALETTE: RgbColor[] = [];
NAME_PALETTE[13] = { r: 74, g: 74, b: 74 };
NAME_PALETTE[14] = { r: 255, g: 255, b: 255 };
NAME_PALETTE[15] = { r: 214, g: 214, b: 206 };
const NAME_COLORS: TextColors = { fg: 13, bg: 14, shadow: 15 };

// SetPPNumbersPaletteInMoveSelection's full-PP (state 3) override from
// text_pp.pal - see header comment. Valid for these 4 moves specifically
// (all harvested at full PP); not the window's own static default.
const PP_PALETTE: RgbColor[] = [];
PP_PALETTE[12] = { r: 74, g: 74, b: 74 };
PP_PALETTE[14] = { r: 255, g: 255, b: 255 };
PP_PALETTE[11] = { r: 222, g: 222, b: 222 };
const PP_COLORS: TextColors = { fg: 12, bg: 14, shadow: 11 };

// Local-to-patch pixel origins - see header comment for how these were found
// and cross-confirmed against sStandardBattleWindowTemplates' tile deltas.
const MOVE_NAME_1_ORIGIN = { x: 15, y: 8 };
const MOVE_NAME_2_ORIGIN = { x: 87, y: 8 };
const MOVE_NAME_3_ORIGIN = { x: 15, y: 24 };
const MOVE_NAME_4_ORIGIN = { x: 87, y: 24 };
const PP_LABEL_ORIGIN = { x: 167, y: 8 };
const TYPE_LABEL_ORIGIN = { x: 167, y: 24 };

// Onix's fixed battle-1 moveset (docs/battle-menu-notes.md §8 / src/data/gen/moves.json) -
// "DRAGONBREATH" has no space: Gen 3's move-name strings are stored exactly
// this way (src/data/gen/moves.json's own MOVE_DRAGON_BREATH entry agrees),
// pixel-confirmed against the harvest, not a rendering artifact.
const SLOTS = ["ROCK_SLIDE", "BIND", "SANDSTORM", "DRAGON_BREATH"];

function extractPatchRegion(slot: string, localX: number, localY: number, w: number, h: number): number[] {
  const patch = fightSubmenuWindow.slots[slot]!;
  const pw = fightSubmenuWindow.width;
  const out: number[] = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = ((localY + y) * pw + (localX + x)) * 3;
      out.push(patch[i]!, patch[i + 1]!, patch[i + 2]!);
    }
  }
  return out;
}

/** Renders `text` with the engine's own `drawText` (src/engine/font.ts, unmodified) at an arbitrary framebuffer position, then reads back exactly the glyph rectangle `measureText` reports - the same "render, then crop" shape as `extractPatchRegion` above, so the two are directly comparable. */
function renderTextRegion(text: string, palette: RgbColor[], colors: TextColors): { w: number; h: number; pixels: number[] } {
  const w = measureText(fontNarrow, charmap, text);
  const h = fontNarrow.glyphHeight;
  const fb = createFramebuffer();
  const ox = 20;
  const oy = 20;
  drawText(fb, fontNarrow, charmap, text, ox, oy, palette, colors);
  const pixels: number[] = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = ((oy + y) * SCREEN_WIDTH + (ox + x)) * 4;
      pixels.push(fb[i]!, fb[i + 1]!, fb[i + 2]!);
    }
  }
  return { w, h, pixels };
}

describe("FONT_NARROW renders the FIGHT submenu's real content byte-exact against the oracle harvest", () => {
  for (const slot of SLOTS) {
    describe(`slot ${slot}`, () => {
      it("ROCK SLIDE (B_WIN_MOVE_NAME_1)", () => {
        const rendered = renderTextRegion("ROCK SLIDE", NAME_PALETTE, NAME_COLORS);
        const harvest = extractPatchRegion(slot, MOVE_NAME_1_ORIGIN.x, MOVE_NAME_1_ORIGIN.y, rendered.w, rendered.h);
        expect(rendered.pixels).toEqual(harvest);
      });

      it("BIND (B_WIN_MOVE_NAME_2)", () => {
        const rendered = renderTextRegion("BIND", NAME_PALETTE, NAME_COLORS);
        const harvest = extractPatchRegion(slot, MOVE_NAME_2_ORIGIN.x, MOVE_NAME_2_ORIGIN.y, rendered.w, rendered.h);
        expect(rendered.pixels).toEqual(harvest);
      });

      it("DRAGONBREATH (B_WIN_MOVE_NAME_3)", () => {
        const rendered = renderTextRegion("DRAGONBREATH", NAME_PALETTE, NAME_COLORS);
        const harvest = extractPatchRegion(slot, MOVE_NAME_3_ORIGIN.x, MOVE_NAME_3_ORIGIN.y, rendered.w, rendered.h);
        expect(rendered.pixels).toEqual(harvest);
      });

      it("SANDSTORM (B_WIN_MOVE_NAME_4)", () => {
        const rendered = renderTextRegion("SANDSTORM", NAME_PALETTE, NAME_COLORS);
        const harvest = extractPatchRegion(slot, MOVE_NAME_4_ORIGIN.x, MOVE_NAME_4_ORIGIN.y, rendered.w, rendered.h);
        expect(rendered.pixels).toEqual(harvest);
      });

      it('"PP" label (B_WIN_PP)', () => {
        const rendered = renderTextRegion("PP", PP_PALETTE, PP_COLORS);
        const harvest = extractPatchRegion(slot, PP_LABEL_ORIGIN.x, PP_LABEL_ORIGIN.y, rendered.w, rendered.h);
        expect(rendered.pixels).toEqual(harvest);
      });

      it('"TYPE/" label (B_WIN_MOVE_TYPE)', () => {
        const rendered = renderTextRegion("TYPE/", NAME_PALETTE, NAME_COLORS);
        const harvest = extractPatchRegion(slot, TYPE_LABEL_ORIGIN.x, TYPE_LABEL_ORIGIN.y, rendered.w, rendered.h);
        expect(rendered.pixels).toEqual(harvest);
      });
    });
  }
});
