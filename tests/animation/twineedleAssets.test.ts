import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/twineedle.json" with { type: "json" };

describe("MOVE_TWINEEDLE source presentation assets", () => {
  it("pins NEEDLE geometry, templates, and the legal BEEDRILL carrier", () => {
    expect(asset.source).toMatchObject({
      script: expect.stringContaining("Move_TWINEEDLE"),
      needle: expect.stringContaining("ANIM_TAG_NEEDLE"),
      beedrillBack: expect.stringContaining("FRONTIER_MON_BEEDRILL set 154"),
      reused: expect.stringContaining("ANIM_TAG_IMPACT"),
    });
    expect(asset.needle.tileset).toMatchObject({ columns: 2, rows: 2 });
    expect(asset.beedrillBack.tileset).toMatchObject({
      columns: 8, rows: 8,
    });
    expect(asset.beedrillFront.tileset).toMatchObject({
      columns: 8, rows: 16,
    });
    expect(asset.templates).toMatchObject({
      linearStinger: {
        oam: "gOamData_AffineNormal_ObjNormal_16x16",
        callback: "AnimTranslateStinger",
        tileBytes: 0x80,
      },
      invertHitSplat: {
        oam: "gOamData_AffineNormal_ObjBlend_32x32",
        callback: "AnimHitSplatHandleInvert",
        affineAnimation: 3,
      },
    });
  });

  it("regenerates byte-for-byte from pinned pokeemerald source", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-twineedle-assets-"));
    const output = join(scratch, "twineedle.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/compare/extractTwineedleAssets.ts"),
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("src/animation/assets/twineedle.json")),
    );
  });
});
