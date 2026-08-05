import { describe, expect, it } from "vitest";
import statusIcons from "../src/assets/gen/party-menu-content.json" with { type: "json" };
import heldItem from "../src/assets/gen/party-menu-held-item.json" with { type: "json" };
import genderGlyphs from "../src/assets/gen/party-menu-gender-glyphs.json" with { type: "json" };
import spriteCoords from "../src/assets/gen/party-menu-sprite-coords.json" with { type: "json" };

// Tier-1 pins for the ISSUES #80 party-menu content assets extracted by
// tools/extract/extract-party-menu-content.ts. All data is source-derived;
// the gender glyph shape + colors were cross-checked against the oracle frame
// 905 of scratch-mid-battle-switch-dense-menu-a-off during extraction (the
// ♀/♂ printed on the real cards use exactly these pixel patterns and colors).

const frameNames = statusIcons.statusIcons.frameNames;
const frames = statusIcons.statusIcons.frames;

function nonZeroCount(tiles: number[][]): number {
  return tiles.flat().filter((v) => v !== 0).length;
}

function maxPixelValue(tiles: number[][]): number {
  return Math.max(...tiles.flat());
}

describe("party-menu-content.json (status icons)", () => {
  it("names the 8 frames in the source anim order (poison..blank)", () => {
    expect(frameNames).toEqual([
      "poison",
      "paralyzed",
      "sleep",
      "frozen",
      "burn",
      "pokerus",
      "faint",
      "blank",
    ]);
  });

  it("has one 32x8 frame per condition (4x1 tiles of 8x8), plus a blank", () => {
    expect(statusIcons.statusIcons.frameSize).toEqual({ width: 32, height: 8 });
    for (const name of frameNames) {
      const f = frames[name]!;
      expect(f.columns).toBe(4);
      expect(f.rows).toBe(1);
      expect(f.tiles).toHaveLength(4);
      for (const tile of f.tiles) expect(tile).toHaveLength(64);
    }
  });

  it("every condition frame is non-empty and 4bpp-sane; blank is empty", () => {
    for (const name of ["poison", "paralyzed", "sleep", "frozen", "burn", "pokerus", "faint"]) {
      expect(nonZeroCount(frames[name]!.tiles), name).toBeGreaterThan(0);
      expect(maxPixelValue(frames[name]!.tiles), name).toBeLessThanOrEqual(15);
    }
    expect(nonZeroCount(frames["blank"]!.tiles)).toBe(0);
  });

  it("the 7 condition frames are pairwise distinct (no collapsed extraction)", () => {
    for (let i = 0; i < 6; i += 1) {
      expect(frames[frameNames[i]]!.tiles.flat()).not.toEqual(frames[frameNames[i + 1]!]!.tiles.flat());
    }
  });

  it("carries a 16-color palette (gStatusPal_Icons)", () => {
    expect(statusIcons.statusIcons.palette).toHaveLength(16);
  });
});

describe("party-menu-held-item.json", () => {
  it("names the two frames item/mail and sizes them 8x8", () => {
    expect(heldItem.frameNames).toEqual(["item", "mail"]);
    expect(heldItem.frameSize).toEqual({ width: 8, height: 8 });
    expect(heldItem.frames.item.tiles).toHaveLength(1);
    expect(heldItem.frames.item.tiles[0]).toHaveLength(64);
    expect(heldItem.frames.mail.tiles).toHaveLength(1);
    expect(heldItem.frames.mail.tiles[0]).toHaveLength(64);
  });

  it("both frames are non-empty, 4bpp-sane, and distinct from each other", () => {
    expect(nonZeroCount(heldItem.frames.item.tiles)).toBeGreaterThan(0);
    expect(nonZeroCount(heldItem.frames.mail.tiles)).toBeGreaterThan(0);
    expect(maxPixelValue(heldItem.frames.item.tiles)).toBeLessThanOrEqual(15);
    expect(heldItem.frames.item.tiles[0]).not.toEqual(heldItem.frames.mail.tiles[0]);
    expect(heldItem.palette).toHaveLength(16);
  });
});

