// spd1 (frame catcher 2026-11-20, docs/fcp1-frame-catcher-pictures.md): the opponent SPINDA's spots. Kyle's battle 4 drew the foe's
// SPINDA (personality 1313747607) with no spots for the whole battle; the ROM draws the spots of its personality (DrawSpindaSpots,
// pokemon.c:5808-5812, from LoadSpecialPokePic for every front picture). ROM: an oracle mechanic lab (Scene OFF) with an opponent lead
// SPINDA of each personality below, frame 300 of the battle; ROM_SPOTS is, per row of the 64x64 picture, the pixels whose colour is
// palette[c + 4] where the plain picture has colour c in 1..3 (measured from the ROM frame alone: every other opaque pixel matched the
// plain picture exactly, offset 0, 0).
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt";
import { backPixels, frontPixels } from "../src/engine/monPicPixels";
import { spindaSpottedTileset } from "../src/engine/spindaSpots";

const SPECIES_SPINDA = 308;
const SPECIES_URSARING = 217;

const ROM_SPOTS: Readonly<Record<number, Readonly<Record<number, bigint>>>> = {
  1313747607: { 8: 0x300000n, 9: 0x600000fc0000n, 10: 0x780001fc0000n, 11: 0x3c00031e0000n, 12: 0xc0002ee0000n, 13: 0x160005f60000n, 14: 0x1a0005b60000n, 15: 0x20005a40000n, 16: 0x26c0000n, 17: 0x3d80000n, 18: 0x1300000n, 19: 0x600000n, 21: 0x1c0000000n, 22: 0x2403e0000000n, 23: 0x7807f0000000n, 24: 0x3f07f0000000n, 25: 0x1f07f0000000n, 26: 0x3f07f0000000n, 27: 0x3e07e0000000n, 28: 0x7d03e0000000n, 29: 0x7c01c0000000n, 30: 0x3c0000000000n },
  0: { 11: 0x40000000000n, 18: 0x10000000n, 19: 0x1d8000000n, 20: 0x3f0000000n, 21: 0x3fc000000n, 22: 0x3fc000000n, 23: 0x3fc000000n, 24: 0x3fc000000n, 25: 0x1f8000000n, 26: 0xf0000000n },
  4294967295: { 14: 0x8000000n, 15: 0xc000000n, 16: 0x400000e000000n, 17: 0x600001f000000n, 18: 0x300001f000000n, 19: 0x30007dc000000n, 20: 0x18007f1800000n, 21: 0x18007ff000000n, 22: 0x8003ff000000n, 23: 0x3ff000000n, 24: 0x1fe000000n, 25: 0xf0000000n, 32: 0x380000000n, 33: 0x380780000000n, 34: 0x3c0fe0000000n, 35: 0x1e0000000000n, 36: 0xe0800000000n, 37: 0x60c20000000n, 38: 0xfe0000000n, 39: 0x7c0000000n, 40: 0x80000000n },
  305419896: { 8: 0x700000n, 9: 0x1e00001fc0000n, 10: 0x3f80003fc0000n, 11: 0x7fc00031e0000n, 12: 0x78c0006ee0000n, 13: 0x3760005f60000n, 14: 0x2fa0005b60000n, 15: 0xba0005a40000n, 16: 0xba00026c0000n, 17: 0x100001c00000n, 19: 0x3c0000000n, 20: 0x7e0000000n, 21: 0xff0000000n, 22: 0xff1000000n, 23: 0xff1800000n, 24: 0xff1c00000n, 25: 0xff0c00000n, 26: 0x7e1400000n, 27: 0x3c0a00000n, 28: 0x200000n },
};

type Tiles = Readonly<{ columns: number; tiles: readonly (readonly number[])[] }>;
const index = (t: Tiles, x: number, y: number): number => t.tiles[(y >> 3) * t.columns + (x >> 3)]![(y & 7) * 8 + (x & 7)]!;

/** Per row of the first 64x64 frame, the pixels that differ from the plain SPINDA picture. */
function changedRows(tileset: Tiles): Record<number, bigint> {
  const plain = frontPixels("SPINDA")!.tileset as Tiles;
  const rows: Record<number, bigint> = {};
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      if (index(tileset, x, y) !== index(plain, x, y)) rows[y] = (rows[y] ?? 0n) | (1n << BigInt(x));
    }
  }
  return rows;
}

const field = (player: number, opponent: number, personality?: number) => ({
  player: { species: player, personality: 0 },
  opponent: { species: opponent, ...(personality === undefined ? {} : { personality }) },
}) as never;

describe("spd1: an opponent SPINDA is drawn with its personality's spots, as on the ROM", () => {
  for (const personality of Object.keys(ROM_SPOTS).map(Number)) {
    it(`personality ${personality}: the field picture's spot pixels are the ROM's`, () => {
      const art = createBattleCommandFieldArtView(field(SPECIES_URSARING, SPECIES_SPINDA, personality));
      expect(changedRows(art.opponent.pic.tileset as Tiles)).toEqual(ROM_SPOTS[personality]);
      // Every spot pixel moved from colour 1..3 to 5..7 (TRY_DRAW_SPOT_PIXEL), and re-drawing the spots changes nothing.
      const plain = frontPixels("SPINDA")!.tileset as Tiles;
      for (const [y, mask] of Object.entries(ROM_SPOTS[personality]!)) {
        for (let x = 0; x < 64; x += 1) {
          if (((mask >> BigInt(x)) & 1n) === 0n) continue;
          expect(index(art.opponent.pic.tileset as Tiles, x, Number(y))).toBe(index(plain, x, Number(y)) + 4);
        }
      }
      expect(changedRows(spindaSpottedTileset(art.opponent.pic.tileset as Tiles & { rows: number }, personality))).toEqual(ROM_SPOTS[personality]);
    });
  }

  it("the player's SPINDA (back picture) has no spots, and the picture of another species is untouched", () => {
    const art = createBattleCommandFieldArtView(field(SPECIES_SPINDA, SPECIES_URSARING, 1313747607));
    expect(art.player.pic.tileset).toBe(backPixels("SPINDA")!.tileset);
    expect(art.opponent.pic.tileset).toBe(frontPixels("URSARING")!.tileset);
  });
});
