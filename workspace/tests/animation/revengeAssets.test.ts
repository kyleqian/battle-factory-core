import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../tools/compare/evidence/revenge-assets.json" with { type: "json" };

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const committedPath = resolve(root, "tools/compare/evidence/revenge-assets.json");
const extractor = resolve(root, "tools/compare/extractRevengeAssets.ts");
const runExtractor = (output: string): void => {
  execFileSync(process.execPath, ["--experimental-strip-types", extractor, "--out", output], { cwd: root, stdio: "pipe" });
};

describe("MOVE_REVENGE PURPLE_SCRATCH/PURPLE_SWIPE source asset checkpoint", () => {
  it("pins source, ELF/ROM, shared palette, geometry, frames, templates, and callback", () => {
    expect(asset).toMatchObject({
      schema: "revenge-purple-scratch-swipe-source-assets/v1",
      source: {
        move: { path: "data/battle_anim_scripts.s", start: 337524, endExclusive: 338729, byteLength: 1205, sha256: "98915dfd07997768fc16a482f0ead7e25f2854d3794dc3ff77c52755997ea331" },
        templates: {
          small: { path: "src/battle_anim_fight.c", byteLength: 347, sha256: "74b5ebb980399444e3a232512eacef1d27b407f98b17100b76e39c075357c55a" },
          big: { path: "src/battle_anim_fight.c", byteLength: 339, sha256: "ac05bee3ed576985f993dc8e845e05cce047516d1ea4bfad2720974e467e6c91" },
        },
        callbacks: { scratch: { path: "src/battle_anim_fight.c", byteLength: 512, sha256: "f570cd9d4a7e2191fc513cde07ed4918d7cbf2fcb9f5dea627ba7fc014052acc" } },
        rom: { symbols: {
          move: { start: "0x082d5731", endExclusive: "0x082d57c8", byteLength: 151 },
          templates: { small: { start: "0x08596088", byteLength: 24 }, big: { start: "0x085960d0", byteLength: 24 } },
          callbacks: { scratch: { start: "0x0810da10", byteLength: 108 } },
          graphics: { scratch: { start: "0x08c2df08", byteLength: 420 }, swipe: { start: "0x08c2e0ac", byteLength: 1192 } },
          palette: { start: "0x08c2dee0", byteLength: 40 },
        } },
      },
      templates: {
        small: { tileTag: "ANIM_TAG_PURPLE_SCRATCH", paletteTag: "ANIM_TAG_PURPLE_SCRATCH", oam: { shape: "32x32", affineMode: "off", objMode: "normal" }, animations: "sAnims_RevengeSmallScratch", callback: "AnimRevengeScratch" },
        big: { tileTag: "ANIM_TAG_PURPLE_SWIPE", paletteTag: "ANIM_TAG_PURPLE_SWIPE", oam: { shape: "64x64", affineMode: "off", objMode: "normal" }, animations: "sAnims_RevengeBigScratch", callback: "AnimRevengeScratch" },
      },
      controls: { move: "MOVE_REVENGE", status: "unsupported-source-asset-checkpoint", coverageCredit: false, componentTrackFulfilled: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, siblingOrSharedCredit: false },
    });
  });

  it("pins both PNGs, decoded 4bpp/palette bytes, LZ77 sizes, and frame programs", () => {
    const scratch = asset.resources.purpleScratch as Json;
    const swipe = asset.resources.purpleSwipe as Json;
    expect(scratch).toMatchObject({
      tag: "ANIM_TAG_PURPLE_SCRATCH", tagValue: 10245, tileBytes: 0x600, graphicsSymbol: "gBattleAnimSpriteGfx_PurpleScratch", paletteSymbol: "gBattleAnimSpritePal_PurpleScratch",
      source: { imagePng: { sha256: "2d113dc4d35207114f14521c39255bbaa60a9535894fa098849bc2b1986bef8b" }, palettePng: { sameFileAsImage: true, imagePaletteMatchesAssignedPalette: true } },
      compression: { graphics: { streamByteLength: 418, alignmentPaddingByteLength: 2, decompressedByteLength: 0x600, decodedMatchesIndexedSource: true }, palette: { streamByteLength: 38, alignmentPaddingByteLength: 2, decompressedByteLength: 32, decodedMatchesIndexedSource: true } },
      layout: { png: { width: 32, height: 96, bitDepth: 4, paletteEntries: 16 }, tiles: { columns: 4, rows: 12, count: 48, bytesPerTile: 32 }, frames: [
        { index: 0, tileOffset: 0, tileCount: 16, sourcePixels: { width: 32, height: 32 } },
        { index: 1, tileOffset: 16, tileCount: 16, sourcePixels: { width: 32, height: 32 } },
        { index: 2, tileOffset: 32, tileCount: 16, sourcePixels: { width: 32, height: 32 } },
      ] },
    });
    expect(swipe).toMatchObject({
      tag: "ANIM_TAG_PURPLE_SWIPE", tagValue: 10246, tileBytes: 0x1000, graphicsSymbol: "gBattleAnimSpriteGfx_PurpleSwipe", paletteSymbol: "gBattleAnimSpritePal_PurpleScratch",
      source: { imagePng: { sha256: "9ac8c5976069f582ec914fbdfeec5e4d4d0f8b51c2f660d1ae7230aa8065657c" }, palettePng: { path: "graphics/battle_anims/sprites/purple_scratch.png", sameFileAsImage: false, imagePaletteMatchesAssignedPalette: true } },
      compression: { graphics: { streamByteLength: 1191, alignmentPaddingByteLength: 1, decompressedByteLength: 0x1000, decodedMatchesIndexedSource: true }, palette: { streamByteLength: 38, alignmentPaddingByteLength: 2, decompressedByteLength: 32, decodedMatchesIndexedSource: true } },
      layout: { png: { width: 64, height: 128, bitDepth: 4, paletteEntries: 16 }, tiles: { columns: 8, rows: 16, count: 128, bytesPerTile: 32 }, frames: [{ index: 0, tileOffset: 0, tileCount: 64, sourcePixels: { width: 64, height: 64 } }, { index: 1, tileOffset: 64, tileCount: 64, sourcePixels: { width: 64, height: 64 } }] },
    });
    expect(scratch.source.registry.palette).toBe(swipe.source.registry.palette.replace("ANIM_TAG_PURPLE_SWIPE", "ANIM_TAG_PURPLE_SCRATCH"));
    expect(scratch.layout.animations).toEqual([
      { index: 0, frames: [{ tileOffset: 0, duration: 4, hFlip: false, vFlip: false }, { tileOffset: 16, duration: 4, hFlip: false, vFlip: false }, { tileOffset: 32, duration: 4, hFlip: false, vFlip: false }] },
      { index: 1, frames: [{ tileOffset: 0, duration: 4, hFlip: false, vFlip: true }, { tileOffset: 16, duration: 4, hFlip: false, vFlip: true }, { tileOffset: 32, duration: 4, hFlip: false, vFlip: true }] },
      { index: 2, frames: [{ tileOffset: 0, duration: 4, hFlip: true, vFlip: false }, { tileOffset: 16, duration: 4, hFlip: true, vFlip: false }, { tileOffset: 32, duration: 4, hFlip: true, vFlip: false }] },
    ]);
    expect(swipe.layout.animations).toEqual([
      { index: 0, frames: [{ tileOffset: 0, duration: 6, hFlip: false, vFlip: false }, { tileOffset: 64, duration: 6, hFlip: false, vFlip: false }] },
      { index: 1, frames: [{ tileOffset: 0, duration: 6, hFlip: true, vFlip: true }, { tileOffset: 64, duration: 6, hFlip: true, vFlip: true }] },
      { index: 2, frames: [{ tileOffset: 0, duration: 6, hFlip: true, vFlip: false }, { tileOffset: 64, duration: 6, hFlip: true, vFlip: false }] },
    ]);
    expect(scratch.art.tiles).toHaveLength(48);
    expect(swipe.art.tiles).toHaveLength(128);
    expect(scratch.art.palette).toEqual(swipe.art.palette);
    expect(scratch.compression.graphics.indexedSourceSha256).toBe(scratch.compression.graphics.decompressedSha256);
    expect(swipe.compression.graphics.indexedSourceSha256).toBe(swipe.compression.graphics.decompressedSha256);
  });

  it("regenerates byte-for-byte twice from the pinned source checkout", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-revenge-assets-"));
    const first = join(scratch, "first.json");
    const second = join(scratch, "second.json");
    runExtractor(first);
    runExtractor(second);
    expect(readFileSync(first, "utf8")).toBe(readFileSync(committedPath, "utf8"));
    expect(readFileSync(second, "utf8")).toBe(readFileSync(first, "utf8"));
  });
});
