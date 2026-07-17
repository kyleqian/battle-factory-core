import { describe, expect, it } from "vitest";
import { expand5to8, gbaRoundTrip, to5Bit } from "../tools/extract/gbaColor.ts";
import { parseJascPal } from "../tools/extract/jascPal.ts";
import { sliceTiles } from "../tools/extract/tiles.ts";
import type { IndexedImage } from "../tools/extract/indexedPng.ts";

describe("gbaColor", () => {
  it("expands 5-bit GBA channel values the way mGBA's framebuffer does", () => {
    expect(expand5to8(0)).toBe(0);
    expect(expand5to8(31)).toBe(255);
    expect(expand5to8(20)).toBe(165); // (20<<3)|(20>>2) = 160|5
  });

  it("round-trips reference-art 8-bit values through the true 5-bit color", () => {
    // These are real values from reference/pokeemerald's interface.pal, verified
    // against the oracle anchor screenshot's actual pixel colors.
    expect(to5Bit(164)).toBe(20);
    expect(gbaRoundTrip(164)).toBe(165);
    expect(gbaRoundTrip(255)).toBe(255);
    expect(gbaRoundTrip(0)).toBe(0);
  });
});

describe("parseJascPal", () => {
  it("parses a JASC-PAL file and round-trips its colors to oracle-matching RGB", () => {
    const text = ["JASC-PAL", "0100", "2", "0 0 0", "255 0 0"].join("\n");
    const colors = parseJascPal(text);
    expect(colors).toEqual([
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 0, b: 0 },
    ]);
  });

  it("rejects a non-JASC-PAL file", () => {
    expect(() => parseJascPal("not a palette")).toThrow(/JASC-PAL/);
  });
});

describe("sliceTiles", () => {
  it("slices a 16x8 indexed image into two row-major 8x8 tiles", () => {
    const width = 16;
    const height = 8;
    const indices = new Uint8Array(width * height);
    // Mark the top-left pixel of the second tile (tx=1) distinctly.
    indices[0 * width + 8] = 7;
    const image: IndexedImage = { width, height, bitDepth: 8, palette: [], indices };
    const { columns, rows, tiles } = sliceTiles(image);
    expect(columns).toBe(2);
    expect(rows).toBe(1);
    expect(tiles).toHaveLength(2);
    expect(tiles[0]!.pixels[0]).toBe(0);
    expect(tiles[1]!.pixels[0]).toBe(7);
  });

  it("rejects images that aren't a multiple of 8x8", () => {
    const image: IndexedImage = { width: 5, height: 8, bitDepth: 8, palette: [], indices: new Uint8Array(40) };
    expect(() => sliceTiles(image)).toThrow(/multiple of 8x8/);
  });
});
