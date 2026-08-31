import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnSandTombConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  inspectSandTombFramebuffer,
  sandTombConfigFor,
} from "../../tools/compare/sandTombFramebuffer.ts";

describe("MOVE_SAND_TOMB shared production framebuffer", () => {
  it("matches every retained bilateral row twice through first inactive cleanup", () => {
    const expected = [
      { orientation: "player-back", rows: 124, matched: 124, residualPixels: 0, failures: [] },
      { orientation: "opponent-front", rows: 124, matched: 124, residualPixels: 0, failures: [] },
    ];
    expect(inspectSandTombFramebuffer()).toEqual(expected);
    expect(inspectSandTombFramebuffer()).toEqual(expected);
  }, 60_000);

  it("accepts live species and geometry outside the retained visual pair", () => {
    const evidence = sandTombConfigFor("player-back");
    const generic: SceneOnSandTombConfig = {
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
    };
    const stage = createSceneOnMovePresentation(generic);
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 52 },
    })).toHaveLength(240 * 160 * 4);
  });
});
