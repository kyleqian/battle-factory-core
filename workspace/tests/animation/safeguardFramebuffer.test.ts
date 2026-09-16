import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnSafeguardConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  safeguardConfigFor,
  safeguardRowsFor,
  verifySafeguardFramebuffer,
} from "../../tools/compare/safeguardFramebuffer.ts";

describe("MOVE_SAFEGUARD shared production framebuffer", () => {
  it("matches every retained bilateral row through inactive cleanup twice", () => {
    const expected = [
      { orientation: "player-back", componentRows: 71, seamRows: 71,
        rawRgbRows: 71, framebufferRows: 71, residualPixels: 0 },
      { orientation: "opponent-front", componentRows: 71, seamRows: 71,
        rawRgbRows: 71, framebufferRows: 71, residualPixels: 0 },
    ];
    expect(verifySafeguardFramebuffer()).toEqual(expected);
    expect(verifySafeguardFramebuffer()).toEqual(expected);
  }, 30_000);

  it("uses live species, side, and geometry outside the retained carrier pair", () => {
    const evidence = safeguardConfigFor("player-back", safeguardRowsFor("player-back"));
    const generic: SceneOnSafeguardConfig = {
      ...evidence,
      attacker: {
        ...evidence.attacker,
        species: "ARON",
        geometry: {
          ...evidence.attacker.geometry,
          spriteCorner: { x: 34, y: 57 },
          animationCenter: { x: 66, y: 89 },
          battlePositionCenter: { x: 66, y: 81 },
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
    };
    const stage = createSceneOnMovePresentation(generic);
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 20 },
    })).toHaveLength(240 * 160 * 4);
  });

  it("promotes Safeguard alone and preserves the named independent controls", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(257);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_SAFEGUARD"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) => track.id === "guard-ring-safeguard"))
      .toMatchObject({ fulfilled: true });
    for (const move of ["MOVE_SWEET_SCENT", "MOVE_BARRIER", "MOVE_LIGHT_SCREEN"]) {
      expect(coverage.entries.find((entry: { move: string }) => entry.move === move))
        .toMatchObject({ status: "exact" });
    }
  });
});
