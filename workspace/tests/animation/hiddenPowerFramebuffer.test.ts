import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createSceneOnMovePresentation, type SceneOnHiddenPowerConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { hiddenPowerConfigFor, hiddenPowerRowsFor } from "../../tools/compare/hiddenPowerFixture.ts";
import { verifyHiddenPowerFramebuffer } from "../../tools/compare/hiddenPowerFramebuffer.ts";

describe("MOVE_HIDDEN_POWER actual-core production framebuffer", () => {
  it("matches all 360 retained rows with zero residual pixels twice", () => {
    const expected = [
      { orientation: "player-back", componentRows: 180, seamRows: 180, rawRgbRows: 180, framebufferRows: 180, residualPixels: 0 },
      { orientation: "opponent-front", componentRows: 180, seamRows: 180, rawRgbRows: 180, framebufferRows: 180, residualPixels: 0 },
    ];
    expect(verifyHiddenPowerFramebuffer()).toEqual(expected);
    expect(verifyHiddenPowerFramebuffer()).toEqual(expected);
  }, 30_000);

  it("uses altered non-Unown species, sides, geometry, allocator, order, and personality facts", () => {
    const evidence = hiddenPowerConfigFor("player-back", hiddenPowerRowsFor("player-back"));
    const slots = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
    const altered: SceneOnHiddenPowerConfig = {
      ...evidence,
      attacker: {
        species: "ARON",
        geometry: {
          side: "opponent", spriteCorner: { x: 139, y: 18 },
          animationCenter: { x: 171, y: 50 }, battlePositionCenter: { x: 171, y: 43 },
        },
      },
      target: {
        species: "GROVYLE",
        geometry: {
          side: "player", spriteCorner: { x: 35, y: 49 },
          animationCenter: { x: 67, y: 81 }, battlePositionCenter: { x: 67, y: 79 },
        },
      },
      animationProfile: {
        ...evidence.animationProfile,
        attackerSubpriority: 47,
        targetSubpriority: 19,
        allocationSlots: slots,
        spriteOrderSeed: [18, 2, 24, 8, 28, 14, 4, 26, 10, 22, 6, 20, 12, 16],
        orbitMatrixNums: [2, 5, 8, 11, 14, 17],
        scatterMatrixNums: [1, 4, 7, 10, 13, 16, 19, 22],
        uninitializedScatterY: 73,
        attackerPersonality: 0x12345678,
        animationRngSeed: 0x89abcdef,
      },
    };
    const stage = createSceneOnMovePresentation(altered);
    const frame = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 125 } });
    const canonical = createSceneOnMovePresentation(evidence);
    const canonicalFrame = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...canonical, age: 125 } });
    expect(frame).toHaveLength(240 * 160 * 4);
    expect(frame).not.toEqual(canonicalFrame);
    expect(stage.config.attacker).toMatchObject({ species: "ARON", geometry: altered.attacker.geometry });
    expect(stage.config.target).toMatchObject({ species: "GROVYLE", geometry: altered.target.geometry });
    expect(stage.config.animationProfile).not.toEqual(evidence.animationProfile);
  });

  it("promotes Hidden Power alone and fulfills only its dedicated track", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(237);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_HIDDEN_POWER")).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) => track.id === "hidden-power-red-orbs")).toMatchObject({ fulfilled: true });
  });
});
