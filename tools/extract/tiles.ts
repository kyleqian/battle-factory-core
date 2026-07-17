// Slices a decoded indexed image into GBA-style 8x8 tiles (row-major, left
// to right then top to bottom) with palette-index pixels in 0-15 (the low
// nibble of the source PNG index - reference/pokeemerald packs multiple
// 16-color subpalettes into one preview PNG side by side, so the tile's
// subpalette is `index >> 4` and its in-tile color is `index & 0xf`).

import type { IndexedImage } from "./indexedPng.ts";

export interface Tile {
  /** 64 palette-relative color indices (0-15), row-major within the 8x8 tile. */
  pixels: Uint8Array;
  /** Which 16-color subpalette this tile's source pixels came from (0 if the image has <=16 colors). */
  subpalette: number;
}

export function sliceTiles(image: IndexedImage): { columns: number; rows: number; tiles: Tile[] } {
  if (image.width % 8 !== 0 || image.height % 8 !== 0) {
    throw new Error(`image is ${image.width}x${image.height}, not a multiple of 8x8`);
  }
  const columns = image.width / 8;
  const rows = image.height / 8;
  const tiles: Tile[] = [];
  for (let ty = 0; ty < rows; ty += 1) {
    for (let tx = 0; tx < columns; tx += 1) {
      const pixels = new Uint8Array(64);
      let subpalette = 0;
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const srcIndex = image.indices[(ty * 8 + y) * image.width + (tx * 8 + x)]!;
          pixels[y * 8 + x] = srcIndex & 0xf;
          if (srcIndex >= 16) subpalette = srcIndex >> 4;
        }
      }
      tiles.push({ pixels, subpalette });
    }
  }
  return { columns, rows, tiles };
}
