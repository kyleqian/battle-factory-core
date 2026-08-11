// Composites a single GBA OBJ sprite (a rectangular block of tiles, one
// 16-color palette, drawn center-anchored as reference/pokeemerald's
// CreateSprite does by default) onto the framebuffer.

import { setPixel } from "./framebuffer.ts";
import type { RgbColor } from "./bg.ts";

export interface SpriteSheet {
  tileset: { columns: number; rows: number; tiles: number[][] };
}

function gbaAlphaBlendChannel(
  target1: number,
  target2: number,
  eva: number,
  evb: number,
): number {
  const a = Math.min(16, Math.max(0, eva));
  const b = Math.min(16, Math.max(0, evb));
  return Math.min(255, Math.floor((target1 * a + target2 * b) / 16));
}

/**
 * Composites the selected semi-transparent OBJ pixel using a non-OBJ target-2
 * buffer.
 *
 * GBA OBJ evaluation retains only the frontmost opaque OBJ texel for a
 * screen pixel. If that texel has OBJ mode 1, BLDCNT/BLDALPHA can blend it
 * with an eligible BG/backdrop pixel, but an obscured OBJ texel is no longer
 * available as target 2. Callers may still visit whole sprites
 * back-to-front to resolve OAM ordering; every visit must read target 2 from
 * the same BG/backdrop-only buffer rather than the accumulated OBJ output.
 */
export function compositeSemiTransparentObjPixel(
  output: Uint8Array,
  nonObjTarget2: Uint8Array,
  x: number,
  y: number,
  target1: RgbColor,
  eva: number,
  evb: number,
): void {
  if (x < 0 || y < 0 || x >= 240 || y >= 160) return;
  const offset = (y * 240 + x) * 4;
  output[offset] = gbaAlphaBlendChannel(
    target1.r,
    nonObjTarget2[offset]!,
    eva,
    evb,
  );
  output[offset + 1] = gbaAlphaBlendChannel(
    target1.g,
    nonObjTarget2[offset + 1]!,
    eva,
    evb,
  );
  output[offset + 2] = gbaAlphaBlendChannel(
    target1.b,
    nonObjTarget2[offset + 2]!,
    eva,
    evb,
  );
  output[offset + 3] = 255;
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
