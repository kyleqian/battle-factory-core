import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { auroraBeamAtAge } from "../../src/animation/auroraBeam.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const inspect = (): any => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/auroraBeamFramebuffer.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));

describe("MOVE_AURORA_BEAM production checkpoint", () => {
  const geometry = { attackerRingOrigin: { x: 92, y: 96 },
    targetPictureCenter: { x: 176, y: 42 }, targetRestOffset: { x2: 1, y2: 0 } };
  const profile = { ringSlots: Array.from({ length: 40 }, (_, i) => [3, 4, 5, 7, 9, 10][i % 6]!),
    ringMatrixIds: Array.from({ length: 40 }, (_, i) => [0, 3, 4, 5, 6, 7][i % 6]!),
    ringSubpriority: 38, spriteOrderSeed: [3, 4, 5, 7, 9, 10] };

  it("ports the source-relative ring, palette, fade, shake, and cleanup schedules", () => {
    expect(auroraBeamAtAge(42, "player", geometry, profile).rings).toHaveLength(1);
    expect(auroraBeamAtAge(159, "player", geometry, profile).rings.at(-1)?.sourceCreationAge).toBe(159);
    expect(auroraBeamAtAge(174, "player", geometry, profile).rings).toHaveLength(1);
    expect(auroraBeamAtAge(175, "player", geometry, profile).rings).toHaveLength(0);
    expect(auroraBeamAtAge(44, "player", geometry, profile).ringPaletteRotation).toBe(1);
    expect(auroraBeamAtAge(170, "player", geometry, profile).ringPaletteRotation).toBe(3);
    expect(auroraBeamAtAge(54, "player", geometry, profile).targetOffset.x2).toBe(-1);
    expect(auroraBeamAtAge(86, "player", geometry, profile).targetOffset.x2).toBe(0);
    expect(auroraBeamAtAge(90, "player", geometry, profile).targetOffset.x2).toBe(-2);
    expect(auroraBeamAtAge(168, "player", geometry, profile).targetOffset.x2).toBe(0);
    expect(auroraBeamAtAge(23, "player", geometry, profile).background).toBe("aurora");
    expect(auroraBeamAtAge(195, "player", geometry, profile).background).toBe("field");
    expect(auroraBeamAtAge(215, "player", geometry, profile).cleanup.firstInactive).toBe(true);
  });

  it("extracts byte-reproducible Aurora BG and ring art", () => {
    const scratch = createScratchDir("pokebench-aurora-assets-");
    const output = join(scratch, "aurora-beam.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractAuroraBeamAssets.ts", "--out", output], { cwd: root });
    expect(readFileSync(output)).toEqual(readFileSync(join(
      root, "src/animation/assets/aurora-beam.json",
    )));
  });

  it("reproduces the complete bilateral actual-core corpus and altered control", () => {
    const result = inspect();
    const repeat = inspect();
    expect(result.comparisons.map((item: any) => [item.totalRows, item.componentExactRows]))
      .toEqual([[216, 216], [216, 216]]);
    expect(result.comparisons.map((item: any) => [item.zeroRows, item.residualPixels,
      item.peakResidualPixels])).toEqual([[216, 0, 0], [216, 0, 0]]);
    expect(repeat).toEqual(result);
    expect(result.alteredControl.baseFramebufferSha256)
      .not.toBe(result.alteredControl.alteredFramebufferSha256);
  });
});
