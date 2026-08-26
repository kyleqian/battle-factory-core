import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import warmRock from "../../src/animation/assets/eruption-warm-rock.json" with { type: "json" };
import { decodeIndexedPng } from "../../tools/extract/indexedPng.ts";
import { sliceTiles } from "../../tools/extract/tiles.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

function pack4bpp(tiles: readonly (readonly number[])[]): Buffer {
  const bytes = Buffer.alloc(tiles.length * 32);
  tiles.forEach((tile, tileIndex) => {
    expect(tile).toHaveLength(64);
    for (let pixel = 0; pixel < tile.length; pixel += 2) {
      bytes[tileIndex * 32 + pixel / 2] = tile[pixel]! | (tile[pixel + 1]! << 4);
    }
  });
  return bytes;
}

function packPalette(palette: readonly { readonly r: number; readonly g: number; readonly b: number }[]): Buffer {
  const bytes = Buffer.alloc(palette.length * 2);
  palette.forEach(({ r, g, b }, index) => bytes.writeUInt16LE((r >>> 3) | ((g >>> 3) << 5) | ((b >>> 3) << 10), index * 2));
  return bytes;
}

function cellIndices(
  tiles: readonly (readonly number[])[],
  tileOffset: number,
  widthTiles: number,
  heightTiles: number,
): number[] {
  const indices: number[] = [];
  for (let y = 0; y < heightTiles * 8; y += 1) {
    for (let x = 0; x < widthTiles * 8; x += 1) {
      const tile = tiles[tileOffset + Math.floor(y / 8) * widthTiles + Math.floor(x / 8)]!;
      indices.push(tile[(y % 8) * 8 + (x % 8)]!);
    }
  }
  return indices;
}

function rgba(indices: readonly number[], palette: readonly { readonly r: number; readonly g: number; readonly b: number }[]): number[][] {
  return indices.map((index) => index === 0 ? [0, 0, 0, 0] : [palette[index]!.r, palette[index]!.g, palette[index]!.b, 255]);
}

type EvidenceSprite = {
  readonly slot: number;
  readonly template: { readonly symbol: string };
  readonly attr: readonly number[];
};
type EvidenceRow = { readonly sprites: readonly EvidenceSprite[] };

function createdSprites(rows: readonly EvidenceRow[], template: string): EvidenceSprite[] {
  const starts: EvidenceSprite[] = [];
  rows.forEach((row, age) => {
    const previous = new Set((rows[age - 1]?.sprites ?? [])
      .map((sprite) => `${sprite.slot}:${sprite.template.symbol}`));
    row.sprites.forEach((sprite) => {
      if (sprite.template.symbol === template && !previous.has(`${sprite.slot}:${template}`)) starts.push(sprite);
    });
  });
  return starts;
}

function oamFacts(sprite: EvidenceSprite) {
  return {
    tile: sprite.attr[2]! & 0x3ff,
    palette: sprite.attr[2]! >>> 12,
    priority: (sprite.attr[2]! >>> 10) & 3,
    shape: (sprite.attr[0]! >>> 14) & 3,
    size: (sprite.attr[1]! >>> 14) & 3,
  };
}

