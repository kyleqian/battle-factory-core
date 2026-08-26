import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnEruptionConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  eruptionConfigFor,
  inspectEruptionFramebuffer,
} from "../../tools/compare/eruptionFramebuffer.ts";

describe("MOVE_ERUPTION shared production framebuffer", () => {
  it("matches every retained bilateral row twice through first inactive cleanup", () => {
    const expected = [
      { orientation: "player-back", rows: 476, matched: 476, residualPixels: 0, failures: [] },
      { orientation: "opponent-front", rows: 494, matched: 494, residualPixels: 0, failures: [] },
    ];
    expect(inspectEruptionFramebuffer()).toEqual(expected);
    expect(inspectEruptionFramebuffer()).toEqual(expected);
  }, 60_000);

  it("accepts live species and geometry outside the retained visual pair", () => {
    const evidence = eruptionConfigFor("player-back");
    const generic: SceneOnEruptionConfig = {
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
      sceneOnPresentation: { ...stage, age: 145 },
    })).toHaveLength(240 * 160 * 4);
  });
});
