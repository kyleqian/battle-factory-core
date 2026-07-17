// Renders reference/pokeemerald's FONT_NORMAL glyphs (extracted to
// src/data/gen/font-normal.json) the way RenderFont/GenerateFontHalfRowLookupTable
// do: each glyph pixel is one of 4 raw values (0 = transparent, 1 = bgColor,
// 2 = fgColor, 3 = shadowColor), each color an index into the active text
// palette (src/assets/gen/text-palette.json).

import { setPixel } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";

export interface FontData {
  cellSize: number;
  columns: number;
  rows: number;
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
      for (let gy = 0; gy < font.cellSize; gy += 1) {
        for (let gx = 0; gx < font.cellSize; gx += 1) {
          const raw = bitmap[gy * font.cellSize + gx]!;
          if (raw === 0) continue;
          const colorIndex = raw === 1 ? colors.bg : raw === 2 ? colors.fg : colors.shadow;
          const color = palette[colorIndex];
          if (!color) continue;
          setPixel(fb, cursorX + gx, y + gy, color.r, color.g, color.b);
        }
      }
    }
    cursorX += (font.widths[code] ?? font.cellSize) + font.letterSpacing;
  }
}
