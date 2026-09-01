import { describe, expect, it } from "vitest";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { inspectSwiftFramebuffer, swiftConfigFor } from "../../tools/compare/swiftFramebuffer.ts";

describe("MOVE_SWIFT shared production framebuffer", () => {
  it("matches every retained bilateral row twice through first inactive cleanup", () => {
    const expected = [
      { orientation: "player-back", rows: 78, matched: 78, residualPixels: 0, failures: [] },
      { orientation: "opponent-front", rows: 80, matched: 80, residualPixels: 0, failures: [] },
    ];
    expect(inspectSwiftFramebuffer()).toEqual(expected);
    expect(inspectSwiftFramebuffer()).toEqual(expected);
  });

  it("renders altered live species and geometry through the actual core path", () => {
    const base = swiftConfigFor("player-back");
    const presentation = createSceneOnMovePresentation({
      ...base,
      attacker: { species: "SURSKIT", geometry: { side: "player", spriteCorner: { x: 18, y: 49 }, animationCenter: { x: 50, y: 81 }, battlePositionCenter: { x: 60, y: 78 } } },
      target: { species: "ARON", geometry: { side: "opponent", spriteCorner: { x: 151, y: 7 }, animationCenter: { x: 183, y: 39 }, battlePositionCenter: { x: 180, y: 42 } } },
      animationProfile: { ...base.animationProfile, attackerEffectCenter: { x: 50, y: 89 }, targetAverageCenter: { x: 183, y: 39 },
        attackerSpriteSlot: 20, targetSpriteSlot: 21, starSlots: [22, 23, 24, 25, 26], targetShakeTaskSlot: 7 },
    });
    const state: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...presentation, age: 24 } };
    expect(render(state)).toEqual(render(state));
    expect(render(state)).not.toEqual(render({ ...state, sceneOnPresentation: { ...createSceneOnMovePresentation(base), age: 24 } }));
  });
});
