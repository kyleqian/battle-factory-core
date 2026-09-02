import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hyperBeamAtAge } from "../../src/animation/hyperBeam.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const inspect = (): any => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/hyperBeamFramebuffer.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));

describe("MOVE_HYPER_BEAM production body", () => {
  const geometry = { attackerPictureCenter: { x: 72, y: 96 },
    targetPictureCenter: { x: 176, y: 42 }, attackerRestOffset: { x2: 0, y2: 0 },
    targetRestOffset: { x2: 1, y2: 0 } };
  const profile = { orbs: Array.from({ length: 52 }, (_, index) => ({
    animation: index & 7, speed: 64 + (index & 31), phase: index * 17 & 0xff,
    slot: 3 + index, persistentOrder: index,
  })), attackerSubpriority: 30, targetSubpriority: 40,
  spriteOrderSeed: Array.from({ length: 64 }, (_, index) => index) };

  it("ports all 26 groups, 52 three-random orb lives, tasks, audio, and cleanup", () => {
    expect(hyperBeamAtAge(109, "player", geometry, profile).orbs).toHaveLength(0);
    expect(hyperBeamAtAge(110, "player", geometry, profile).orbs).toHaveLength(2);
    expect(hyperBeamAtAge(185, "player", geometry, profile).orbs.some(
      (orb) => orb.index === 51)).toBe(true);
    expect(hyperBeamAtAge(71, "player", geometry, profile).attackerOffset.x2).toBe(-1);
    // The source task is created at age 110, but its visible positive Y write\n    // reaches the retained state at age 112 (both Scene-ON orientation maps agree).\n    expect(hyperBeamAtAge(110, "player", geometry, profile).attackerOffset.y2).toBe(0);\n    expect(hyperBeamAtAge(112, "player", geometry, profile).attackerOffset.y2).toBe(4);
    expect(hyperBeamAtAge(125, "player", geometry, profile).targetOffset.x2).toBe(-4);
    expect(hyperBeamAtAge(110, "player", geometry, profile).audio.loopArgs).toEqual([1, 15, 0, 5]);
    expect(hyperBeamAtAge(279, "player", geometry, profile).cleanup.firstInactive).toBe(true);
  });

  it("extracts the ANIM_TAG_ORBS bundle byte-for-byte", () => {
    const scratch = createScratchDir("pokebench-hyper-beam-assets-");
    const output = join(scratch, "hyper-beam.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractHyperBeamAssets.ts", "--out", output], { cwd: root });
    expect(readFileSync(output)).toEqual(readFileSync(join(
      root, "src/animation/assets/hyper-beam.json")));
  });

  it("reproduces the complete bilateral actual-core corpus twice and altered control", () => {
    const result = inspect(), repeat = inspect();
    expect(result.comparisons.map((item: any) => [item.totalRows, item.componentExactRows]))
      .toEqual([[280, 280], [280, 280]]);
    expect(result.comparisons.map((item: any) => [item.zeroRows, item.residualPixels,
      item.peakResidualPixels])).toEqual([[280, 0, 0], [280, 0, 0]]);
    expect(repeat).toEqual(result);
    expect(result.alteredControl.baseFramebufferSha256)
      .not.toBe(result.alteredControl.alteredFramebufferSha256);
  });
});
