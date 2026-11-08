import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../fixtures/data/sky-uppercut.json" with {
  type: "json",
};

describe("MOVE_SKY_UPPERCUT source presentation assets", () => {
  it("pins its pointer-owned script and honest generic asset reuse", () => {
    expect(asset.source).toMatchObject({
      script: expect.stringContaining("Move_SKY_UPPERCUT"),
      impact: expect.stringContaining("ANIM_TAG_IMPACT"),
      background: expect.stringContaining("BG_IN_AIR"),
    });
    expect(asset.source.scriptSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(asset.impactReuse).toMatchObject({
      path: "src/assets/gen/battle-anim-hitsplat.json",
      source: expect.stringContaining("ANIM_TAG_IMPACT"),
    });
    expect(asset.backgroundReuse).toMatchObject({
      path: "src/animation/assets/seismic-toss.json",
      source: expect.stringContaining("BG_IN_AIR"),
    });
    expect(asset.impactReuse.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(asset.backgroundReuse.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("regenerates byte-for-byte from the pinned source checkout", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-sky-uppercut-assets-"));
    const output = join(scratch, "sky-uppercut.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/compare/extractSkyUppercutAssets.ts"),
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("tests/fixtures/data/sky-uppercut.json")),
    );
  });
});
