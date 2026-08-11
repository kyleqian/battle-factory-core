import { describe, expect, it } from "vitest";
import { parseTilemap } from "../tools/extract/tilemap.ts";

describe("parseTilemap", () => {
  it("decodes tile/flip/palette bitfields from a GBA screen entry", () => {
    // tile=5, hFlip=1, vFlip=0, palette=3 -> bits: pal(4)<<12 | vFlip<<11 | hFlip<<10 | tile
    const value = (3 << 12) | (0 << 11) | (1 << 10) | 5;
    const buf = Buffer.alloc(2 * 1 * 1);
    buf.writeUInt16LE(value, 0);
    const tilemap = parseTilemap(buf, 1, 1);
    expect(tilemap.entries).toEqual([{ tile: 5, hFlip: true, vFlip: false, palette: 3 }]);
  });

  it("decodes a full 32x32 screen in row-major order", () => {
    const width = 32;
    const height = 32;
    const buf = Buffer.alloc(width * height * 2);
    // second row (index width), third column -> linear index width*1 + 2
    const targetIndex = width * 1 + 2;
    buf.writeUInt16LE(42, targetIndex * 2);
    const tilemap = parseTilemap(buf, width, height);
    expect(tilemap.entries[targetIndex]).toEqual({ tile: 42, hFlip: false, vFlip: false, palette: 0 });
    expect(tilemap.entries.filter((e) => e.tile !== 0)).toHaveLength(1);
  });

  it("rejects a buffer of the wrong size", () => {
    expect(() => parseTilemap(Buffer.alloc(10), 32, 32)).toThrow(/tilemap buffer is/);
  });
});
