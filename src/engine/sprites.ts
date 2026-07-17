// Composites a single GBA OBJ sprite (a rectangular block of tiles, one
// 16-color palette, drawn center-anchored as reference/pokeemerald's
// CreateSprite does by default) onto the framebuffer.

import { setPixel } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";

export interface SpriteSheet {
  tileset: { columns: number; rows: number; tiles: number[][] };
}

/**
 * Draw a widthInTiles x heightInTiles block of tiles starting at
 * `firstTileRow` (row index into the tileset, in tile units) centered on
 * (centerX, centerY).
 */
export function drawSprite(
  fb: Uint8Array,
  sheet: SpriteSheet,
  palette: RgbColor[],
  centerX: number,
  centerY: number,
  widthInTiles: number,
  heightInTiles: number,
  firstTileRow = 0,
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
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const sx = hFlip ? 7 - x : x;
          const colorIndex = tile[y * 8 + sx]!;
          if (colorIndex === 0) continue; // transparent
          const color = palette[colorIndex];
          if (!color) continue;
          setPixel(fb, originX + tx * 8 + x, originY + ty * 8 + y, color.r, color.g, color.b);
        }
      }
    }
  }
}
