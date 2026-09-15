import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/psych-up.json" with { type: "json" };

describe("MOVE_PSYCH_UP source-derived SPIRAL asset", () => {
  it("pins the source template, affine command, tiles, and palette", () => {
    expect(asset).toMatchObject({
      schema: "psych-up-source-assets/v1",
      resource: { tag: 10196, tileBytes: 0x0800 },
      template: {
        symbol: "gPsychUpSpiralSpriteTemplate", shape: "64x64",
        affine: "normal", objMode: "objblend", callback: "AnimSpriteOnMonPos",
        affineCommand: { scaleDeltaX: -2, scaleDeltaY: -2, rotationDelta: -10, duration: 120 },
      },
      art: { dimensions: { width: 64, height: 64 }, tileset: { columns: 8, rows: 8 } },
    });
    expect(asset.art.tileset.tiles).toHaveLength(64);
    expect(asset.art.palette).toHaveLength(16);
  });

  it("regenerates byte-for-byte from the pinned source checkout", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-psych-up-assets-"));
    const output = join(scratch, "psych-up.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types", resolve("tools/compare/extractPsychUpAssets.ts"),
      "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(readFileSync(resolve("src/animation/assets/psych-up.json")));
  });
});
