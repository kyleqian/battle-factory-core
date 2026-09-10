import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/water-pulse.json" with { type: "json" };

describe("MOVE_WATER_PULSE source presentation assets", () => {
  it("extracts only the missing BLUE_RING_2 art and names SMALL_BUBBLES as an existing source-derived reuse", () => {
    expect(asset.source).toMatchObject({
      script: expect.stringContaining("Move_WATER_PULSE"), blueRing2: expect.stringContaining("ANIM_TAG_BLUE_RING_2"),
      smallBubbles: expect.stringContaining("reused without duplication"),
    });
    expect(asset.blueRing2).toMatchObject({ tag: 10288, tileBytes: 256, dimensions: { width: 16, height: 32 }, tileset: { columns: 2, rows: 4 } });
    expect(asset.blueRing2.tileset.tiles).toHaveLength(8);
    expect(asset.blueRing2.palette).toHaveLength(16);
    expect(asset.reusedSmallBubbles).toMatchObject({ path: "src/animation/assets/water-gun.json", sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
  });

  it("regenerates byte-for-byte from the pinned source checkout", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-water-pulse-assets-"));
    const output = join(scratch, "water-pulse.json");
    execFileSync(process.execPath, ["--experimental-strip-types", resolve("tools/compare/extractWaterPulseAssets.ts"), "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync(resolve("src/animation/assets/water-pulse.json")));
  });
});
