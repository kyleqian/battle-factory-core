import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnTrickConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  inspectTrickFramebuffer,
  trickConfigFor,
} from "../../tools/compare/trickFramebuffer.ts";

describe("MOVE_TRICK shared production framebuffer", () => {
  it("matches every retained bilateral row twice through first inactive cleanup", () => {
    const expected = [
      { orientation: "player-back", rows: 225, matched: 225, residualPixels: 0, failures: [] },
      { orientation: "opponent-front", rows: 225, matched: 225, residualPixels: 0, failures: [] },
    ];
    expect(inspectTrickFramebuffer()).toEqual(expected);
    expect(inspectTrickFramebuffer()).toEqual(expected);
  }, 60_000);

  it("accepts live species and geometry outside the retained visual pair", () => {
    const evidence = trickConfigFor("player-back");
    const generic: SceneOnTrickConfig = {
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
