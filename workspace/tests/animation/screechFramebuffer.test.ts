import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnScreechConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  screechConfigFor,
  verifyScreechFramebuffer,
} from "../../tools/compare/screechFramebuffer.ts";

describe("MOVE_SCREECH shared production framebuffer", () => {
  it("matches all 126 retained bilateral rows through first inactive cleanup", () => {
    expect(verifyScreechFramebuffer()).toEqual([
      {
        orientation: "player-back",
        componentRows: 63,
        seamRows: 63,
        rawRgbRows: 63,
        framebufferRows: 63,
        residualPixels: 0,
      },
      {
        orientation: "opponent-front",
        componentRows: 63,
        seamRows: 63,
        rawRgbRows: 63,
        framebufferRows: 63,
        residualPixels: 0,
      },
    ]);
  }, 30_000);

  it("keeps battler art, side, and geometry outside the retained carrier pair", () => {
    const fixture = JSON.parse(readFileSync(
      "tools/compare/fixtures/screech-evidence.json",
      "utf8",
    ));
    const rows = JSON.parse(gunzipSync(readFileSync(
      fixture.orientations["player-back"].denseState,
    )).toString()).frames;
    const evidence = screechConfigFor("player-back", rows);
    const generic: SceneOnScreechConfig = {
      ...evidence,
      attacker: {
        ...evidence.attacker,
        species: "ARON",
        geometry: {
          ...evidence.attacker.geometry,
          spriteCorner: { x: 38, y: 56 },
          animationCenter: { x: 70, y: 88 },
        },
      },
      target: {
        ...evidence.target,
        species: "GROVYLE",
        geometry: {
          ...evidence.target.geometry,
          spriteCorner: { x: 146, y: 12 },
          animationCenter: { x: 178, y: 44 },
        },
      },
    };
    const stage = createSceneOnMovePresentation(generic);
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 8 },
    })).toHaveLength(240 * 160 * 4);
  });

  it("promotes Screech alone while named shared controls remain independent", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(223);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_SCREECH"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "purple-ring-screech")).toMatchObject({ fulfilled: true });
    for (const move of ["MOVE_SUPERSONIC", "MOVE_METAL_SOUND"]) {
      expect(coverage.entries.find((entry: { move: string }) => entry.move === move))
        .toMatchObject({ status: "exact" });
    }
  });
});
