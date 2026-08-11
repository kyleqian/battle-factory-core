import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/smokescreen.json" with {
  type: "json",
};

describe("MOVE_SMOKESCREEN source presentation assets", () => {
  it("pins BLACK_BALL, BLACK_SMOKE, impact, and legal Koffing art", () => {
    expect(asset.source.script).toContain("Move_SMOKESCREEN");
    expect(asset.source.particles).toContain("ANIM_TAG_BLACK_BALL");
    expect(asset.source.carrier).toContain("FRONTIER_MON_KOFFING set 127");
    expect(asset.source.topology).toContain("no visual task survives");
    expect(asset.blackBall.tileset).toMatchObject({ columns: 1, rows: 1 });
    expect(asset.blackSmoke.tileset).toMatchObject({ columns: 4, rows: 2 });
    expect(asset.impact.tileset).toMatchObject({ columns: 2, rows: 6 });
    expect(asset.koffingBack.tileset).toMatchObject({ columns: 8, rows: 8 });
    expect(asset.koffingFront.tileset).toMatchObject({ columns: 8 });
  });

  it("regenerates byte-for-byte from the pinned source checkout", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-smoke-assets-"));
    const output = join(scratch, "smokescreen.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/compare/extractSmokescreenAssets.ts"),
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("src/animation/assets/smokescreen.json")),
    );
  });
});
