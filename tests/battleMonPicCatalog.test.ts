import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import backSpritesData from "../src/assets/gen/battle-back-sprites.json" with { type: "json" };
import frontSpritesData from "../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import monPicCoordsData from "../src/data/gen/mon-pic-coords.json" with { type: "json" };

type FrontierMon = { index: number; species: string };
type Tileset = { columns: number; rows: number; tiles: number[][] };
type Sprite = { tileset: Tileset; palette: Array<{ r: number; g: number; b: number }>; frame2?: Tileset };
type Coords = { width: number; height: number; yOffset: number };

const mons = frontierMonsData.entries as FrontierMon[];
const backSprites = backSpritesData as Record<string, Sprite>;
const frontSprites = frontSpritesData as Record<string, Sprite>;
const coords = monPicCoordsData as { back: Record<string, Coords>; front: Record<string, Coords> };
const oneFrameSpecies = new Set(["CASTFORM", "DEOXYS", "SPINDA", "UNOWN"]);

function assert64x64Tileset(tileset: Tileset, label: string): void {
  expect(tileset.columns, `${label} tile columns`).toBe(8);
  expect(tileset.rows, `${label} tile rows`).toBe(8);
  expect(tileset.tiles, `${label} tile count`).toHaveLength(64);
  for (const [tileIndex, tile] of tileset.tiles.entries()) {
    if (tile.length !== 64) throw new Error(`${label} tile ${tileIndex}: expected 64 pixels, got ${tile.length}`);
    for (const pixel of tile) {
      if (!Number.isInteger(pixel) || pixel < 0 || pixel >= 16) throw new Error(`${label}: invalid 4bpp palette index ${pixel}`);
    }
  }
}

describe("Battle Factory battle-mon pic catalog", () => {
  it("covers every distinct Factory species on both battlefield sides, including the Open-only tail", () => {
    expect(mons).toHaveLength(882);
    const level50Species = new Set(mons.filter(({ index }) => index <= 849).map(({ species }) => species.replace(/^SPECIES_/, "")));
    const allSpecies = new Set(mons.map(({ species }) => species.replace(/^SPECIES_/, "")));
    expect(level50Species.size).toBe(374);
    expect(allSpecies.size).toBe(376);
    expect(Object.keys(backSprites)).toHaveLength(376);
    expect(Object.keys(frontSprites)).toHaveLength(376);

    for (const species of allSpecies) {
      const back = backSprites[species];
      const front = frontSprites[species];
      expect(back, `back pic missing for ${species}`).toBeDefined();
      expect(front, `front pic missing for ${species}`).toBeDefined();
      assert64x64Tileset(back!.tileset, `${species} back`);
      assert64x64Tileset(front!.tileset, `${species} front`);
      expect(back!.palette, `${species} back palette length`).toHaveLength(16);
      expect(front!.palette, `${species} front palette length`).toHaveLength(16);
      for (const color of [...back!.palette, ...front!.palette]) {
        if (![color.r, color.g, color.b].every(Number.isInteger)) throw new Error(`${species}: non-integer palette channel`);
      }

      expect(coords.back[species], `back coords missing for ${species}`).toBeDefined();
      expect(coords.front[species], `front coords missing for ${species}`).toBeDefined();
      for (const [side, entry] of [["back", coords.back[species]], ["front", coords.front[species]]] as const) {
        expect(entry!.width, `${species} ${side} coord width`).toBeGreaterThan(0);
        expect(entry!.width % 8, `${species} ${side} coord width tile alignment`).toBe(0);
        expect(entry!.height, `${species} ${side} coord height`).toBeGreaterThan(0);
        expect(entry!.height % 8, `${species} ${side} coord height tile alignment`).toBe(0);
        expect(entry!.width, `${species} ${side} coord width <= source canvas`).toBeLessThanOrEqual(64);
        expect(entry!.height, `${species} ${side} coord height <= source canvas`).toBeLessThanOrEqual(64);
        expect(entry!.yOffset, `${species} ${side} coord y offset`).toEqual(expect.any(Number));
      }

      expect(front!.frame2, `${species} front animation frame 2 missing`).toBeDefined();
      assert64x64Tileset(front!.frame2!, `${species} front frame 2`);
      if (oneFrameSpecies.has(species)) {
        expect(front!.frame2, `${species} must retain the source frame-0 slot because HasTwoFramesAnimation never selects frame 2`).toEqual(front!.tileset);
      }
    }
  });

  it("regenerates the complete front, back, and coordinate catalogs byte-for-byte", () => {
    const first = mkdtempSync(join(tmpdir(), "pokeemerald-factory-mon-pics-"));
    const second = mkdtempSync(join(tmpdir(), "pokeemerald-factory-mon-pics-"));
    for (const outputDirectory of [first, second]) {
      execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-battle-mon-pics.ts", "--out-dir", outputDirectory], { stdio: "pipe" });
    }
    for (const relativePath of [
      "src/assets/gen/battle-back-sprites.json",
      "src/assets/gen/battle-opponent-front-sprites.json",
      "src/data/gen/mon-pic-coords.json",
    ]) {
      expect(readFileSync(join(first, relativePath), "utf8"), `first regeneration ${relativePath}`).toBe(
        readFileSync(join(second, relativePath), "utf8"),
      );
      expect(readFileSync(join(first, relativePath), "utf8"), `committed catalog ${relativePath}`).toBe(
        readFileSync(relativePath, "utf8"),
      );
    }
  });
});
