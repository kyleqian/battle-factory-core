import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import biteAsset from "../../src/animation/assets/bite.json" with { type: "json" };

describe("MOVE_BITE source presentation assets", () => {
  it("pins SHARP_TEETH geometry and the legal MEOWTH carrier", () => {
    expect(biteAsset.source).toMatchObject({
      script: expect.stringContaining("Move_BITE"),
      sharpTeeth: expect.stringContaining("ANIM_TAG_SHARP_TEETH"),
      meowthBack: expect.stringContaining("FRONTIER_MON_MEOWTH set 56"),
      reused: expect.stringContaining("ANIM_TAG_IMPACT"),
    });
    expect(biteAsset.sharpTeeth.tileset).toMatchObject({
      columns: 8,
      rows: 8,
    });
    expect(biteAsset.meowthBack.tileset).toMatchObject({
      columns: 8,
      rows: 8,
    });
    expect(biteAsset.meowthFront.tileset).toMatchObject({
      columns: 8,
      rows: 16,
    });
    expect(biteAsset.template).toMatchObject({
      oam: "gOamData_AffineNormal_ObjBlend_64x64",
      callback: "AnimSharpTeeth",
      tileBytes: 0x0800,
    });
  });

  it("regenerates byte-for-byte from pinned pokeemerald source", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-bite-assets-"));
    const output = join(scratch, "bite.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/compare/extractBiteAssets.ts"),
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("src/animation/assets/bite.json")),
    );
  });
});
