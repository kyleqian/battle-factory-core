// Renders reference/pokeemerald's FONT_NORMAL glyphs (extracted to
// src/data/gen/font-normal.json) the way DecompressGlyphTile does: each raw
// source pixel (0-3) selects a role via sFontHalfRowOffsets - 0=bgColor,
// 1=fgColor, 2=shadowColor, 3 aliases back to bgColor (see text.c:51,
// the offsets table folds every 4th value in each dimension to 0) - then the
// role's color index (from the active TextColors) is looked up in the text
// palette. A resolved color index of literal 0 is never written (GLYPH_COPY
// text.c:585 skips zero nibbles), so it stays transparent over the window's
// existing background.

import { setPixel } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";

export interface FontData {
  cellSize: number;
  columns: number;
  rows: number;
  // DecompressGlyph_Normal (text.c:1883) hardcodes gCurGlyph.height = 15 for
  // the Latin path; GLYPH_COPY never blits the glyph cell's 16th row.
  glyphHeight: number;
  letterSpacing: number;
  widths: number[];
  glyphs: number[][];
}

export interface TextColors {
  fg: number;
  bg: number;
  shadow: number;
}

/**
 * pkm1 (docs/pkm1-pkmn-glyphs.md): a font glyph that charmap.txt names only by a brace code, with no quoted printable character
 * (`PKMN = 53 54`, charmap.txt:51, the small two-glyph PK MN symbol), is carried in display strings as the private-use character
 * U+E000 + glyph code (U+E053 U+E054 for `{PKMN}`). One character per glyph keeps every printer's length (one glyph per frame),
 * `slice` and width right without a per-caller case; `codeForChar` resolves it for every charmap.
 */
export const ROM_GLYPH_CHAR_BASE = 0xe000;
/** Single-byte glyph codes only: 0xF7 and up are control codes (charmap.txt:408+), never drawn glyphs. */
const ROM_GLYPH_CHAR_LIMIT = ROM_GLYPH_CHAR_BASE + 0xf7;

export function romGlyphChar(code: number): string {
  if (!Number.isInteger(code) || code < 0 || code >= 0xf7) throw new Error(`romGlyphChar: ${code} is not a glyph code`);
  return String.fromCharCode(ROM_GLYPH_CHAR_BASE + code);
}

/**
 * charmap.txt's named glyph runs (its Latin glyph section, lines 42-67, before `@ Hiragana`): the brace codes a source string
 * spells that stand for drawn glyphs rather than a control code or a placeholder. Pinned against charmap.txt by
 * `tests/pkm1PkmnGlyphs.test.ts`.
 */
export const ROM_NAMED_GLYPH_CODES: Readonly<Record<string, readonly number[]>> = Object.freeze({
  SUPER_ER: [0x2c],
  LV: [0x34],
  PK: [0x53],
  PKMN: [0x53, 0x54],
  POKEBLOCK: [0x55, 0x56, 0x57, 0x58, 0x59],
  UNK_SPACER: [0x77],
  UP_ARROW: [0x79],
  DOWN_ARROW: [0x7a],
  LEFT_ARROW: [0x7b],
  RIGHT_ARROW: [0x7c],
  SUPER_E: [0x84],
  SUPER_RE: [0xa0],
});

/**
 * A ROM source string (`_("{PKMN} BREEDER")`, trainer_class_names.h:6) as display text: each named glyph code becomes its glyph
 * characters (`romGlyphChar`). Any other brace code (placeholders such as `{B_TRAINER1_NAME}`, control codes) is left as it is,
 * for the caller's own substitution.
 */
export function expandRomGlyphCodes(source: string): string {
  return source.replace(/\{([A-Z_]+)\}/g, (whole, name: string) => {
    const codes = ROM_NAMED_GLYPH_CODES[name];
    return codes === undefined ? whole : codes.map(romGlyphChar).join("");
  });
}

export function codeForChar(charmap: Map<string, number>, ch: string): number | undefined {
  const code = charmap.get(ch);
  if (code !== undefined) return code;
  const point = ch.charCodeAt(0);
  return ch.length === 1 && point >= ROM_GLYPH_CHAR_BASE && point < ROM_GLYPH_CHAR_LIMIT ? point - ROM_GLYPH_CHAR_BASE : undefined;
}

export function measureText(font: FontData, charmap: Map<string, number>, text: string): number {
  let width = 0;
  for (const ch of text) {
    const code = codeForChar(charmap, ch);
    if (code === undefined) continue;
    width += (font.widths[code] ?? font.cellSize) + font.letterSpacing;
  }
  return width > 0 ? width - font.letterSpacing : 0;
}

export function rightAlignXOffset(font: FontData, charmap: Map<string, number>, text: string, totalWidth: number): number {
  return totalWidth - measureText(font, charmap, text);
}

