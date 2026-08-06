import { describe, expect, it } from "vitest";
import partyMenuContentData from "../src/assets/gen/party-menu-content.json" with { type: "json" };
import partyMenuHeldItemData from "../src/assets/gen/party-menu-held-item.json" with { type: "json" };
import partyMenuSpriteCoordsData from "../src/assets/gen/party-menu-sprite-coords.json" with { type: "json" };

/**
 * ISSUES #80 rank 5: status-condition + held-item icon contract for the
 * in-battle party menu, pinned from docs/party-menu-status-item-ground-truth.md
 * (fixture tools/battle-lab/party-menu-status-item-off.json, two fresh oracle
 * runs byte-identical 251/251). This asserts the banked icon assets against
 * the oracle-sampled ground truth: the sprite coords are CENTERS, the PRZ
 * glyph palette is exactly indices 2/6/7, the held-item glyph palette is
 * indices 4/5/6/7/15, and a MAIN bind can reproduce the measured per-slot
 * bboxes by blitting the tiles at (center - halfsize).
 */

type Rgb = { r: number; g: number; b: number };
type Tile = { columns: number; rows: number; tiles: readonly (readonly number[])[] };

function paletteColor(palette: readonly Rgb[], index: number): string {
  const c = palette[index]!;
  return `${c.r},${c.g},${c.b}`;
}

const content = partyMenuContentData as {
  statusIcons: { palette: readonly Rgb[]; frames: Record<string, Tile> };
};
const heldItem = partyMenuHeldItemData as {
  palette: readonly Rgb[];
  frames: Record<string, Tile>;
};
type SlotCoords = {
  icon: readonly number[];
  heldItem: readonly number[];
  status: readonly number[];
  pokeball: readonly number[];
};
const spriteCoords = partyMenuSpriteCoordsData as {
  layouts: { single: readonly SlotCoords[] };
};

describe("partyMenuStatusItemIcons: ISSUES #80 rank 5 oracle-sampled ground truth", () => {
  const PRZ = content.statusIcons.frames.paralyzed;

  it("PRZ glyph palette is exactly indices 2/6/7 (white, 189,189,24, 206,206,132)", () => {
    const used = new Set<number>();
    for (const tile of PRZ.tiles) for (const v of tile) if (v !== 0) used.add(v);
    expect([...used].sort()).toEqual([2, 6, 7]);
    expect(paletteColor(content.statusIcons.palette, 2)).toBe("255,255,255");
    expect(paletteColor(content.statusIcons.palette, 6)).toBe("189,189,24");
    expect(paletteColor(content.statusIcons.palette, 7)).toBe("206,206,132");
  });

  it("status sprite is 32x8 and the PRZ glyph occupies x 6..25 of the 32-wide frame (doc §4.1)", () => {
    expect(PRZ.columns).toBe(4);
    expect(PRZ.rows).toBe(1);
    const glyphXs = new Set<number>();
    PRZ.tiles.forEach((tile, tileIdx) => {
      for (let i = 0; i < tile.length; i += 1) if (tile[i] !== 0) glyphXs.add(tileIdx * 8 + (i % 8));
    });
    expect(Math.min(...glyphXs)).toBe(6);
    expect(Math.max(...glyphXs)).toBe(25);
  });

  it("held-item glyph palette is exactly indices 4/5/6/7/15", () => {
    const item = heldItem.frames.item;
    const used = new Set<number>();
    for (const tile of item.tiles) for (const v of tile) if (v !== 0) used.add(v);
    expect([...used].sort((a, b) => a - b)).toEqual([4, 5, 6, 7, 15]);
    expect(paletteColor(heldItem.palette, 4)).toBe("255,247,156");
    expect(paletteColor(heldItem.palette, 5)).toBe("222,222,115");
    expect(paletteColor(heldItem.palette, 6)).toBe("247,82,41");
    expect(paletteColor(heldItem.palette, 7)).toBe("165,90,82");
    expect(paletteColor(heldItem.palette, 15)).toBe("99,99,99");
  });

  it("held-item sprite is 8x8 with the glyph at tile offsets 1..7 (doc §4.2)", () => {
    const item = heldItem.frames.item;
    expect(item.columns).toBe(1);
    expect(item.rows).toBe(1);
    const tile = item.tiles[0]!;
    let minX = 8, maxX = -1, minY = 8, maxY = -1;
    for (let i = 0; i < tile.length; i += 1) {
      if (tile[i] === 0) continue;
      const x = i % 8, y = Math.floor(i / 8);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    expect([minX, maxX]).toEqual([1, 7]);
    expect([minY, maxY]).toEqual([1, 7]);
  });

  it("single-layout sprite coords are centers (icon/hold/status), matching doc §4 centers", () => {
    const single = spriteCoords.layouts.single;
    // per-slot order: icon, heldItem, status, pokeball
    const slot0 = single[0]!;
    const slot1 = single[1]!;
    const slot2 = single[2]!;
    expect([slot0.icon[0], slot0.icon[1]]).toEqual([16, 40]); // icon center
    expect([slot0.heldItem[0], slot0.heldItem[1]]).toEqual([20, 50]); // held item center
    expect([slot0.status[0], slot0.status[1]]).toEqual([50, 52]); // status center
    expect([slot1.status[0], slot1.status[1]]).toEqual([136, 27]); // status center
    expect([slot2.status[0], slot2.status[1]]).toEqual([136, 51]); // status center
    expect([slot1.heldItem[0], slot1.heldItem[1]]).toEqual([108, 28]); // held item center
    expect([slot2.heldItem[0], slot2.heldItem[1]]).toEqual([108, 52]); // held item center
  });

  it("doc §4 measured bboxes are reachable from the centers + half-size blit", () => {
    // status 32x8 centered at (x,y): glyph x-range center-16+6 .. center-16+25,
    // y-range center-4 .. center+3 (all glyph rows are within the 8 rows).
    for (const [centerX, centerY, expected] of [
      [50, 52, [40, 59, 48, 55]],
      [136, 27, [126, 145, 23, 30]],
    ] as const) {
      expect([centerX - 16 + 6, centerX - 16 + 25, centerY - 4, centerY - 4 + 7]).toEqual(expected);
    }
    // held item 8x8 centered: glyph offsets 1..7 (gray shadow at 7)
    for (const [centerX, centerY, expected] of [
      [20, 50, [17, 23, 47, 53]],
      [108, 28, [105, 111, 25, 31]],
      [108, 52, [105, 111, 49, 55]],
    ] as const) {
      expect([centerX - 4 + 1, centerX - 4 + 7, centerY - 4 + 1, centerY - 4 + 7]).toEqual(expected);
    }
  });
});
