import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import asset from "../../src/assets/gen/battle-anim-spark.json" with { type: "json" };

describe("ANIM_TAG_SPARK source extraction", () => {
  it("pins Spark, the Thunder Wave-only Spark H, and the source receipt", () => {
    expect(asset.source.script).toContain("Move_THUNDER_WAVE");
    expect(asset.source.spark).toContain("ANIM_TAG_SPARK");
    expect(asset.source.sparkH).toContain("ANIM_TAG_SPARK_H");
    expect(asset.spark4bpp.bytes).toHaveLength(0x300);
    expect(asset.spark4bpp.sha256).toMatch(/^[0-9a-f]{64}$/);
    // The 32x32 sheet supplies two 32x16 OAM frames.
    expect(asset.sparkH).toMatchObject({ width: 32, height: 32 });
  });

  it("regenerates byte-for-byte from the pinned source files", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-thunder-wave-assets-"));
    const output = join(scratch, "spark.json");
    execFileSync("node", ["--experimental-strip-types",
      resolve("tools/compare/extractThunderWaveAssets.ts"), "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync(resolve("src/assets/gen/battle-anim-spark.json")));
  });
});
