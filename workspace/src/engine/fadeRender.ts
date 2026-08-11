// Fading variants of bg.ts/sprites.ts/font.ts's compositing primitives, used
// only during the S4 summary-screen entry/exit palette-fade transitions
// (paletteFade.ts's bgFadeY/objFadeY - see that module's doc for the BG/OBJ
// 1-tick-lag derivation). Each function mirrors its non-fading counterpart
// pixel-for-pixel with y=0 (blendComponentToBlack(c,0) === c, so these are
// safe drop-in replacements, not a behavior change) - kept separate from the
// originals rather than adding an optional fade param to them, since those
// are exercised by every already-0-diff trace and this run's convention is
// to not touch proven-exact code paths without need.

import { setPixel } from "./framebuffer.ts";
import type { RgbColor, TileBg } from "./bg.ts";
import type { SpriteSheet } from "./sprites.ts";
import { drawText, type FontData, type TextColors } from "./font.ts";
import { blendComponentToBlack } from "./paletteFade.ts";

export function fadeColor(c: RgbColor, y: number): RgbColor {
  if (y <= 0) return c;
  return { r: blendComponentToBlack(c.r, y), g: blendComponentToBlack(c.g, y), b: blendComponentToBlack(c.b, y) };
}

export function drawTileBgFaded(fb: Uint8Array, bg: TileBg, y: number, scrollX = 0, scrollY = 0): void {
  const tilesPerRow = bg.tilemap.width;
  for (let screenY = 0; screenY < 160; screenY += 1) {
    const mapY = screenY + scrollY;
    if (mapY < 0) continue;
    const tileRow = Math.floor(mapY / 8);
    const inTileY = mapY % 8;
    for (let screenX = 0; screenX < 240; screenX += 1) {
      const mapX = screenX + scrollX;
      if (mapX < 0) continue;
      const tileCol = Math.floor(mapX / 8);
      const inTileX = mapX % 8;
      const entry = bg.tilemap.entries[tileRow * tilesPerRow + tileCol];
      if (!entry) continue;
      const tile = bg.tileset.tiles[entry.tile];
      if (!tile) continue;
      const sx = entry.hFlip ? 7 - inTileX : inTileX;
      const sy = entry.vFlip ? 7 - inTileY : inTileY;
      const colorIndex = tile[sy * 8 + sx]!;
      if (colorIndex === 0) continue;
      const subpalette = bg.subpalettes[entry.palette] ?? bg.subpalettes[0]!;
      const color = subpalette[colorIndex];
      if (!color) continue;
      const faded = fadeColor(color, y);
      setPixel(fb, screenX, screenY, faded.r, faded.g, faded.b);
    }
  }
}

/**
 * Blits a small tilemap patch (e.g. a runtime CopyNColumnsToTilemap
 * overwrite of part of a larger BG tilemap buffer - see summaryInfoPage.ts's
 * status-sliding-window patch) at a fixed pixel origin, faded on `y`.
 */
export function drawTilePatchFaded(
  fb: Uint8Array,
  tileset: { columns: number; tiles: number[][] },
  subpalettes: RgbColor[][],
  tilemap: { width: number; height: number; entries: Array<{ tile: number; hFlip: boolean; vFlip: boolean; palette: number }> },
  originX: number,
  originY: number,
  y: number,
): void {
  for (let row = 0; row < tilemap.height; row += 1) {
    for (let col = 0; col < tilemap.width; col += 1) {
      const entry = tilemap.entries[row * tilemap.width + col];
      if (!entry) continue;
      const tile = tileset.tiles[entry.tile];
      if (!tile) continue;
      const subpalette = subpalettes[entry.palette] ?? subpalettes[0]!;
      for (let py = 0; py < 8; py += 1) {
        for (let px = 0; px < 8; px += 1) {
          const sx = entry.hFlip ? 7 - px : px;
          const sy = entry.vFlip ? 7 - py : py;
          const colorIndex = tile[sy * 8 + sx]!;
          if (colorIndex === 0) continue;
          const color = subpalette[colorIndex];
          if (!color) continue;
          const faded = fadeColor(color, y);
          setPixel(fb, originX + col * 8 + px, originY + row * 8 + py, faded.r, faded.g, faded.b);
        }
      }
    }
  }
}

export function drawSpriteFaded(
  fb: Uint8Array,
  sheet: SpriteSheet,
  palette: RgbColor[],
  centerX: number,
  centerY: number,
  widthInTiles: number,
  heightInTiles: number,
  firstTileRow: number,
  y: number,
  hFlip = false,
): void {
  const pixelWidth = widthInTiles * 8;
  const pixelHeight = heightInTiles * 8;
  const originX = centerX - Math.floor(pixelWidth / 2);
  const originY = centerY - Math.floor(pixelHeight / 2);
  for (let ty = 0; ty < heightInTiles; ty += 1) {
    for (let tx = 0; tx < widthInTiles; tx += 1) {
      const srcTx = hFlip ? widthInTiles - 1 - tx : tx;
      const tileIndex = (firstTileRow + ty) * sheet.tileset.columns + srcTx;
      const tile = sheet.tileset.tiles[tileIndex];
      if (!tile) continue;
      for (let py = 0; py < 8; py += 1) {
        for (let px = 0; px < 8; px += 1) {
          const sx = hFlip ? 7 - px : px;
          const colorIndex = tile[py * 8 + sx]!;
          if (colorIndex === 0) continue;
          const color = palette[colorIndex];
          if (!color) continue;
          const faded = fadeColor(color, y);
          setPixel(fb, originX + tx * 8 + px, originY + ty * 8 + py, faded.r, faded.g, faded.b);
        }
      }
    }
  }
}

export function drawTextFaded(
  fb: Uint8Array,
  font: FontData,
  charmap: Map<string, number>,
  text: string,
  x: number,
  y: number,
  palette: RgbColor[],
  colors: TextColors,
  fadeY: number,
): void {
  if (fadeY <= 0) {
    drawText(fb, font, charmap, text, x, y, palette, colors);
    return;
  }
  const fadedPalette = palette.map((c) => fadeColor(c, fadeY));
  drawText(fb, font, charmap, text, x, y, fadedPalette, colors);
}
