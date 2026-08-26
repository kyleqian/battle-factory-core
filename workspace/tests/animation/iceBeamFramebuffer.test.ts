import { describe, expect, it } from "vitest";
import { iceBeamProfileFor } from "../../src/animation/iceBeam.ts";
import {
  createSceneOnMovePresentation,
  type SceneOnIceBeamConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  iceBeamConfigFor,
  inspectIceBeamFramebuffer,
} from "../../tools/compare/iceBeamFramebuffer.ts";

describe("MOVE_ICE_BEAM shared production framebuffer", () => {
  it("matches every retained bilateral row twice through first inactive cleanup", () => {
    const expected = [
      { orientation: "player-back", rows: 203, matched: 203, residualPixels: 0, failures: [] },
      { orientation: "opponent-front", rows: 203, matched: 203, residualPixels: 0, failures: [] },
    ];
    expect(inspectIceBeamFramebuffer()).toEqual(expected);
    expect(inspectIceBeamFramebuffer()).toEqual(expected);
  }, 60_000);

  it("accepts unrelated live species and geometry without a retained-pair gate", () => {
    const evidence = iceBeamConfigFor("player-back");
    const generic: SceneOnIceBeamConfig = {
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
      target: {
        ...evidence.target,
        species: "GROVYLE",
        geometry: {
          ...evidence.target.geometry,
          spriteCorner: { x: 146, y: 12 },
          animationCenter: { x: 178, y: 44 },
          battlePositionCenter: { x: 178, y: 40 },
        },
      },
      animationProfile: iceBeamProfileFor("player-back", {
        geometry: {
          attackerPictureOffset: { x: 67, y: 91 },
          targetPictureOffset: { x: 178, y: 44 },
          targetCenter: { x: 178, y: 44 },
          monbgBaseHofs: 366,
          monbgBaseVofs: 500,
        },
      }),
    };
    const stage = createSceneOnMovePresentation(generic);
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 109 },
    })).toHaveLength(240 * 160 * 4);
  });
});
