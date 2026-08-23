import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnTeeterDanceConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  teeterDanceConfigFor,
  verifyTeeterDanceFramebuffer,
} from "../../tools/compare/teeterDanceFramebuffer.ts";

describe("MOVE_TEETER_DANCE production framebuffer", () => {
  it("matches all 338 retained bilateral rows through inactive cleanup", () => {
    expect(verifyTeeterDanceFramebuffer()).toEqual([
      { orientation: "player-back", componentRows: 169, seamRows: 169, rawRgbRows: 169, framebufferRows: 169, residualPixels: 0 },
      { orientation: "opponent-front", componentRows: 169, seamRows: 169, rawRgbRows: 169, framebufferRows: 169, residualPixels: 0 },
    ]);
  }, 30_000);

  it("keeps typed live species art generic beyond the accepted carrier", () => {
    const receipt = JSON.parse(readFileSync(
      "tools/compare/fixtures/teeter-dance-evidence.json",
      "utf8",
    ));
    const rows = JSON.parse(gunzipSync(readFileSync(
      receipt.orientations["player-back"].denseState,
    )).toString()).frames;
    const evidence = teeterDanceConfigFor("player-back", rows);
    const generic: SceneOnTeeterDanceConfig = {
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
});
