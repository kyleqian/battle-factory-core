import { describe, expect, it } from "vitest";
import { createSceneOnMovePresentation, type SceneOnRockBlastConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { inspectRockBlastFramebuffer, rockBlastConfigFor } from "../../tools/compare/rockBlastFramebuffer.ts";

describe("MOVE_ROCK_BLAST natural multi-body shared production framebuffer", () => {
  it("matches all retained bilateral bodies twice through every first inactive cleanup", () => {
    const expected = [
      { orientation: "player-back", rows: 270, matched: 270, residualPixels: 0, failures: [] },
      { orientation: "opponent-front", rows: 180, matched: 180, residualPixels: 0, failures: [] },
    ];
    expect(inspectRockBlastFramebuffer()).toEqual(expected);
    expect(inspectRockBlastFramebuffer()).toEqual(expected);
  }, 60_000);

  it("renders live altered species and geometry through core.ts", () => {
    const evidence = rockBlastConfigFor("player-back");
    const generic: SceneOnRockBlastConfig = {
      ...evidence,
      attacker: { ...evidence.attacker, species: "SURSKIT", geometry: { ...evidence.attacker.geometry, spriteCorner: { x: 35, y: 53 }, animationCenter: { x: 67, y: 85 }, battlePositionCenter: { x: 67, y: 79 } } },
      target: { ...evidence.target, species: "ARON" },
      bodies: evidence.bodies.map((body) => ({
        ...body,
        animationProfile: { ...body.animationProfile, attacker: { ...body.animationProfile.attacker, battlePositionCenter: { x: 67, y: 79 } } },
      })) as unknown as SceneOnRockBlastConfig["bodies"],
    };
    const stage = createSceneOnMovePresentation(generic);
    expect(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 24 } })).toHaveLength(240 * 160 * 4);
    expect(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 114 } })).toHaveLength(240 * 160 * 4);
  });
});
