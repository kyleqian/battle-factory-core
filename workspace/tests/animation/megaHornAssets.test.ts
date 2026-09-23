import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/mega-horn-horn-hit-2.json" with { type: "json" };

const root = resolve(import.meta.dirname, "../..");

describe("MOVE_MEGAHORN source-derived HORN_HIT_2 asset", () => {
  it("pins the source, PNG, ROM, static frame, and affine-template contract", () => {
    expect(asset).toMatchObject({
      schema: "mega-horn-horn-hit-2-source-assets/v1",
      source: {
        move: {
          path: "data/battle_anim_scripts.s",
          start: 236210,
          endExclusive: 237813,
          byteLength: 1603,
          sha256: "bd514880f8120d159d620f3bdd5333f2f7df1b44e0618cbf96c57d775ce171c5",
        },
        template: {
          path: "src/battle_anim_bug.c",
          start: 1374,
          endExclusive: 1700,
          byteLength: 326,
          sha256: "b861134e72de8742829c33ea9d81e004f7b1e690b2f26ab4dd48c702b020e033",
        },
        callback: {
          path: "src/battle_anim_bug.c",
          start: 5581,
          endExclusive: 6569,
          byteLength: 988,
          sha256: "1818b0a01ee0e8351403c940858f4b9cfa7da21f8e45d7e010fe73f215388b2b",
        },
        affinePrograms: [
          { sha256: "e5345456c9d2d022b87868a7f7262c9cb1eb3e3832af9a83ae2cabcf6ee88cbb" },
          { sha256: "aa0c7856dd1d32d5bb1b58428a695bed8e6612adb0d0e6804461404d6edcbe9b" },
          { sha256: "f73182f9e518a8ef092a0023a550f9c7b5e8a9dbd68b837b306c31d29d6bcdb8" },
        ],
        affineTable: {
          sha256: "8eb198842456e384554a04f8ca1cc3084368485ed0c5cb97d8444aa46a25d584",
        },
        graphics: {
          path: "src/graphics.c",
          sha256: "87d099f7e312707c38d17c0667576f28e1532aad8da53fc6a210059f211d1aca",
        },
        registry: {
          sheet: "{gBattleAnimSpriteGfx_HornHit2, 0x0100, ANIM_TAG_HORN_HIT_2},",
          palette: "{gBattleAnimSpritePal_HornHit2, ANIM_TAG_HORN_HIT_2},",
          sha256: "f2704d68b4989c68f443a8c7ad2b97bae0c6612636ba1d0c6babab2360a2afda",
        },
        tag: {
          definition: "#define ANIM_TAG_HORN_HIT_2                 (ANIM_SPRITES_START + 153)",
          value: 10153,
        },
        png: {
          path: "graphics/battle_anims/sprites/horn_hit_2.png",
          sha256: "4896d0d70b874eda098f555097851e243669fc1ae0a6b9987e7562cc13fc15f0",
        },
        rom: {
          gameCode: "AGB-BPEE",
          imageSha256: "a9dec84dfe7f62ab2220bafaef7479da0929d066ece16a6885f6226db19085af",
          symbols: {
            move: {
              symbol: "Move_MEGAHORN",
              start: "0x082d1924",
              endExclusive: "0x082d1a11",
              byteLength: 237,
              sha256: "6a9fa282992c924210f0b66cd336f70072ebdf3598dfce823bc66b55bcf0acf2",
            },
            template: {
              symbol: "gMegahornHornSpriteTemplate",
              start: "0x08596974",
              endExclusive: "0x0859698c",
              byteLength: 24,
              sha256: "d2041c332b730004e43936b4698669d698f9ff33a566d608813e2c12e6ab9835",
            },
            callback: {
              symbol: "AnimMegahornHorn",
              sha256: "1a756cb13fff49d11cf1cf21ff1c5486d550b015730a5b09240ce5e168360fd5",
            },
            affineTable: {
              symbol: "sAffineAnims_MegahornHorn",
              sha256: "83344e17afe000097d31d9c67884e2174840f3f91fc9fc10f9dbb65e37249a52",
            },
            affinePrograms: [
              { symbol: "sAffineAnim_MegahornHorn_0", sha256: "eebea33d2e4ac2f710bdf47311f221576aaddeec73b02e71aa830b75172edede" },
              { symbol: "sAffineAnim_MegahornHorn_1", sha256: "bfd6b91db28cd676111e1ac14e00aea965df513da56f49902f55afb2fc7368fa" },
              { symbol: "sAffineAnim_MegahornHorn_2", sha256: "f213e7d35aecd886a542cc42d90bc6fda99293cda8078f5cb84f583c470c0e25" },
            ],
            oam: {
              symbol: "gOamData_AffineDouble_ObjNormal_32x16",
              sha256: "e838e6f0e7e00d5174bac0489de83ed48bf69ccb455a4c8953c560fb60e52b8d",
            },
            dummyAnimationTable: {
              symbol: "gDummySpriteAnimTable",
              sha256: "a2335cccf408678b2e37e3b6e81cca6b373afb9936c0954f846376d6681e54d1",
            },
            graphics: {
              symbol: "gBattleAnimSpriteGfx_HornHit2",
              start: "0x08c1b510",
              endExclusive: "0x08c1b57c",
              byteLength: 108,
              sha256: "56450ac0e3dd0df802b7bf904edc4c0e8b865a0a5c5d0fa2ca075f39284dd263",
            },
            palette: {
              symbol: "gBattleAnimSpritePal_HornHit2",
              start: "0x08c1b57c",
              endExclusive: "0x08c1b594",
              byteLength: 24,
              sha256: "249a368488db226c3ece9919fc5df22be0d7d03b1f05f8fe4ce1d4a4e7031adb",
            },
          },
        },
      },
      resource: {
        tag: "ANIM_TAG_HORN_HIT_2",
        tagValue: 10153,
        tileBytes: 256,
      },
      frameLayout: {
        spriteAnimationTable: "gDummySpriteAnimTable",
        kind: "static-default-frame",
        frames: [{ index: 0, tileOffset: 0, tileCount: 8, width: 32, height: 16 }],
        tiles: { width: 8, height: 8, columns: 4, rows: 2, count: 8, bytesPerTile: 32 },
      },
      template: {
        symbol: "gMegahornHornSpriteTemplate",
        oam: { affineMode: "double", objMode: "objnormal", bpp: 4, shape: "32x16", priority: 2 },
        animations: "gDummySpriteAnimTable",
        images: null,
        callback: "AnimMegahornHorn",
        affine: {
          selection: { defaultBattle: 0, targetPlayerSide: 1, contest: 2 },
          programs: [
            { index: 0, scaleX: 256, scaleY: 256, rotation: 30, duration: 0 },
            { index: 1, scaleX: 256, scaleY: 256, rotation: -99, duration: 0 },
            { index: 2, scaleX: 256, scaleY: 256, rotation: 94, duration: 0 },
          ],
        },
      },
      hornHit2: {
        dimensions: { width: 32, height: 16 },
        tileset: { columns: 4, rows: 2 },
      },
    });
    expect(asset.hornHit2.tileset.tiles).toHaveLength(8);
    expect(asset.hornHit2.palette).toHaveLength(16);
  });

  it("re-extracts byte-for-byte from the pinned pokeemerald checkout", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-megahorn-assets-"));
    const output = join(scratch, "mega-horn-horn-hit-2.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve(root, "tools/compare/extractMegaHornAssets.ts"),
      "--out",
      output,
    ], { cwd: root });
    expect(readFileSync(output, "utf8")).toBe(
      readFileSync(resolve(root, "src/animation/assets/mega-horn-horn-hit-2.json"), "utf8"),
    );
  });
});
