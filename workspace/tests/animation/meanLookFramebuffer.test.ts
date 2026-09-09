import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnMeanLookConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  meanLookConfigFor,
  verifyMeanLookFramebuffer,
} from "../../tools/compare/meanLookFramebuffer.ts";

describe("MOVE_MEAN_LOOK production framebuffer", () => {
  it("matches all 342 retained bilateral rows through inactive cleanup", () => {
    expect(verifyMeanLookFramebuffer()).toEqual([
      {
        orientation: "player-back",
        componentRows: 171,
        seamRows: 171,
        rawRgbRows: 171,
        framebufferRows: 171,
        residualPixels: 0,
      },
      {
        orientation: "opponent-front",
        componentRows: 171,
        seamRows: 171,
        rawRgbRows: 171,
        framebufferRows: 171,
        residualPixels: 0,
      },
    ]);
  }, 30_000);

  it("keeps live art, side, and geometry outside the retained carrier", () => {
    const rows = JSON.parse(gunzipSync(readFileSync(
      "tools/compare/evidence/mean-look-player-dense-state.json.gz",
    )).toString()).frames;
    const evidence = meanLookConfigFor("player-back", rows);
    const generic: SceneOnMeanLookConfig = {
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
      sceneOnPresentation: { ...stage, age: 100 },
    })).toHaveLength(240 * 160 * 4);
  });

  it("promotes Mean Look alone and preserves named controls", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(244);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_MEAN_LOOK"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) => track.id === "mean-look-eye"))
      .toMatchObject({ fulfilled: true });
    for (const move of ["MOVE_PERISH_SONG", "MOVE_CONFUSE_RAY"]) {
      expect(coverage.entries.find((entry: { move: string }) => entry.move === move))
        .toMatchObject({ status: "exact" });
    }
  });
});
