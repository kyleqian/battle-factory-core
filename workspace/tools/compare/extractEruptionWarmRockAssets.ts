/**
 * Reproducible source extraction for MOVE_ERUPTION's shared Warm Rock sheet.
 *
 * This is deliberately an asset-only checkpoint: it records the complete
 * ANIM_TAG_WARM_ROCK sheet, palette, and the two source template cell layouts
 * without adding a move reducer, scene seam, or renderer case.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outFlag = process.argv.indexOf("--out");
const output = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "src/animation/assets/eruption-warm-rock.json");

const WARM_ROCK_TAG = 10_201;
const SHEET_BYTES = 0x0a80;
const PALETTE_BYTES = 0x20;
const SOURCE_PNG_SHA256 = "c44f8ed14d066fc531189ddf631389d6c8d528df5c25b812fb62be6b24060c3b";
const INDEXED_SHEET_SHA256 = "56f6431ce8322874716676f760e08e2be606a4b4d60a0a08cfd3313ff8945169";
const GBA_4BPP_SHA256 = "e07569d2a7ff44f40e3a4f536c7226b4cd25818b8ceb047c549dbf1908ceec9c";
const GBA_PALETTE_SHA256 = "9e48c2c50894ee3d9aeec122bf71b4e9fcdb1f7c594907953da376279bce7649";

const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const read = (relative: string): string => readFileSync(join(root, relative), "utf8");

function requireSource(source: string, expected: string, owner: string): void {
  if (!source.includes(expected)) throw new Error(`${owner} source contract changed: ${expected}`);
}

function requireTemplate(
  source: string,
  symbol: string,
  oam: "16x16" | "32x32",
  callback: "AnimEruptionLaunchRock" | "AnimEruptionFallingRock",
): void {
  const start = source.indexOf(`const struct SpriteTemplate ${symbol} =`);
  const end = start < 0 ? -1 : source.indexOf("\n};", start);
  const block = start < 0 || end < 0 ? "" : source.slice(start, end + 3);
  for (const expected of [
    `.tileTag = ANIM_TAG_WARM_ROCK,`,
    `.paletteTag = ANIM_TAG_WARM_ROCK,`,
    `.oam = &gOamData_AffineOff_ObjNormal_${oam},`,
    `.anims = gDummySpriteAnimTable,`,
    `.images = NULL,`,
    `.affineAnims = gDummySpriteAffineAnimTable,`,
    `.callback = ${callback},`,
  ]) requireSource(block, expected, symbol);
}

function gba4bppBytes(tiles: readonly { readonly pixels: Uint8Array }[]): Buffer {
  const bytes = Buffer.alloc(tiles.length * 32);
  tiles.forEach((tile, tileIndex) => {
    if (tile.pixels.length !== 64) throw new Error(`Warm Rock tile ${tileIndex} is not 8x8`);
    for (let pixel = 0; pixel < tile.pixels.length; pixel += 2) {
      const lo = tile.pixels[pixel]!;
      const hi = tile.pixels[pixel + 1]!;
      if (lo > 15 || hi > 15) throw new Error(`Warm Rock tile ${tileIndex} is not 4bpp`);
      bytes[tileIndex * 32 + pixel / 2] = lo | (hi << 4);
    }
  });
  return bytes;
}

function gbaPaletteBytes(palette: readonly { readonly r: number; readonly g: number; readonly b: number }[]): Buffer {
  const bytes = Buffer.alloc(palette.length * 2);
  palette.forEach(({ r, g, b }, index) => {
    bytes.writeUInt16LE((r >>> 3) | ((g >>> 3) << 5) | ((b >>> 3) << 10), index * 2);
  });
  return bytes;
}

function cells(
  columns: number,
  tileOffsets: readonly number[],
  widthTiles: number,
  heightTiles: number,
) {
  return tileOffsets.map((tileOffset, index) => ({
    index,
    tileOffset,
    tileCount: widthTiles * heightTiles,
    dimensions: { widthPixels: widthTiles * 8, heightPixels: heightTiles * 8, widthTiles, heightTiles },
    sheetTileOrigin: { x: tileOffset % columns, y: Math.floor(tileOffset / columns) },
    sheetTileMemoryOrder: Array.from({ length: widthTiles * heightTiles }, (_, tileIndex) => ({
      x: (tileOffset + tileIndex) % columns,
      y: Math.floor((tileOffset + tileIndex) / columns),
    })),
  }));
}

const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const animationData = read("reference/pokeemerald/src/data/battle_anim.h");
const fire = read("reference/pokeemerald/src/battle_anim_fire.c");

requireTemplate(fire, "gEruptionLaunchRockSpriteTemplate", "16x16", "AnimEruptionLaunchRock");
requireTemplate(fire, "gEruptionFallingRockSpriteTemplate", "32x32", "AnimEruptionFallingRock");

for (const [source, expected, owner] of [
  [constants, "#define ANIM_SPRITES_START 10000", "battle animation constants"],
  [constants, "#define ANIM_TAG_WARM_ROCK                  (ANIM_SPRITES_START + 201)", "Warm Rock tag"],
  [graphics, 'gBattleAnimSpriteGfx_WarmRock[] = INCGFX_U32("graphics/battle_anims/sprites/warm_rock.png", ".4bpp.lz")', "Warm Rock graphics"],
  [graphics, 'gBattleAnimSpritePal_WarmRock[] = INCGFX_U32("graphics/battle_anims/sprites/warm_rock.png", ".gbapal.lz")', "Warm Rock palette"],
  [animationData, "{gBattleAnimSpriteGfx_WarmRock, 0x0a80, ANIM_TAG_WARM_ROCK}", "Warm Rock sheet registry"],
  [animationData, "{gBattleAnimSpritePal_WarmRock, ANIM_TAG_WARM_ROCK}", "Warm Rock palette registry"],
  [fire, "gSprites[spriteId].oam.tileNum += j * 4 + 0x40;", "Eruption launch cell selection"],
  [fire, "sprite->oam.tileNum += gBattleAnimArgs[4] * 16;", "Eruption falling cell selection"],
] as const) requireSource(source, expected, owner);

const sourcePath = join(root, "reference/pokeemerald/graphics/battle_anims/sprites/warm_rock.png");
const sourcePng = readFileSync(sourcePath);
if (sha256(sourcePng) !== SOURCE_PNG_SHA256) throw new Error("warm_rock.png source PNG changed");

const image = decodeIndexedPng(sourcePath);
const sliced = sliceTiles(image);
if (image.width !== 32 || image.height !== 168 || image.bitDepth !== 4
  || image.palette.length !== 16 || sliced.columns !== 4 || sliced.rows !== 21
  || sliced.tiles.length !== SHEET_BYTES / 32 || sliced.tiles.some((tile) => tile.subpalette !== 0)) {
  throw new Error("Warm Rock indexed 4bpp sheet geometry changed");
}

const packedSheet = gba4bppBytes(sliced.tiles);
const packedPalette = gbaPaletteBytes(image.palette);
if (packedSheet.length !== SHEET_BYTES || packedPalette.length !== PALETTE_BYTES
  || sha256(image.indices) !== INDEXED_SHEET_SHA256
  || sha256(packedSheet) !== GBA_4BPP_SHA256
  || sha256(packedPalette) !== GBA_PALETTE_SHA256) {
  throw new Error("Warm Rock packed source data changed");
}

const launchCellOffsets = [64, 68, 72, 76, 80] as const;
const fallingCellOffsets = [0, 16, 32, 48] as const;
const asset = {
  source: {
    art: "graphics/battle_anims/sprites/warm_rock.png",
    tag: { name: "ANIM_TAG_WARM_ROCK", value: WARM_ROCK_TAG },
    graphics: { symbol: "gBattleAnimSpriteGfx_WarmRock", format: ".4bpp.lz", bytes: SHEET_BYTES },
    palette: { symbol: "gBattleAnimSpritePal_WarmRock", format: ".gbapal.lz", entries: 16, bytes: PALETTE_BYTES },
    registry: "src/data/battle_anim.h: gBattleAnimSpriteSheet / gBattleAnimSpritePalette",
  },
  hashes: {
    sourcePngSha256: SOURCE_PNG_SHA256,
    indexedSheetSha256: INDEXED_SHEET_SHA256,
    gba4bppSha256: GBA_4BPP_SHA256,
    gbaPaletteSha256: GBA_PALETTE_SHA256,
  },
  dimensions: { widthPixels: image.width, heightPixels: image.height, bitDepth: image.bitDepth, bytes: SHEET_BYTES },
  tileset: { columns: sliced.columns, rows: sliced.rows, tiles: sliced.tiles.map((tile) => [...tile.pixels]) },
  palette: image.palette,
  templates: {
    launch: {
      symbol: "gEruptionLaunchRockSpriteTemplate",
      callback: "AnimEruptionLaunchRock",
      oam: { shape: "16x16", size: "16x16", bpp: 4, affine: false, affineMode: "OFF", objMode: "NORMAL", priority: 2 },
      animation: { table: "gDummySpriteAnimTable", cellSelection: "j * 4 + 0x40; j cycles after 5", tileOffsets: launchCellOffsets },
      cells: cells(sliced.columns, launchCellOffsets, 2, 2),
    },
    falling: {
      symbol: "gEruptionFallingRockSpriteTemplate",
      callback: "AnimEruptionFallingRock",
      oam: { shape: "32x32", size: "32x32", bpp: 4, affine: false, affineMode: "OFF", objMode: "NORMAL", priority: 2 },
      animation: { table: "gDummySpriteAnimTable", cellSelection: "gBattleAnimArgs[4] * 16", tileOffsets: fallingCellOffsets, scriptFrameArgs: [0, 1, 2, 3, 0, 1] },
      cells: cells(sliced.columns, fallingCellOffsets, 4, 4),
    },
  },
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(asset)}\n`);
console.log(`wrote ${output}`);
