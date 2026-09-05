import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnDiveConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  diveConfigFor,
  diveRowsFor,
} from "../../tools/compare/diveFramebuffer.ts";

const expected = [
  { orientation: "player-back", body: "setup", rows: 118, matched: 118,
    residualPixels: 0, peakResidualPixels: 0, failures: [] },
  { orientation: "player-back", body: "attack", rows: 93, matched: 93,
    residualPixels: 0, peakResidualPixels: 0, failures: [] },
  { orientation: "opponent-front", body: "setup", rows: 115, matched: 115,
    residualPixels: 0, peakResidualPixels: 0, failures: [] },
  { orientation: "opponent-front", body: "attack", rows: 93, matched: 93,
    residualPixels: 0, peakResidualPixels: 0, failures: [] },
];

function independentRun(): unknown {
  return JSON.parse(execFileSync(process.execPath, [
    "--experimental-strip-types", "tools/compare/diveFramebuffer.ts",
  ], { encoding: "utf8" }));
}

describe("MOVE_DIVE actual-core production framebuffer checkpoint", () => {
  it("reproduces all 419 rows with zero residuals in two independent processes", () => {
    expect(independentRun()).toEqual(expected);
    expect(independentRun()).toEqual(expected);
  }, 30_000);

  it("materially uses live species, geometry, allocation/order, and animation profile", () => {
    const rows = diveRowsFor("player-back", "attack");
    const evidence = diveConfigFor("player-back", "attack", rows);
    const altered: SceneOnDiveConfig = {
      ...evidence,
      attacker: { species: "ARON", geometry: { side: "player",
        spriteCorner: { x: 35, y: 53 }, animationCenter: { x: 67, y: 85 },
        battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "GROVYLE", geometry: { side: "opponent",
        spriteCorner: { x: 147, y: 11 }, animationCenter: { x: 179, y: 43 },
        battlePositionCenter: { x: 176, y: 40 } } },
      animationGeometry: {
        attackerCenter: { x: 67, y: 85 }, targetCenter: { x: 179, y: 43 },
        attackerPictureOffset: { x: 72, y: 80 }, targetPictureOffset: { x: 176, y: 40 },
        attackerRestOffset: { x2: -5, y2: 5 }, targetRestOffset: { x2: 3, y2: -3 },
      },
      animationProfile: {
        ...evidence.animationProfile,
        splash: { ...evidence.animationProfile.splash, slot: 21, matrixNum: 12,
          persistentOrder: 18 },
        droplets: evidence.animationProfile.droplets.map((drop, index, drops) => ({
          ...drop, slot: drops[drops.length - 1 - index]!.slot, persistentOrder: 40 - index,
          velocityX: drop.velocityX + (index % 2 ? 24 : -16),
        })),
      },
    };
    const frame = (config: SceneOnDiveConfig) => render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age: 25 },
    });
    const digest = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
    expect(digest(frame(altered))).not.toBe(digest(frame(evidence)));
  });
});