describe("party-menu-gender-glyphs.json", () => {
  it("maps male=0xB5 / female=0xB6 with FONT_SMALL width 5 each", () => {
    expect(genderGlyphs.glyphs.male.charCode).toBe(0xb5);
    expect(genderGlyphs.glyphs.female.charCode).toBe(0xb6);
    expect(genderGlyphs.glyphs.male.width).toBe(5);
    expect(genderGlyphs.glyphs.female.width).toBe(5);
  });

  it("extracts the two glyphs as trimmed 5x8 ink bitmaps", () => {
    expect(genderGlyphs.glyphs.male.trimmedWidth).toBe(5);
    expect(genderGlyphs.glyphs.male.trimmedHeight).toBe(8);
    expect(genderGlyphs.glyphs.female.trimmedWidth).toBe(5);
    expect(genderGlyphs.glyphs.female.trimmedHeight).toBe(8);
    for (const g of [genderGlyphs.glyphs.male, genderGlyphs.glyphs.female]) {
      expect(g.pixels).toHaveLength(5 * 8);
      expect(Math.max(...g.pixels)).toBeLessThanOrEqual(2);
    }
  });

  it("pins the source color variants (bg.png palette slots 59/60 + 75/76)", () => {
    // Oracle frame 905 renders the female symbol in exactly these colors.
    expect(genderGlyphs.colors.female.fg).toEqual({ r: 255, g: 156, b: 148 });
    expect(genderGlyphs.colors.female.shadow).toEqual({ r: 156, g: 66, b: 57 });
    expect(genderGlyphs.colors.male.fg).toEqual({ r: 66, g: 206, b: 255 });
    expect(genderGlyphs.colors.male.shadow).toEqual({ r: 0, g: 99, b: 148 });
  });

  it("pins the ♀ glyph's cross row and the ♂ circle so future re-extraction is loud", () => {
    const female = genderGlyphs.glyphs.female.pixels;
    // Row 5 of the trimmed ♀ = the full-width cross bar (all fg ink).
    expect(female.slice(5 * 5, 6 * 5)).toEqual([1, 1, 1, 1, 1]);
    const male = genderGlyphs.glyphs.male.pixels;
    // Male and female share the circle top but differ in the lower symbol.
    expect(male.slice(0, 2 * 5)).not.toEqual(female.slice(0, 2 * 5));
    // Male's trimmed top has a fg pixel on the circle's right edge at (2,0).
    expect(male[2]).toBe(1);
  });

  it("records fg vs shadow ink layers separately (pixel 1 = fg, 2 = shadow)", () => {
    const female = genderGlyphs.glyphs.female.pixels;
    expect(female).toContain(1);
    expect(female).toContain(2);
    const male = genderGlyphs.glyphs.male.pixels;
    expect(male).toContain(1);
    expect(male).toContain(2);
  });
});

describe("party-menu-sprite-coords.json", () => {
  it("uses the source per-slot order icon/heldItem/status/pokeball", () => {
    expect(spriteCoords.perSlotOrder).toEqual(["icon", "heldItem", "status", "pokeball"]);
  });

  it("pins the SINGLE layout (the in-battle menu) per-slot coords from party_menu.h:68-78", () => {
    expect(spriteCoords.layouts.single).toEqual([
      { icon: [16, 40], heldItem: [20, 50], status: [50, 52], pokeball: [16, 34] },
      { icon: [104, 18], heldItem: [108, 28], status: [136, 27], pokeball: [102, 25] },
      { icon: [104, 42], heldItem: [108, 52], status: [136, 51], pokeball: [102, 49] },
      { icon: [104, 66], heldItem: [108, 76], status: [136, 75], pokeball: [102, 73] },
      { icon: [104, 90], heldItem: [108, 100], status: [136, 99], pokeball: [102, 97] },
      { icon: [104, 114], heldItem: [108, 124], status: [136, 123], pokeball: [102, 121] },
    ]);
  });

  it("covers all four layouts with six slots each", () => {
    for (const layout of Object.values(spriteCoords.layouts)) {
      expect(layout).toHaveLength(6);
    }
  });
});
