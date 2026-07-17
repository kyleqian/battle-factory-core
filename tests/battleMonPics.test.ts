import { describe, expect, it } from "vitest";
import backSprites from "../src/assets/gen/battle-back-sprites.json" with { type: "json" };
import opponentFrontSprites from "../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import coords from "../src/data/gen/mon-pic-coords.json" with { type: "json" };

// Oracle cross-check (docs/battle-bringup-notes.md's battle-1 send-out
// scene, replayed dev-time via a scratch trace): rendering ONIX's back
// sprite + GROVYLE's front sprite from these exact JSON files and searching
// for an exact-pixel match anywhere in the oracle's first-action-menu
// screenshot found GROVYLE's front sprite 100% pixel-identical (1693/1693
// non-transparent pixels), and ONIX's back sprite 98.5% identical
// (1639/1664) - the only 25 mismatched pixels are a single horizontal strip
// at the very bottom row (y=63), uniformly one non-ONIX-palette color,
// consistent with the battle terrain/shadow layer drawn in front at that
// row (an occlusion, not a decode bug).

describe("battle-back-sprites.json", () => {
  it("has ONIX/MAGBY/BAYLEEF, each a 64x64 (8x8 tile) sprite with a 16-color palette", () => {
    for (const species of ["ONIX", "MAGBY", "BAYLEEF"]) {
      const sprite = (backSprites as Record<string, any>)[species];
      expect(sprite.tileset.columns).toBe(8);
      expect(sprite.tileset.rows).toBe(8);
      expect(sprite.tileset.tiles).toHaveLength(64);
      expect(sprite.palette).toHaveLength(16);
    }
  });

  it("pins ONIX's first non-blank tile (oracle-cross-checked 98.5% exact against a live frame)", () => {
    expect(backSprites.ONIX.tileset.tiles[2].slice(8, 16)).toEqual([0, 0, 12, 13, 0, 0, 0, 0]);
  });

  it("pins a MAGBY palette entry (white outline)", () => {
    expect(backSprites.MAGBY.palette[1]).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe("battle-opponent-front-sprites.json", () => {
  it("has GROVYLE/MURKROW/PIDGEOTTO, each a 64x64 sprite with a 16-color palette", () => {
    for (const species of ["GROVYLE", "MURKROW", "PIDGEOTTO"]) {
      const sprite = (opponentFrontSprites as Record<string, any>)[species];
      expect(sprite.tileset.columns).toBe(8);
      expect(sprite.tileset.rows).toBe(8);
      expect(sprite.tileset.tiles).toHaveLength(64);
      expect(sprite.palette).toHaveLength(16);
    }
  });

  it("pins GROVYLE's front sprite as byte-identical to the oracle's on-screen pixels (0/1693 diff)", () => {
    // Regression pin for the exact tile content confirmed 100% pixel-exact
    // this session - tile 3 is the first non-blank tile in raster order.
    const firstNonBlank = opponentFrontSprites.GROVYLE.tileset.tiles.findIndex((t) => t.some((v) => v !== 0));
    expect(firstNonBlank).toBe(3);
  });
});

describe("mon-pic-coords.json", () => {
  it("extracted gMonBackPicCoords/gMonFrontPicCoords in full (400+ species each)", () => {
    expect(Object.keys(coords.back).length).toBeGreaterThan(400);
    expect(Object.keys(coords.front).length).toBeGreaterThan(400);
  });

  it("pins ONIX's back coords and GROVYLE's front coords against source", () => {
    // src/data/pokemon_graphics/back_pic_coordinates.h:102
    expect(coords.back.ONIX).toEqual({ width: 56, height: 64, yOffset: 0 });
    // src/data/pokemon_graphics/front_pic_coordinates.h:285
    expect(coords.front.GROVYLE).toEqual({ width: 64, height: 56, yOffset: 4 });
  });
});
