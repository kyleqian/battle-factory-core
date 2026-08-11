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

export function codeForChar(charmap: Map<string, number>, ch: string): number | undefined {
  return charmap.get(ch);
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