describe("MOVE_ERUPTION ANIM_TAG_WARM_ROCK production asset", () => {
  it("pins the full source-owned 0x0a80-byte 4bpp sheet, its palette, and both source template layouts", () => {
    expect(warmRock.source).toEqual({
      art: "graphics/battle_anims/sprites/warm_rock.png",
      tag: { name: "ANIM_TAG_WARM_ROCK", value: 10201 },
      graphics: { symbol: "gBattleAnimSpriteGfx_WarmRock", format: ".4bpp.lz", bytes: 0x0a80 },
      palette: { symbol: "gBattleAnimSpritePal_WarmRock", format: ".gbapal.lz", entries: 16, bytes: 0x20 },
      registry: "src/data/battle_anim.h: gBattleAnimSpriteSheet / gBattleAnimSpritePalette",
    });
    expect(warmRock.hashes).toEqual({
      sourcePngSha256: "c44f8ed14d066fc531189ddf631389d6c8d528df5c25b812fb62be6b24060c3b",
      indexedSheetSha256: "56f6431ce8322874716676f760e08e2be606a4b4d60a0a08cfd3313ff8945169",
      gba4bppSha256: "e07569d2a7ff44f40e3a4f536c7226b4cd25818b8ceb047c549dbf1908ceec9c",
      gbaPaletteSha256: "9e48c2c50894ee3d9aeec122bf71b4e9fcdb1f7c594907953da376279bce7649",
    });
    expect(warmRock.dimensions).toEqual({ widthPixels: 32, heightPixels: 168, bitDepth: 4, bytes: 0x0a80 });
    expect(warmRock.tileset).toMatchObject({ columns: 4, rows: 21 });
    expect(warmRock.tileset.tiles).toHaveLength(84);
    expect(warmRock.palette).toHaveLength(16);
    expect(warmRock.templates.launch).toMatchObject({
      symbol: "gEruptionLaunchRockSpriteTemplate",
      callback: "AnimEruptionLaunchRock",
      oam: { shape: "16x16", size: "16x16", bpp: 4, affine: false, affineMode: "OFF", objMode: "NORMAL", priority: 2 },
      animation: { table: "gDummySpriteAnimTable", cellSelection: "j * 4 + 0x40; j cycles after 5", tileOffsets: [64, 68, 72, 76, 80] },
    });
    expect(warmRock.templates.falling).toMatchObject({
      symbol: "gEruptionFallingRockSpriteTemplate",
      callback: "AnimEruptionFallingRock",
      oam: { shape: "32x32", size: "32x32", bpp: 4, affine: false, affineMode: "OFF", objMode: "NORMAL", priority: 2 },
      animation: { table: "gDummySpriteAnimTable", cellSelection: "gBattleAnimArgs[4] * 16", tileOffsets: [0, 16, 32, 48], scriptFrameArgs: [0, 1, 2, 3, 0, 1] },
    });
    expect(warmRock.templates.launch.cells.map((cell) => [cell.tileOffset, cell.tileCount, cell.dimensions, cell.sheetTileOrigin, cell.sheetTileMemoryOrder])).toEqual([
      [64, 4, { widthPixels: 16, heightPixels: 16, widthTiles: 2, heightTiles: 2 }, { x: 0, y: 16 }, [{ x: 0, y: 16 }, { x: 1, y: 16 }, { x: 2, y: 16 }, { x: 3, y: 16 }]],
      [68, 4, { widthPixels: 16, heightPixels: 16, widthTiles: 2, heightTiles: 2 }, { x: 0, y: 17 }, [{ x: 0, y: 17 }, { x: 1, y: 17 }, { x: 2, y: 17 }, { x: 3, y: 17 }]],
      [72, 4, { widthPixels: 16, heightPixels: 16, widthTiles: 2, heightTiles: 2 }, { x: 0, y: 18 }, [{ x: 0, y: 18 }, { x: 1, y: 18 }, { x: 2, y: 18 }, { x: 3, y: 18 }]],
      [76, 4, { widthPixels: 16, heightPixels: 16, widthTiles: 2, heightTiles: 2 }, { x: 0, y: 19 }, [{ x: 0, y: 19 }, { x: 1, y: 19 }, { x: 2, y: 19 }, { x: 3, y: 19 }]],
      [80, 4, { widthPixels: 16, heightPixels: 16, widthTiles: 2, heightTiles: 2 }, { x: 0, y: 20 }, [{ x: 0, y: 20 }, { x: 1, y: 20 }, { x: 2, y: 20 }, { x: 3, y: 20 }]],
    ]);
    expect(warmRock.templates.falling.cells.map((cell) => [cell.tileOffset, cell.tileCount, cell.dimensions, cell.sheetTileOrigin, cell.sheetTileMemoryOrder])).toEqual([
      [0, 16, { widthPixels: 32, heightPixels: 32, widthTiles: 4, heightTiles: 4 }, { x: 0, y: 0 }, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }]],
      [16, 16, { widthPixels: 32, heightPixels: 32, widthTiles: 4, heightTiles: 4 }, { x: 0, y: 4 }, [{ x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 0, y: 7 }, { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }]],
      [32, 16, { widthPixels: 32, heightPixels: 32, widthTiles: 4, heightTiles: 4 }, { x: 0, y: 8 }, [{ x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 }, { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 }, { x: 0, y: 10 }, { x: 1, y: 10 }, { x: 2, y: 10 }, { x: 3, y: 10 }, { x: 0, y: 11 }, { x: 1, y: 11 }, { x: 2, y: 11 }, { x: 3, y: 11 }]],
      [48, 16, { widthPixels: 32, heightPixels: 32, widthTiles: 4, heightTiles: 4 }, { x: 0, y: 12 }, [{ x: 0, y: 12 }, { x: 1, y: 12 }, { x: 2, y: 12 }, { x: 3, y: 12 }, { x: 0, y: 13 }, { x: 1, y: 13 }, { x: 2, y: 13 }, { x: 3, y: 13 }, { x: 0, y: 14 }, { x: 1, y: 14 }, { x: 2, y: 14 }, { x: 3, y: 14 }, { x: 0, y: 15 }, { x: 1, y: 15 }, { x: 2, y: 15 }, { x: 3, y: 15 }]],
    ]);
  });

  it("matches the source indexed sheet and decoded RGBA cells, preserving the native 4bpp/palette bytes", () => {
    const image = decodeIndexedPng(join(root, "reference/pokeemerald/graphics/battle_anims/sprites/warm_rock.png"));
    const sourceTiles = sliceTiles(image).tiles.map((tile) => [...tile.pixels]);
    expect(sha256(image.indices)).toBe(warmRock.hashes.indexedSheetSha256);
    expect(sourceTiles).toEqual(warmRock.tileset.tiles);
    expect(image.palette).toEqual(warmRock.palette);
    expect(pack4bpp(warmRock.tileset.tiles)).toHaveLength(0x0a80);
    expect(sha256(pack4bpp(warmRock.tileset.tiles))).toBe(warmRock.hashes.gba4bppSha256);
    expect(sha256(packPalette(warmRock.palette))).toBe(warmRock.hashes.gbaPaletteSha256);

    for (const template of [warmRock.templates.launch, warmRock.templates.falling]) {
      for (const cell of template.cells) {
        const { tileOffset, dimensions } = cell;
        const assetIndices = cellIndices(warmRock.tileset.tiles, tileOffset, dimensions.widthTiles, dimensions.heightTiles);
        const sourceIndices = cellIndices(sourceTiles, tileOffset, dimensions.widthTiles, dimensions.heightTiles);
        expect(assetIndices).toEqual(sourceIndices);
        expect(rgba(assetIndices, warmRock.palette)).toEqual(rgba(sourceIndices, image.palette));
        expect(assetIndices.some((index) => index !== 0)).toBe(true);
      }
    }
  });

  it("regenerates byte-for-byte into a fresh isolated directory", () => {
    const scratch = createScratchDir("pokebench-eruption-warm-rock-");
    const output = join(scratch, "eruption-warm-rock.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractEruptionWarmRockAssets.ts",
      "--out",
      output,
    ], { cwd: root, stdio: "pipe" });
    expect(readFileSync(output)).toEqual(readFileSync(join(root, "src/animation/assets/eruption-warm-rock.json")));
  });

  it.each([
    ["player", 61, 143, 215],
    ["opponent", 61, 152, 233],
  ] as const)("matches retained %s-side launch/falling OAM cells and palette use", (side, firstLaunchAge, secondLaunchAge, fallingAge) => {
    const rows = JSON.parse(gunzipSync(readFileSync(join(root, `tools/compare/evidence/eruption-${side}-dense-state.json.gz`))).toString("utf8")).frames as EvidenceRow[];
    const launch = createdSprites(rows, "gEruptionLaunchRockSpriteTemplate");
    const falling = createdSprites(rows, "gEruptionFallingRockSpriteTemplate");
    const baseTile = oamFacts(falling[0]!).tile;
    const launchWave = warmRock.templates.launch.animation.tileOffsets.map((offset, index) => index < 2 ? offset : offset);
    const expectedLaunchOffsets = [
      ...launchWave, launchWave[0]!, launchWave[1]!,
      ...launchWave, launchWave[0]!, launchWave[1]!,
    ];
    const expectedFallingOffsets = warmRock.templates.falling.animation.scriptFrameArgs
      .map((frame) => warmRock.templates.falling.animation.tileOffsets[frame]!);
    expect(launch).toHaveLength(14);
    expect(falling).toHaveLength(6);
    expect(launch.map((sprite) => oamFacts(sprite).tile - baseTile)).toEqual(expectedLaunchOffsets);
    expect(falling.map((sprite) => oamFacts(sprite).tile - baseTile)).toEqual(expectedFallingOffsets);
    expect(launch.slice(0, 7).every((sprite) => oamFacts(sprite).shape === 0 && oamFacts(sprite).size === 1)).toBe(true);
    expect(falling.every((sprite) => oamFacts(sprite).shape === 0 && oamFacts(sprite).size === 2)).toBe(true);
    expect([...new Set([...launch, ...falling].map((sprite) => oamFacts(sprite).palette))]).toEqual([7]);
    expect([...new Set([...launch, ...falling].map((sprite) => oamFacts(sprite).priority))]).toEqual([2]);

    const launchAges = rows.flatMap((row, age) => row.sprites.some((sprite) => sprite.template.symbol === "gEruptionLaunchRockSpriteTemplate")
      && !(rows[age - 1]?.sprites.some((sprite) => sprite.template.symbol === "gEruptionLaunchRockSpriteTemplate")) ? [age] : []);
    const fallingAges = rows.flatMap((row, age) => row.sprites.some((sprite) => sprite.template.symbol === "gEruptionFallingRockSpriteTemplate")
      && !(rows[age - 1]?.sprites.some((sprite) => sprite.template.symbol === "gEruptionFallingRockSpriteTemplate")) ? [age] : []);
    expect(launchAges).toEqual([firstLaunchAge, secondLaunchAge]);
    expect(fallingAges).toEqual([fallingAge]);
  });
});
