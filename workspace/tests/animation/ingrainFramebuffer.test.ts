import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnIngrainConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  ingrainConfigFor,
  ingrainRowsFor,
  verifyIngrainFramebuffer,
} from "../../tools/compare/ingrainFramebuffer.ts";

describe("MOVE_INGRAIN shared production framebuffer", () => {
  it("matches every retained bilateral row twice through first inactive cleanup", () => {
    const expected = [
      { orientation: "player-back", componentRows: 164, seamRows: 164,
        rawRgbRows: 164, framebufferRows: 164, residualPixels: 0 },
      { orientation: "opponent-front", componentRows: 164, seamRows: 164,
        rawRgbRows: 164, framebufferRows: 164, residualPixels: 0 },
    ];
    expect(verifyIngrainFramebuffer()).toEqual(expected);
    expect(verifyIngrainFramebuffer()).toEqual(expected);
  }, 45_000);

  it("accepts live species and geometry outside the retained carrier pair", () => {
    const evidence = ingrainConfigFor("player-back", ingrainRowsFor("player-back"));
    const generic: SceneOnIngrainConfig = {
      ...evidence,
      attacker: {
        ...evidence.attacker,
        species: "ARON",
        geometry: {
          ...evidence.attacker.geometry,
          spriteCorner: { x: 34, y: 57 },
          battlePositionCenter: { x: 66, y: 78 },
        },
      },
      target: { ...evidence.target, species: "GROVYLE" },
    };
    const stage = createSceneOnMovePresentation(generic);
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 90 },
    })).toHaveLength(240 * 160 * 4);
  });
});
