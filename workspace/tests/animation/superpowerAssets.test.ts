import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/superpower-rock-orb-fire.json" with { type: "json" };

const root = resolve(import.meta.dirname, "../..");
const sha256 = (path: string): string => createHash("sha256")
  .update(readFileSync(resolve(root, path))).digest("hex");

describe("MOVE_SUPERPOWER source-derived rock/orb/fire production assets", () => {
  it("pins source declarations, PNG layout, LZ77 decoding, ELF bounds, and templates", () => {
    expect(sha256("src/animation/assets/superpower-rock-orb-fire.json"))
      .toBe("7ad1420cc096a0ea3230d021b37249f44f0cda53c24e06a445a2ff5826358f67");
    expect(asset).toMatchObject({
      schema: "superpower-rock-orb-fire-source-assets/v1",
      source: {
        move: {
          path: "data/battle_anim_scripts.s", start: 141024, endExclusive: 142286,
          byteLength: 1262,
          sha256: "337f67ee5ee312071360ad23562eac50c601e2dc94f3a3da53ba49eba8c0b0a3",
        },
        templates: {
          orb: { sha256: "f82c5d127e3d5dc70e31dfa153e128965d62a69c34b54b2c3838a29ed5469d73" },
          rock: { sha256: "25021e863e5d6953856a4683f3160f9ad8e3fea4e8fb488ab4eec94ff3c59584" },
          fireball: { sha256: "59923b266c73ca05971dae34c5c2c5f52dfd171be6556f8259e5456f1648c3af" },
        },
        callbacks: {
          orb: { sha256: "bbbbe350eab3fccebeddb07822bb628dc5fa029e331332d3ca622206ebaba1db" },
          orbStep: { sha256: "d3cc4f2e03ee49edb6ea6f290339d68eaa7ede6429ae5a6c962004b5ff50e11c" },
          rock: { sha256: "c17bd6ba1f902ee0a512825586528d7ecc393da3f550fdcb741f1c1a4ac97c61" },
          rockStep1: { sha256: "bc1eb05548dd941cd1257c15a0de2f904e520b26f072d9baf8481420d2a00586" },
          rockStep2: { sha256: "e00650c64bdc623c6ea021b72ab241e391b402f0f613e74ebe344d5b97a9f10c" },
          fireball: { sha256: "4c5492294872774a2bd6efe2cb36cc1aea364567d2a0e0bf971bd6bfc535ab66" },
        },
        affine: {
          program: { sha256: "fd7ac431b0d196535f9416bb43c610ac074416f0ffd98a95c71ec79a4bbbc47b" },
          table: { sha256: "c974109788b00485359178d4cf12d5e052b70c46956b7bb03bf4a5c8c7eac905" },
        },
        rom: {
          gameCode: "AGB-BPEE",
          imageSha256: "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af",
          symbols: {
            move: {
              symbol: "Move_SUPERPOWER", start: "0x082cdfa3", endExclusive: "0x082ce05e",
              byteLength: 187,
              sha256: "d22cced71a15c78e68e6b5868123ac32e84ff43fbbd1e960a421164dda845f62",
            },
            templates: {
              orb: { symbol: "gSuperpowerOrbSpriteTemplate", start: "0x08595fec", byteLength: 24, sha256: "2a171c79962ce29395fd42d892070a3e13645cdb00edbba18066e2c4c7448c09" },
              rock: { symbol: "gSuperpowerRockSpriteTemplate", start: "0x08596004", byteLength: 24, sha256: "c73a8c96b7be359a139d06fd59528e591c45f63af0dd42dfba3b92fb1b13012a" },
              fireball: { symbol: "gSuperpowerFireballSpriteTemplate", start: "0x0859601c", byteLength: 24, sha256: "29b2f20bb7883ee04423c072c4657900b1c220d0a35abae618296c7cd3b949b6" },
            },
            affine: {
              program: { symbol: "sAffineAnim_SuperpowerOrb", byteLength: 40, sha256: "788d45550dc15b4d83e017eda3fbb2ee53d3cca394f15ab023b0aeee04cd32ec" },
              table: { symbol: "sAffineAnims_SuperpowerOrb", byteLength: 4, sha256: "f6196cd6bb5d3001687ff411a61d7347e1d7ef3c07bfb1f3341895adb8b1e4ed" },
            },
          },
        },
      },
      templates: {
        orb: {
          symbol: "gSuperpowerOrbSpriteTemplate", tileTag: "ANIM_TAG_CIRCLE_OF_LIGHT",
          paletteTag: "ANIM_TAG_CIRCLE_OF_LIGHT",
          oam: { affineMode: "double", objMode: "blend", bpp: 4, shape: "64x64", priority: 2 },
          animations: "gDummySpriteAnimTable", images: null, callback: "AnimSuperpowerOrb",
          affine: { table: "sAffineAnims_SuperpowerOrb", programs: [{ commands: [
            { scaleX: 32, scaleY: 32, duration: 0 },
            { scaleX: 4, scaleY: 4, duration: 64 },
            { scaleX: -6, scaleY: -6, duration: 8 },
            { scaleX: 6, scaleY: 6, duration: 8 },
            { jumpToCommand: 2 },
          ] }] },
        },
        rock: {
          symbol: "gSuperpowerRockSpriteTemplate", tileTag: "ANIM_TAG_FLAT_ROCK",
          paletteTag: "ANIM_TAG_FLAT_ROCK",
          oam: { affineMode: "off", objMode: "normal", bpp: 4, shape: "16x16", priority: 2 },
          affine: "gDummySpriteAffineAnimTable", callback: "AnimSuperpowerRock",
          tileSelection: "gBattleAnimArgs[2] * 4", fiveVariants: true,
        },
        fireball: {
          symbol: "gSuperpowerFireballSpriteTemplate", tileTag: "ANIM_TAG_METEOR",
          paletteTag: "ANIM_TAG_METEOR",
          oam: { affineMode: "off", objMode: "normal", bpp: 4, shape: "64x64", priority: 2 },
          affine: "gDummySpriteAffineAnimTable", callback: "AnimSuperpowerFireball",
        },
      },
      controls: {
        move: "MOVE_SUPERPOWER", status: "staged", coverageCredit: false,
        componentTrack: "superpower-rock-orb-fire", componentTrackFulfilled: false,
        reducerAdded: false, typedSeamAdded: false, compositorAdded: false,
        actualCoreFramebufferAcceptance: false, siblingOrSharedCredit: false,
      },
    });
  });

  it("pins all three tags, source PNGs, 4bpp layout, palette identity, and ROM LZ77 output", () => {
    expect(asset.resources.circleOfLight).toMatchObject({
      tag: "ANIM_TAG_CIRCLE_OF_LIGHT", tagValue: 10212, tileBytes: 0x800,
      graphicsSymbol: "gBattleAnimSpriteGfx_CircleOfLight",
      paletteSymbol: "gBattleAnimSpritePal_ElectricOrbs",
      source: {
        registry: {
          sheet: "{gBattleAnimSpriteGfx_CircleOfLight, 0x0800, ANIM_TAG_CIRCLE_OF_LIGHT},",
          palette: "{gBattleAnimSpritePal_ElectricOrbs, ANIM_TAG_CIRCLE_OF_LIGHT},",
        },
        imagePng: { path: "graphics/battle_anims/sprites/circle_of_light.png", sha256: "804e61c643d8620bb5270f41640cd85916ecb68c67d7c243820baa6731837f4c" },
        palettePng: { path: "graphics/battle_anims/sprites/electric_orbs.png", sha256: "48ac380aae38e0f774914490d1637e291f311c7a3771b434d5aee3a8c430e6ea", sameFileAsImage: false, imagePaletteMatchesAssignedPalette: true },
      },
      compression: {
        graphics: { format: "GBA-LZ77-0x10", streamByteLength: 562, alignmentPaddingByteLength: 2, decompressedByteLength: 0x800, decompressedSha256: "8a61d75d09a3c59af5fe4c1b8f5fe1e78e466599caeac9c44a73030c40f527f0", decodedMatchesIndexedSource: true },
        palette: { format: "GBA-LZ77-0x10", streamByteLength: 34, alignmentPaddingByteLength: 2, decompressedByteLength: 32, decompressedSha256: "dfa836b99406a24b69c1a54ca6775d650a9343eeb9cf44997c4a5cac412c2c8f", decodedMatchesIndexedSource: true },
      },
      layout: { png: { width: 64, height: 64, bitDepth: 4, colorType: "indexed", paletteEntries: 16 }, tiles: { columns: 8, rows: 8, count: 64, bytesPerTile: 32, subpalettes: [0] } },
    });
    expect(asset.resources.meteor).toMatchObject({
      tag: "ANIM_TAG_METEOR", tagValue: 10256, tileBytes: 0x800,
      graphicsSymbol: "gBattleAnimSpriteGfx_Meteor", paletteSymbol: "gBattleAnimSpritePal_Meteor",
      source: {
        registry: {
          sheet: "{gBattleAnimSpriteGfx_Meteor, 0x0800, ANIM_TAG_METEOR},",
          palette: "{gBattleAnimSpritePal_Meteor, ANIM_TAG_METEOR},",
        },
        imagePng: { path: "graphics/battle_anims/sprites/meteor.png", sha256: "37d7905d88c2266f54bb0ca91b51ed6930d36a30544740f6d32d12a7e6cd59de" },
        palettePng: { sameFileAsImage: true, imagePaletteMatchesAssignedPalette: true },
      },
      compression: {
        graphics: { streamByteLength: 908, alignmentPaddingByteLength: 0, decompressedByteLength: 0x800, decompressedSha256: "4ddafefdab58d2980c464c1f87d0becd6b83f0318c3a51b7ad284e43b70c351f", decodedMatchesIndexedSource: true },
        palette: { streamByteLength: 37, alignmentPaddingByteLength: 3, decompressedByteLength: 32, decompressedSha256: "1c37863663e6d1e67c0f7d8e11c0269d387eb934e03269132cdad97496dcfed2", decodedMatchesIndexedSource: true },
      },
      layout: { png: { width: 64, height: 64, bitDepth: 4, colorType: "indexed", paletteEntries: 16 }, tiles: { columns: 8, rows: 8, count: 64, bytesPerTile: 32, subpalettes: [0] } },
    });
    expect(asset.resources.flatRock).toMatchObject({
      tag: "ANIM_TAG_FLAT_ROCK", tagValue: 10257, tileBytes: 0x280,
      graphicsSymbol: "gBattleAnimSpriteGfx_FlatRock", paletteSymbol: "gBattleAnimSpritePal_FlatRock",
      source: {
        registry: {
          sheet: "{gBattleAnimSpriteGfx_FlatRock, 0x0280, ANIM_TAG_FLAT_ROCK},",
          palette: "{gBattleAnimSpritePal_FlatRock, ANIM_TAG_FLAT_ROCK},",
        },
        imagePng: { path: "graphics/battle_anims/sprites/flat_rock.png", sha256: "89c4aa0aa52b74c864a8d454e692871f7874a0a8e58565d860eed86c8a0651b5" },
        palettePng: { sameFileAsImage: true, imagePaletteMatchesAssignedPalette: true },
      },
      compression: {
        graphics: { streamByteLength: 282, alignmentPaddingByteLength: 2, decompressedByteLength: 0x280, decompressedSha256: "1fccf7014e88620fb741a04d08f0b76b6174c94b8a58329983b7fd750fd5353f", decodedMatchesIndexedSource: true },
        palette: { streamByteLength: 31, alignmentPaddingByteLength: 1, decompressedByteLength: 32, decompressedSha256: "e8ada87468bfd9fe224f951eaf504054cb42496a6355458b354fbe44fef40b18", decodedMatchesIndexedSource: true },
      },
      layout: { png: { width: 16, height: 80, bitDepth: 4, colorType: "indexed", paletteEntries: 16 }, tiles: { columns: 2, rows: 10, count: 20, bytesPerTile: 32, subpalettes: [0] }, variants: [
        { args2: 0, tileOffset: 0, tileCount: 4, sourcePixels: { y: 0, width: 16, height: 16 } },
        { args2: 1, tileOffset: 4, tileCount: 4, sourcePixels: { y: 16, width: 16, height: 16 } },
        { args2: 2, tileOffset: 8, tileCount: 4, sourcePixels: { y: 32, width: 16, height: 16 } },
        { args2: 3, tileOffset: 12, tileCount: 4, sourcePixels: { y: 48, width: 16, height: 16 } },
        { args2: 4, tileOffset: 16, tileCount: 4, sourcePixels: { y: 64, width: 16, height: 16 } },
      ] },
    });
    for (const resource of Object.values(asset.resources)) {
      expect(resource.art.palette).toHaveLength(16);
      expect(resource.art.tiles).toHaveLength(resource.layout.tiles.count);
      expect(resource.layout.tiles.tileSubpalettes).toHaveLength(resource.layout.tiles.count);
      expect(resource.compression.graphics.indexedSourceSha256)
        .toBe(resource.compression.graphics.decompressedSha256);
      expect(resource.compression.palette.indexedSourceSha256)
        .toBe(resource.compression.palette.decompressedSha256);
    }
  });

  it("re-extracts byte-for-byte from the pinned source, ELF, and ROM", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-superpower-assets-"));
    const output = join(scratch, "superpower-rock-orb-fire.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve(root, "tools/compare/extractSuperpowerAssets.ts"),
      "--out",
      output,
    ], { cwd: root });
    expect(readFileSync(output, "utf8")).toBe(
      readFileSync(resolve(root, "src/animation/assets/superpower-rock-orb-fire.json"), "utf8"),
    );
  });
});
