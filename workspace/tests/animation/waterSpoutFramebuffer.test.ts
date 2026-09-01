import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnWaterSpoutConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  inspectWaterSpoutFramebuffer,
  waterSpoutConfigFor,
} from "../../tools/compare/waterSpoutFramebuffer.ts";

describe("MOVE_WATER_SPOUT full-HP shared production framebuffer", () => {
  it("matches every retained bilateral row twice through first inactive cleanup", () => {
    const expected = [
      { orientation: "player-back", rows: 278, matched: 278, residualPixels: 0, failures: [] },
      { orientation: "opponent-front", rows: 278, matched: 278, residualPixels: 0, failures: [] },
    ];
    expect(inspectWaterSpoutFramebuffer()).toEqual(expected);
    expect(inspectWaterSpoutFramebuffer()).toEqual(expected);
  }, 60_000);

  it("accepts altered live species, geometry, and allocator inputs through core", () => {
    const evidence = waterSpoutConfigFor("player-back");
    const generic: SceneOnWaterSpoutConfig = {
      ...evidence,
      attacker: {
        ...evidence.attacker,
        species: "SURSKIT",
        geometry: {
          ...evidence.attacker.geometry,
          spriteCorner: { x: 35, y: 53 },
          animationCenter: { x: 67, y: 85 },
          battlePositionCenter: { x: 67, y: 79 },
        },
      },
      target: { ...evidence.target, species: "ARON" },
      animationInputs: {
        ...evidence.animationInputs,
        attackerEffectCenter: { x: 67, y: 93 },
        launchTaskSlot: 4,
        launchSpriteSlots: Array.from({ length: 20 }, (_, index) => 25 + index),
        impactAffineSlots: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
        spriteOrderSeed: Array.from({ length: 64 }, (_, index) => 63 - index),
      },
    };
    const stage = createSceneOnMovePresentation(generic);
    expect(render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 147 },
    })).toHaveLength(240 * 160 * 4);
  });
});
