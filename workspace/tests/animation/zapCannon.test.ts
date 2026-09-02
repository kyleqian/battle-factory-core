import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { zapCannonAtAge } from "../../src/animation/zapCannon.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const inspect = (): any => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/zapCannonFramebuffer.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
const allocation = { slot: 3, matrixNum: 0, order: 0 };
const profile = { ball: allocation,
  sparks: Array.from({ length: 8 }, () => allocation),
  arcs: Array.from({ length: 8 }, () => allocation) };
const geometry = { attackerPictureCenter: { x: 82, y: 104 },
  targetPictureCenter: { x: 176, y: 49 }, targetBattleCenter: { x: 176, y: 40 } };

describe("MOVE_ZAP_CANNON production body", () => {
  it("ports projectile, orbit, ShakeMon2, shared arcs, resources, audio, and cleanup", () => {
    expect(zapCannonAtAge(7, "opponent", geometry, profile).sprites).toHaveLength(9);
    expect(zapCannonAtAge(8, "opponent", geometry, profile).sprites[0])
      .toMatchObject({ kind: "ball", x2: 3, y2: -1 });
    expect(zapCannonAtAge(36, "opponent", geometry, profile).sprites).toHaveLength(9);
    expect(zapCannonAtAge(40, "opponent", geometry, profile).targetX2).toBe(-4);
    expect(zapCannonAtAge(46, "opponent", geometry, profile).targetX2).toBe(4);
    expect(zapCannonAtAge(57, "opponent", geometry, profile)).toMatchObject({
      sprites: [expect.objectContaining({ kind: "arc", x: 181, y: 40 })],
      sound: { song: "SE_M_THUNDERBOLT2", pan: "target" },
    });
    expect(zapCannonAtAge(111, "opponent", geometry, profile)).toMatchObject({
      active: false, cleanup: true, resources: { blackBall2: false, spark2: false } });
  });

  it("extracts BLACK_BALL_2 and SPARK_2 byte-for-byte", () => {
    const scratch = createScratchDir("pokebench-zap-cannon-assets-");
    const output = join(scratch, "zap-cannon.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractZapCannonAssets.ts", "--out", output], { cwd: root });
    expect(readFileSync(output)).toEqual(readFileSync(join(
      root, "src/animation/assets/zap-cannon.json")));
  });

  it("reproduces all 224 actual-core rows in two independent processes", () => {
    const result = inspect();
    const repeat = inspect();
    expect(result.comparisons.map((item: any) => [item.totalRows, item.componentExactRows]))
      .toEqual([[112, 112], [112, 112]]);
    expect(result.comparisons.map((item: any) => [item.zeroRows, item.residualPixels,
      item.peakResidualPixels])).toEqual([[112, 0, 0], [112, 0, 0]]);
    expect(repeat).toEqual(result);
    expect(result.alteredControl.species).toEqual(["GOLDUCK", "GRAVELER"]);
    expect(result.alteredControl.sides).toEqual(["opponent", "player"]);
    expect(result.alteredControl.palettes).toContain("species-derived");
    expect(result.alteredControl.baseFramebufferSha256)
      .not.toBe(result.alteredControl.alteredFramebufferSha256);
  });
});
