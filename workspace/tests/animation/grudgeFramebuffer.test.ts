import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createSceneOnMovePresentation, type SceneOnGrudgeConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { grudgeConfigFor, grudgeRowsFor, verifyGrudgeFramebuffer } from "../../tools/compare/grudgeFramebuffer.ts";

describe("MOVE_GRUDGE actual-core production framebuffer", () => {
  it("matches all 418 retained rows with zero residual pixels twice", () => {
    const expected = [
      { orientation: "player-back", componentRows: 209, seamRows: 209, rawRgbRows: 209, framebufferRows: 209, residualPixels: 0 },
      { orientation: "opponent-front", componentRows: 209, seamRows: 209, rawRgbRows: 209, framebufferRows: 209, residualPixels: 0 },
    ];
    expect(verifyGrudgeFramebuffer()).toEqual(expected);
    expect(verifyGrudgeFramebuffer()).toEqual(expected);
  }, 30_000);

  it("uses altered live species, geometry, allocation, ordering, and RNG through the same core path", () => {
    const evidence = grudgeConfigFor("player-back", grudgeRowsFor("player-back"));
    const altered: SceneOnGrudgeConfig = {
      ...evidence,
      attacker: { ...evidence.attacker, species: "ARON", geometry: { side: "opponent", spriteCorner: { x: 139, y: 18 }, animationCenter: { x: 171, y: 50 }, battlePositionCenter: { x: 171, y: 43 } } },
      target: { ...evidence.target, species: "GROVYLE", geometry: { side: "player", spriteCorner: { x: 35, y: 49 }, animationCenter: { x: 67, y: 81 }, battlePositionCenter: { x: 67, y: 79 } } },
      animationProfile: {
        ...evidence.animationProfile,
        flameSlots: [12, 2, 18, 4, 22, 1],
        spriteOrderSeed: [18, 1, 12, 22, 4, 2],
        attackerSubpriority: 47,
        targetSubpriority: 19,
        attackerBgPriority: 1,
        attackerWidth: 40,
        flameCenter: { x: 164, y: 47 },
        animationRngSeed: 0x12345678,
      },
    };
    const stage = createSceneOnMovePresentation(altered);
    const frame = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 83 } });
    const canonicalStage = createSceneOnMovePresentation(evidence);
    const canonicalFrame = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...canonicalStage, age: 83 } });
    expect(frame).toHaveLength(240 * 160 * 4);
    expect(frame).not.toEqual(canonicalFrame);
    expect(stage.config.attacker).toMatchObject({ species: "ARON", geometry: altered.attacker.geometry });
    expect(stage.config.target).toMatchObject({ species: "GROVYLE", geometry: altered.target.geometry });
    expect(stage.config.animationProfile).not.toEqual(evidence.animationProfile);
  });

  it("promotes Grudge alone and fulfills only its dedicated component track", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(224);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_GRUDGE")).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) => track.id === "grudge-purple-flames")).toMatchObject({ fulfilled: true });
  });
});
