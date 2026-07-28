import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/spike-cannon.json" with {
  type: "json",
};

describe("MOVE_SPIKE_CANNON source presentation assets", () => {
  it("pins the legal set-260 Omastar art and explicit primitive reuse", () => {
    expect(asset.source.script).toContain("Move_SPIKE_CANNON");
    expect(asset.source.omastar).toContain("FRONTIER_MON_OMASTAR_1 set 260");
    expect(asset.source.reused).toContain("gLinearStingerSpriteTemplate");
    expect(asset.source.reused).toContain("gHandleInvertHitSplatSpriteTemplate");
    expect(asset.omastarBack.tileset).toMatchObject({ columns: 8, rows: 8 });
    expect(asset.omastarFront.tileset).toMatchObject({ columns: 8 });
    expect(asset.omastarFront.tileset.rows).toBeGreaterThanOrEqual(8);
    expect(asset.omastarBack.palette).toHaveLength(16);
    expect(asset.omastarFront.palette).toHaveLength(16);
  });

  it("regenerates byte-for-byte from the pinned source checkout", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-spike-assets-"));
    const output = join(scratch, "spike-cannon.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/compare/extractSpikeCannonAssets.ts"),
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("src/animation/assets/spike-cannon.json")),
    );
  });
});
