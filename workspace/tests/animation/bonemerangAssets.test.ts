import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/bonemerang.json" with { type: "json" };

describe("MOVE_BONEMERANG source-derived BONE asset", () => {
  it("pins the 32x32 affine-normal BONE source identity", () => {
    expect(asset).toMatchObject({
      schema: "bonemerang-source-assets/v1",
      resource: { tag: "ANIM_TAG_BONE", tagValue: 10000, tileBytes: 0x0200 },
      template: { symbol: "gBonemerangSpriteTemplate", shape: "32x32", affine: true, objMode: "objnormal", affineProgram: [[0, 0, 15, 1]] },
      bone: { dimensions: { width: 32, height: 32 }, tileset: { columns: 4, rows: 4 } },
    });
  });

  it("regenerates byte-for-byte from the pinned source checkout", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-bonemerang-assets-"));
    const output = join(scratch, "bonemerang.json");
    execFileSync(process.execPath, ["--experimental-strip-types", resolve("tools/compare/extractBonemerangAssets.ts"), "--out", output]);
    expect(readFileSync(output, "utf8")).toBe(JSON.stringify(asset, null, 2) + "\n");
  });
});
