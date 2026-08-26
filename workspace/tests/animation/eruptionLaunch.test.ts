import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { shakeMon2Sequence } from "../../src/animation/shakeMon2.ts";

describe("MOVE_ERUPTION launch-rock component", () => {
  it("strictly replays all 970 retained source/task/sprite/RNG/resource/OAM rows", () => {
    const summary = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/eruptionLaunchAudit.ts",
    ], { encoding: "utf8" })) as Record<string, any>;
    expect(summary).toMatchObject({
      component: "task:AnimTask_EruptionLaunchRocks + sprite:gEruptionLaunchRockSpriteTemplate",
      status: "unsupported-unfulfilled-component-checkpoint",
      "player-back": {
        sourceWindow: { rows: 476 },
        taskLifetimes: [[19, 99], [101, 181]],
        launchWaveStarts: [61, 143],
        launchRockCreations: 14,
        checked: { componentRows: 162, rngRows: 476, transferRows: 475 },
        resources: { loadedAge: 1, freedAge: 475 },
      },
      "opponent-front": {
        sourceWindow: { rows: 494 },
        taskLifetimes: [[19, 108], [110, 199]],
        launchWaveStarts: [61, 152],
        launchRockCreations: 14,
        checked: { componentRows: 180, rngRows: 494, transferRows: 493 },
        resources: { loadedAge: 1, freedAge: 493 },
      },
    });
  });

  it("keeps the banked palette reducer and an independent task control unchanged", () => {
    const palette = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/eruptionPaletteAudit.ts",
    ], { encoding: "utf8" })) as Record<string, any>;
    expect(palette).toMatchObject({
      schema: "eruption-simple-palette-component-audit/v1",
      status: "banked-component-only-move-unsupported",
      "player-back": { cleanupAge: 475 },
      "opponent-front": { cleanupAge: 493 },
    });
    expect(shakeMon2Sequence(3, 0, 2, 1)).toEqual([
      { x2: 3, y2: 0 }, { x2: -3, y2: 0 }, { x2: -3, y2: 0 },
      { x2: 0, y2: 0 },
    ]);
  });
});
