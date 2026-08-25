import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnBellyDrumConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  bellyDrumConfigFor,
  verifyBellyDrumFramebuffer,
} from "../../tools/compare/bellyDrumFramebuffer.ts";

describe("MOVE_BELLY_DRUM production framebuffer", () => {
  it("matches all 220 retained bilateral rows through inactive cleanup", () => {
    expect(verifyBellyDrumFramebuffer()).toEqual([
      { orientation: "player-back", componentRows: 110, seamRows: 110, rawRgbRows: 110, framebufferRows: 110, residualPixels: 0 },
      { orientation: "opponent-front", componentRows: 110, seamRows: 110, rawRgbRows: 110, framebufferRows: 110, residualPixels: 0 },
    ]);
  }, 30_000);

  it("keeps live species and geometry typed beyond the accepted carrier pair", () => {
    const receipt = JSON.parse(readFileSync(
      "tools/compare/fixtures/belly-drum-evidence.json",
      "utf8",
    ));
    const rows = JSON.parse(gunzipSync(readFileSync(
      receipt.orientations["player-back"].denseState,
    )).toString()).frames;
    const evidence = bellyDrumConfigFor("player-back", rows);
    const generic: SceneOnBellyDrumConfig = {
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
      attackerNoteOrigin: { x: 70, y: 96 },
    };
    const stage = createSceneOnMovePresentation(generic);
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 8 },
    })).toHaveLength(240 * 160 * 4);
  });

  it("promotes only Belly Drum and empties the move queue", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Record<string, any>;
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(210);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "partial"))
      .toEqual([]);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_BELLY_DRUM"))
      .toMatchObject({ status: "exact" });
    expect(coverage.queue).toEqual([]);
    expect(coverage.entries.filter((entry: { move: string }) => [
      "MOVE_SING", "MOVE_TEETER_DANCE", "MOVE_FAKE_TEARS", "MOVE_GRASS_WHISTLE",
    ].includes(entry.move))).toEqual(expect.arrayContaining([
      expect.objectContaining({ move: "MOVE_SING", status: "exact" }),
      expect.objectContaining({ move: "MOVE_TEETER_DANCE", status: "exact" }),
      expect.objectContaining({ move: "MOVE_FAKE_TEARS", status: "exact" }),
      expect.objectContaining({ move: "MOVE_GRASS_WHISTLE", status: "exact" }),
    ]));
  });
});
