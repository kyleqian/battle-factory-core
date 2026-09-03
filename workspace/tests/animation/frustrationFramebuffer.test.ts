import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnFrustrationConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  frustrationConfigFor,
  frustrationRowsFor,
} from "../../tools/compare/frustrationFramebuffer.ts";

const expected = [
  { orientation: "player-back", rows: 229, matched: 229, residualPixels: 0, peakResidualPixels: 0, failures: [] },
  { orientation: "opponent-front", rows: 229, matched: 229, residualPixels: 0, peakResidualPixels: 0, failures: [] },
];

function independentRun(): unknown {
  return JSON.parse(execFileSync(process.execPath, [
    "--experimental-strip-types", "tools/compare/frustrationFramebuffer.ts",
  ], { encoding: "utf8" }));
}

describe("MOVE_FRUSTRATION actual-core production framebuffer", () => {
  it("matches all 458 retained rows in two independent deterministic processes", () => {
    expect(independentRun()).toEqual(expected);
    expect(independentRun()).toEqual(expected);
  }, 30_000);

  it("materially changes species, reversed geometry, allocator/order, matrices, and framebuffer", () => {
    const evidence = frustrationConfigFor("player-back", frustrationRowsFor("player-back"));
    const altered: SceneOnFrustrationConfig = {
      ...evidence,
      attacker: { species: "ARON", geometry: { side: "opponent", spriteCorner: { x: 141, y: 7 }, animationCenter: { x: 173, y: 39 }, battlePositionCenter: { x: 176, y: 40 } } },
      target: { species: "GROVYLE", geometry: { side: "player", spriteCorner: { x: 37, y: 55 }, animationCenter: { x: 69, y: 87 }, battlePositionCenter: { x: 72, y: 80 } } },
      attackerEffectCenter: { x: 173, y: 39 }, targetEffectCenter: { x: 69, y: 91 }, targetInitialX2: 3,
      animationProfile: { angerSlot: 12, angerMatrix: 7, impactSlots: [13, 15], impactMatrices: [8, 11], impactOrders: [9, 4], impactSubpriority: 22, attackerSubpriority: 39, targetSubpriority: 31 },
    };
    const frame = (config: SceneOnFrustrationConfig) => render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age: 133 },
    });
    const digest = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
    expect(digest(frame(altered))).not.toBe(digest(frame(evidence)));
  });
});
