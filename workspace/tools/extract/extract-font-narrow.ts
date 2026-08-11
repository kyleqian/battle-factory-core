// Dev-time extractor: reads reference/pokeemerald's FONT_NARROW glyph sheet
// (graphics/fonts/latin_narrow.png) + its per-glyph width table
// (src/fonts.c's gFontNarrowLatinGlyphWidths) and writes
// src/data/gen/font-narrow.json, same schema family as font-normal.json
// (extract-factory-screen.ts) / font-small.json (extract-battle-healthbox.ts).
//
// FONT_NARROW is source-confirmed a genuinely separate glyph tileset from
// FONT_NORMAL (not just a narrower width table over the same glyphs) -
// DecompressGlyph_Narrow (text.c:1725) reads gFontNarrowLatinGlyphs, a
// distinct INCGFX_U16 array from gFontNormalLatinGlyphs, and
// gFontNarrowLatinGlyphWidths is its own separate width table (fonts.c:75-108,
// vs. font-normal's own table elsewhere in the same file). It backs the
// FIGHT (move-select) submenu's B_WIN_MOVE_NAME_*/B_WIN_PP/B_WIN_MOVE_TYPE
// windows (battle_message.c:1509-1583) - ISSUES #20's extraction half.
//
// sFontInfos[FONT_NARROW] (text.c:191-199): maxLetterWidth=5,
// maxLetterHeight=16, letterSpacing=0, lineSpacing=0, fgColor=2/bgColor=1/
// shadowColor=3 - these are the *generic* placeholder colors every font
// entry in sFontInfos carries (FONT_NORMAL/FONT_SHORT/etc. all say the same
// 2/1/3); real battle windows override them via their own WindowFontInfo
// template (battle_message.c's sBattleTextColor-equivalent table) - e.g.
// B_WIN_MOVE_NAME_*/B_WIN_MOVE_TYPE use fgColor=13/bgColor=14/shadowColor=15,
// B_WIN_PP uses fgColor=12/bgColor=14/shadowColor=11 (battle_message.c:1509-
// 1583) - so this extractor records the sFontInfos defaults faithfully (for
// schema parity with font-normal.json) but callers rendering real battle
// windows must supply the window-specific triple, not these defaults.
// DecompressGlyph_Narrow (text.c:1725-1754) hardcodes gCurGlyph.height = 15
// regardless of maxLetterHeight, same as DecompressGlyph_Normal - the glyph
// cell's 16th row is template padding, never blitted.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-font-narrow.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");

mkdirSync(DATA_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

const fontImage = decodeIndexedPng(join(REF, "graphics", "fonts", "latin_narrow.png"));
const CELL = 16;
const columns = fontImage.width / CELL;
const rows = fontImage.height / CELL;
const glyphCount = columns * rows;
const glyphs: number[][] = [];
for (let code = 0; code < glyphCount; code += 1) {
  const gx = (code % columns) * CELL;
  const gy = Math.floor(code / columns) * CELL;
  const bitmap: number[] = [];
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      bitmap.push(fontImage.indices[(gy + y) * fontImage.width + (gx + x)]!);
    }
  }
  glyphs.push(bitmap);
}

const fontsC = readFileSync(join(REF, "src", "fonts.c"), "utf8");
const widthsMatch = /gFontNarrowLatinGlyphWidths\[\]\s*=\s*\{([^}]*)\}/s.exec(fontsC);
if (!widthsMatch) throw new Error("could not find gFontNarrowLatinGlyphWidths in fonts.c");
const widths = widthsMatch[1]!
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s.length > 0)
  .map(Number);
if (widths.length !== glyphCount) {
  throw new Error(`expected ${glyphCount} glyph widths, parsed ${widths.length}`);
}

writeJson(join(DATA_GEN, "font-narrow.json"), {
  cellSize: CELL,
  columns,
  rows,
  // FONT_NARROW, from sFontInfos in reference/pokeemerald/src/text.c:191-199.
  maxLetterWidth: 5,
  maxLetterHeight: 16,
  // DecompressGlyph_Narrow (text.c:1725) hardcodes gCurGlyph.height = 15 for
  // the Latin glyph path regardless of maxLetterHeight - GLYPH_COPY never
  // blits the glyph cell's 16th row, so it must be excluded here too (same
  // convention as font-normal.json).
  glyphHeight: 15,
  letterSpacing: 0,
  lineSpacing: 0,
  // sFontInfos[FONT_NARROW]'s own generic placeholder colors - see header
  // comment: real battle windows override these per-window.
  defaultFgColor: 2,
  defaultBgColor: 1,
  defaultShadowColor: 3,
  widths,
  glyphs,
});

console.log("extraction complete");
