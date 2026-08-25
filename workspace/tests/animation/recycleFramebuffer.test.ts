import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnRecycleConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  recycleConfigFor,
  recycleRowsFor,
  verifyRecycleFramebuffer,
} from "../../tools/compare/recycleFramebuffer.ts";

describe("MOVE_RECYCLE shared production framebuffer", () => {
  it("matches every retained bilateral row through first inactive cleanup", () => {
    const expected = [
      { orientation: "player-back", componentRows: 203, seamRows: 203,
        rawRgbRows: 203, framebufferRows: 203, residualPixels: 0 },
      { orientation: "opponent-front", componentRows: 203, seamRows: 203,
        rawRgbRows: 203, framebufferRows: 203, residualPixels: 0 },
    ];
    expect(verifyRecycleFramebuffer()).toEqual(expected);
    expect(verifyRecycleFramebuffer()).toEqual(expected);
  }, 45_000);

  it("accepts live species and geometry outside the retained carrier pair", () => {
    const evidence = recycleConfigFor("player-back", recycleRowsFor("player-back"));
    const generic: SceneOnRecycleConfig = {
      ...evidence,
      attacker: {
        ...evidence.attacker,
        species: "ARON",
        geometry: {
          ...evidence.attacker.geometry,
          spriteCorner: { x: 34, y: 57 },
          animationCenter: { x: 66, y: 75 },
        },
      },
      target: { ...evidence.target, species: "GROVYLE" },
    };
    const stage = createSceneOnMovePresentation(generic);
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 11 },
    })).toHaveLength(240 * 160 * 4);
  });
});
