import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/petal-dance.json" with {
  type: "json",
};

describe("MOVE_PETAL_DANCE source presentation assets", () => {
  it("pins the exact FLOWER sheet and valid reused IMPACT source", () => {
    expect(asset.source).toMatchObject({
      script: expect.stringContaining("Move_PETAL_DANCE"),
      flower: expect.stringContaining("ANIM_TAG_FLOWER"),
      impact: expect.stringContaining("ANIM_TAG_IMPACT"),
    });
    expect(asset.flower.tileset).toMatchObject({ columns: 5, rows: 1 });
    expect(asset.flower.tileset.tiles).toHaveLength(5);
    expect(asset.flower.palette).toHaveLength(16);
    expect(asset.impactReuse).toMatchObject({
      path: "src/assets/gen/battle-anim-hitsplat.json",
      source: expect.stringContaining("ANIM_TAG_IMPACT"),
    });
    expect(asset.impactReuse.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("regenerates byte-for-byte from the pinned source checkout", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-petal-assets-"));
    const output = join(scratch, "petal-dance.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/compare/extractPetalDanceAssets.ts"),
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("src/animation/assets/petal-dance.json")),
    );
  });
});