export function drawText(
  fb: Uint8Array,
  font: FontData,
  charmap: Map<string, number>,
  text: string,
  x: number,
  y: number,
  palette: RgbColor[],
  colors: TextColors,
  /** Rows outside [min, max) are not drawn (a window's pixel buffer, e.g. a scrolling field message box). */
  clipY?: { readonly min: number; readonly max: number },
): void {
  let cursorX = x;
  for (const ch of text) {
    const code = codeForChar(charmap, ch);
    if (code === undefined) {
      cursorX += font.widths[0] ?? font.cellSize;
      continue;
    }
    const bitmap = font.glyphs[code];
    if (bitmap) {
      // text.c:608-609 (DecompressAndCopyTileToWindow): glyphWidth is clamped
      // to gCurGlyph.width (this glyph's own proportional advance, ==
      // font.widths[code]) before GLYPH_COPY runs - real hardware never
      // copies the template cell's trailing padding columns. Every glyph's
      // bitmap has literal 0s (bg role) out to font.cellSize past its own
      // width; drawing those unconditionally (as an earlier version of this
      // loop did) paints a solid bg-color block past the last character of
      // any bg!=0 string, invisible until it overlaps something that isn't
      // already that color (ISSUES #8 gap 3: the info window's yellow
      // border, 2px right of "?" in "Are these three POKéMON OK?").
      const glyphWidth = font.widths[code] ?? font.cellSize;
      for (let gy = 0; gy < font.glyphHeight; gy += 1) {
        for (let gx = 0; gx < glyphWidth; gx += 1) {
          const raw = bitmap[gy * font.cellSize + gx]!;
          const role = raw === 3 ? 0 : raw;
          const colorIndex = role === 0 ? colors.bg : role === 1 ? colors.fg : colors.shadow;
          if (colorIndex === 0) continue;
          const color = palette[colorIndex];
          if (!color) continue;
          if (clipY !== undefined && (y + gy < clipY.min || y + gy >= clipY.max)) continue;
          setPixel(fb, cursorX + gx, y + gy, color.r, color.g, color.b);
        }
      }
    }
    cursorX += (font.widths[code] ?? font.cellSize) + font.letterSpacing;
  }
}

/**
 * Same glyph-cell blit as `drawText`, but for a caller-supplied glyph-code
 * array rather than a charmap-resolved string - needed for runs that mix in
 * font-encoding-only codes with no charmap entry (e.g. `CHAR_SPACER`,
 * ConvertIntToDecimalStringN's own right-align padding glyph, battleMenu.ts's
 * `ppRemainingGlyphCodes`). No letter-spacing gap added (unused by any
 * current caller; add if a future one needs it).
 */
export function drawGlyphCodes(
  fb: Uint8Array,
  font: FontData,
  codes: readonly number[],
  x: number,
  y: number,
  palette: RgbColor[],
  colors: TextColors,
): void {
  let cursorX = x;
  for (const code of codes) {
    const bitmap = font.glyphs[code];
    const glyphWidth = font.widths[code] ?? font.cellSize;
    if (bitmap) {
      for (let gy = 0; gy < font.glyphHeight; gy += 1) {
        for (let gx = 0; gx < glyphWidth; gx += 1) {
          const raw = bitmap[gy * font.cellSize + gx]!;
          const role = raw === 3 ? 0 : raw;
          const colorIndex = role === 0 ? colors.bg : role === 1 ? colors.fg : colors.shadow;
          if (colorIndex === 0) continue;
          const color = palette[colorIndex];
          if (!color) continue;
          setPixel(fb, cursorX + gx, y + gy, color.r, color.g, color.b);
        }
      }
    }
    cursorX += glyphWidth;
  }
}

/** Draw one glyph through a source CopyGlyphToWindow row boundary. */
export function drawGlyphCodeRows(
  fb: Uint8Array,
  font: FontData,
  code: number,
  x: number,
  y: number,
  palette: RgbColor[],
  colors: TextColors,
  rasterRows: number,
  lastRowColumns?: number | readonly number[],
): void {
  const bitmap = font.glyphs[code];
  const glyphWidth = font.widths[code] ?? font.cellSize;
  if (!bitmap) return;
  for (let gy = 0; gy < Math.min(font.glyphHeight, rasterRows); gy += 1) {
    const visibleRows = Math.min(font.glyphHeight, rasterRows);
    const trailingColumns =
      Array.isArray(lastRowColumns) &&
      gy >= visibleRows - lastRowColumns.length
        ? lastRowColumns[gy - (visibleRows - lastRowColumns.length)]
        : undefined;
    const rowWidth =
      trailingColumns !== undefined
        ? Math.min(glyphWidth, trailingColumns)
        : typeof lastRowColumns === "number" && gy === visibleRows - 1
          ? Math.min(glyphWidth, lastRowColumns)
          : glyphWidth;
    for (let gx = 0; gx < rowWidth; gx += 1) {
      const raw = bitmap[gy * font.cellSize + gx]!;
      const role = raw === 3 ? 0 : raw;
      const colorIndex = role === 0 ? colors.bg : role === 1 ? colors.fg : colors.shadow;
      if (colorIndex === 0) continue;
      const color = palette[colorIndex];
      if (!color) continue;
      setPixel(fb, x + gx, y + gy, color.r, color.g, color.b);
    }
  }
}
