// Composites a GBA BG tileset+tilemap (as extracted by tools/extract/) onto
// the framebuffer. Tile pixel value 0 within a subpalette is transparent
// (standard GBA convention - palette index 0 of a BG subpalette is never drawn).

import { SCREEN_HEIGHT, SCREEN_WIDTH, setPixel } from "./framebuffer.ts";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface TileBg {
  tileset: { columns: number; rows: number; tiles: number[][] };
  tilemap: {
    width: number;
    height: number;
    entries: Array<{ tile: number; hFlip: boolean; vFlip: boolean; palette: number }>;
  };
  subpalettes: RgbColor[][];
}

export function drawTileBg(fb: Uint8Array, bg: TileBg, scrollX = 0, scrollY = 0): void {
  const tilesPerRow = bg.tilemap.width;
  for (let screenY = 0; screenY < SCREEN_HEIGHT; screenY += 1) {
    const mapY = screenY + scrollY;
    const tileRow = Math.floor(mapY / 8);
    const inTileY = mapY % 8;
    for (let screenX = 0; screenX < SCREEN_WIDTH; screenX += 1) {
      const mapX = screenX + scrollX;
      const tileCol = Math.floor(mapX / 8);
      const inTileX = mapX % 8;
      const entry = bg.tilemap.entries[tileRow * tilesPerRow + tileCol];
      if (!entry) continue;
      const tile = bg.tileset.tiles[entry.tile];
      if (!tile) continue;
      const sx = entry.hFlip ? 7 - inTileX : inTileX;
      const sy = entry.vFlip ? 7 - inTileY : inTileY;
      const colorIndex = tile[sy * 8 + sx]!;
      if (colorIndex === 0) continue; // transparent
      const subpalette = bg.subpalettes[entry.palette] ?? bg.subpalettes[0]!;
      const color = subpalette[colorIndex];
      if (!color) continue;
      setPixel(fb, screenX, screenY, color.r, color.g, color.b);
    }
  }
}
