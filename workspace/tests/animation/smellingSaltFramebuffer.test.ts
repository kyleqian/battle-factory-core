import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnSmellingSaltConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  smellingSaltConfigFor,
  verifySmellingSaltFramebuffer,
} from "../../tools/compare/smellingSaltFramebuffer.ts";

describe("MOVE_SMELLING_SALT shared production framebuffer", () => {
  it("matches all 242 retained bilateral rows through first inactive cleanup", () => {
    expect(verifySmellingSaltFramebuffer()).toEqual([
      {
        orientation: "player-back",
        componentRows: 121,
        seamRows: 121,
        rawRgbRows: 121,
        changeMapRows: 121,
        framebufferRows: 121,
        residualPixels: 0,
      },
      {
        orientation: "opponent-front",
        componentRows: 121,
        seamRows: 121,
        rawRgbRows: 121,
        changeMapRows: 121,
        framebufferRows: 121,
        residualPixels: 0,
      },
    ]);
  }, 30_000);

  it("keeps live species and geometry outside the retained carrier pair", () => {
    const receipt = JSON.parse(readFileSync(
      "tools/compare/fixtures/smelling-salt-evidence.json",
      "utf8",
    ));
    const rows = JSON.parse(gunzipSync(readFileSync(
      receipt.orientations["player-back"].denseState,
    )).toString()).frames;
    const evidence = smellingSaltConfigFor("player-back", rows);
    const generic: SceneOnSmellingSaltConfig = {
      ...evidence,
      attacker: { ...evidence.attacker, species: "ARON" },
      target: { ...evidence.target, species: "GROVYLE" },
    };
    const stage = createSceneOnMovePresentation(generic);
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 12 },
    })).toHaveLength(240 * 160 * 4);
  });
});
