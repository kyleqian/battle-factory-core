import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import reflectAsset from "../../src/animation/assets/reflect.json" with { type: "json" };

describe("MOVE_REFLECT source presentation assets", () => {
  it("pins the literal blue-wall and SPARKLE_4 sheets and their template geometry", () => {
    expect(reflectAsset.source).toMatchObject({
      script: expect.stringContaining("Move_REFLECT"),
      carrier: expect.stringContaining("gMonFrontPic_Shuppet"),
      blueLightWall: expect.stringContaining("ANIM_TAG_BLUE_LIGHT_WALL"),
      sparkle4: expect.stringContaining("ANIM_TAG_SPARKLE_4"),
    });
    expect(reflectAsset.blueLightWall.tileset).toMatchObject({ columns: 8, rows: 8 });
    expect(reflectAsset.sparkle4.tileset).toMatchObject({ columns: 4, rows: 20 });
    expect(reflectAsset.shuppetFront.tileset).toMatchObject({ columns: 8, rows: 16 });
    expect(reflectAsset.templates).toMatchObject({
      reflectWall: { oam: "gOamData_AffineOff_ObjBlend_64x64", subpriority: 1 },
      reflectSparkle: { oam: "gOamData_AffineOff_ObjNormal_32x32", frames: [0, 16, 32, 48, 64], subpriority: 2 },
    });
  });

  it("regenerates byte-for-byte from pinned pokeemerald source", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-reflect-assets-"));
    const output = join(scratch, "reflect.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types", resolve("tools/compare/extractReflectAssets.ts"), "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(readFileSync(resolve("src/animation/assets/reflect.json")));
  });
});
