import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  sceneOnStockpileView,
  type SceneOnStockpileConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  stockpileConfigFor,
  stockpileRowsFor,
  verifyStockpileFramebuffer,
} from "../../tools/compare/stockpileFramebuffer.ts";

describe("MOVE_STOCKPILE source presentation and actual-core compositor", () => {
  it("matches all 198 retained component/seam/framebuffer rows twice", () => {
    const expected = [
      { orientation: "player-back", componentRows: 99, seamRows: 99,
        rawRgbRows: 99, framebufferRows: 99, residualPixels: 0 },
      { orientation: "opponent-front", componentRows: 99, seamRows: 99,
        rawRgbRows: 99, framebufferRows: 99, residualPixels: 0 },
    ];
    expect(verifyStockpileFramebuffer()).toEqual(expected);
    expect(verifyStockpileFramebuffer()).toEqual(expected);
  }, 30_000);

  it("uses altered live species, side, geometry, allocator, order, and matrices", () => {
    const evidence = stockpileConfigFor("player-back", stockpileRowsFor("player-back"));
    const generic: SceneOnStockpileConfig = {
      ...evidence,
      attacker: {
        species: "ARON",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 143, y: 9 },
          animationCenter: { x: 175, y: 41 },
          battlePositionCenter: { x: 175, y: 39 },
        },
      },
      target: {
        species: "GROVYLE",
        geometry: {
          side: "player",
          spriteCorner: { x: 37, y: 54 },
          animationCenter: { x: 69, y: 86 },
          battlePositionCenter: { x: 69, y: 79 },
        },
      },
      attackerPictureCenter: { x: 175, y: 45 },
      attackerPictureYOffset: 8,
      animationProfile: {
        orbSlotPool: [10, 11, 12, 13, 14],
        orbMatrixPool: [7, 8, 9, 10, 11],
        spriteOrderSeed: [14, 12, 10, 13, 11],
        attackerSubpriority: 37,
      },
      attackerShadowAtEntry: false,
    };
    const stage = createSceneOnMovePresentation(generic);
    const view = sceneOnStockpileView({ ...stage, age: 20 });
    expect(view.attacker.species).toBe("ARON");
    expect(view.attacker.geometry.side).toBe("opponent");
    expect(view.orbs.map((orb) => orb.slot)).toEqual([11, 12, 13, 14, 10]);
    expect(view.orbs.map((orb) => orb.matrixNum)).toEqual([8, 9, 10, 11, 7]);
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 20 },
    })).toHaveLength(240 * 160 * 4);
  });

  it("promotes Stockpile alone and leaves Swallow and Spit Up as controls", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(238);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_STOCKPILE"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "stockpile-gray-orb-absorption")).toMatchObject({ fulfilled: true });
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_SWALLOW"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_SPIT_UP"))
      .toBeUndefined();
  });
});
