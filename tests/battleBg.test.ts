import { describe, expect, it } from "vitest";
import bg from "../src/assets/gen/battle-bg.json" with { type: "json" };

// Oracle cross-check (docs/battle-bringup-notes.md's transition-end scene,
// scratch trace): rendering the static tileset+tilemap+palette below
// reproduces the oracle's on-screen sky/cloud strip (the visible portion of
// this bg not covered by the ground/terrain layer drawn in front of it)
// byte-for-byte - 1920/1920 pixels exact across the top 8 rows, full width.
// Getting there took two corrections a naive source reading missed (see
// tools/extract/extract-battle-bg.ts's header comment for the full story):
// map.bin is 32 tiles wide x 64 tall (not 64x32), and each tile's palette
// nibble is offset +2 from this table's own local subpalette index.

describe("battle-bg.json", () => {
  it("has 3 subpalettes of 16 colors (gBattleEnvironmentPalette_Frontier)", () => {
    expect(bg.palette).toHaveLength(3);
    for (const p of bg.palette) expect(p).toHaveLength(16);
  });

  it("has a 32x64 static tilemap (not 64x32 - see extractor header note)", () => {
    expect(bg.static.tilemap.width).toBe(32);
    expect(bg.static.tilemap.height).toBe(64);
    expect(bg.static.tilemap.entries).toHaveLength(32 * 64);
  });

  it("pins entry 0 (oracle-confirmed 100% exact top-left on-screen tile)", () => {
    expect(bg.static.tilemap.entries[0]).toEqual({ tile: 98, hFlip: false, vFlip: false, palette: 0 });
  });

  it("normalizes all tilemap palette nibbles into the 3 loaded subpalettes (0-2)", () => {
    const used = new Set(bg.static.tilemap.entries.map((e) => e.palette));
    for (const p of used) expect(p).toBeLessThanOrEqual(2);
  });

  it("pins tile 98's raw pixel indices (the oracle-matched top-left sky tile)", () => {
    expect(bg.static.tileset.tiles[98].slice(0, 8)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it("has a 32x32 entry-slide tilemap (single screen block, no width ambiguity)", () => {
    expect(bg.entrySlide.tilemap.width).toBe(32);
    expect(bg.entrySlide.tilemap.height).toBe(32);
  });
});
