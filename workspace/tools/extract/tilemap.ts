// Parser for GBA BG tilemap .bin files (raw u16 screen entries, 32x32 tiles
// for a regular-size background): bits 0-9 tile number, bit 10 hFlip, bit 11
// vFlip, bits 12-15 palette number.

export interface TilemapEntry {
  tile: number;
  hFlip: boolean;
  vFlip: boolean;
  palette: number;
}

export interface Tilemap {
  width: number;
  height: number;
  entries: TilemapEntry[];
}

export function parseTilemap(buf: Buffer | Uint8Array, width = 32, height = 32): Tilemap {
  const expected = width * height * 2;
  if (buf.length !== expected) {
    throw new Error(`tilemap buffer is ${buf.length} bytes, expected ${expected} for ${width}x${height}`);
  }
  const entries: TilemapEntry[] = [];
  for (let i = 0; i < width * height; i += 1) {
    const value = buf[i * 2]! | (buf[i * 2 + 1]! << 8);
    entries.push({
      tile: value & 0x3ff,
      hFlip: (value & 0x400) !== 0,
      vFlip: (value & 0x800) !== 0,
      palette: (value >> 12) & 0xf,
    });
  }
  return { width, height, entries };
}
