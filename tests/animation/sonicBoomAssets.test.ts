import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/sonic-boom.json" with {
  type: "json",
};

describe("MOVE_SONIC_BOOM source presentation assets", () => {
  it("pins AIR_WAVE and the legal set-244 Magneton art", () => {
    expect(asset.source.script).toContain("Move_SONIC_BOOM");
    expect(asset.source.projectile).toContain("ANIM_TAG_AIR_WAVE");
    expect(asset.source.magneton).toContain("FRONTIER_MON_MAGNETON_1 set 244");
    expect(asset.source.reused).toContain("AnimTask_ShakeMon");
    expect(asset.airWave.tileset).toMatchObject({ columns: 4, rows: 2 });
    expect(asset.magnetonBack.tileset).toMatchObject({ columns: 8, rows: 8 });
    expect(asset.magnetonFront.tileset).toMatchObject({ columns: 8 });
    expect(asset.airWave.palette).toHaveLength(16);
    expect(asset.magnetonBack.palette).toHaveLength(16);
  });

  it("regenerates byte-for-byte from the pinned source checkout", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-sonic-assets-"));
    const output = join(scratch, "sonic-boom.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/compare/extractSonicBoomAssets.ts"),
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("src/animation/assets/sonic-boom.json")),
    );
  });
});
