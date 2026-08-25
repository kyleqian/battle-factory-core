import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnDefenseCurlConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  defenseCurlConfigFor,
  verifyDefenseCurlFramebuffer,
} from "../../tools/compare/defenseCurlFramebuffer.ts";

describe("MOVE_DEFENSE_CURL production framebuffer", () => {
  it("matches all 200 retained bilateral rows through inactive cleanup", () => {
    expect(verifyDefenseCurlFramebuffer()).toEqual([
      { orientation: "player-back", componentRows: 100, seamRows: 100, rawRgbRows: 100, framebufferRows: 100, residualPixels: 0 },
      { orientation: "opponent-front", componentRows: 100, seamRows: 100, rawRgbRows: 100, framebufferRows: 100, residualPixels: 0 },
    ]);
  }, 30_000);

  it("keeps live species, source y-offset, and geometry outside the evidence carrier", () => {
    const fixture = JSON.parse(readFileSync(
      "tools/compare/fixtures/defense-curl-evidence.json",
      "utf8",
    ));
    const rows = JSON.parse(gunzipSync(readFileSync(
      fixture.orientations["player-back"].denseState,
    )).toString()).frames;
    const evidence = defenseCurlConfigFor("player-back", rows);
    const generic: SceneOnDefenseCurlConfig = {
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
      animationProfile: { attackerPicYOffset: 10, attackerSubpriority: 30 },
    };
    const stage = createSceneOnMovePresentation(generic);
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 68 },
    })).toHaveLength(240 * 160 * 4);
  });

  it("promotes Defense Curl alone and preserves palette-command controls", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(210);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_DEFENSE_CURL"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "defense-curl-source-component")).toMatchObject({ fulfilled: true });
    for (const move of ["MOVE_PERISH_SONG", "MOVE_IRON_TAIL", "MOVE_POISON_TAIL"]) {
      expect(coverage.entries.find((entry: { move: string }) => entry.move === move))
        .toMatchObject({ status: "exact" });
    }
  });
});
