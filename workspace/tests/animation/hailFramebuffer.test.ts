import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnHailConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  hailConfigFor,
  verifyHailFramebuffer,
} from "../../tools/compare/hailFramebuffer.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

describe("MOVE_HAIL production framebuffer", () => {
  it("regenerates the source-identity ANIM_TAG_HAIL asset byte-for-byte", () => {
    const outputPath = join(createScratchDir("pokebench-hail-assets-"), "hail.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractHailAssets.ts",
      "--out",
      outputPath,
    ]);
    expect(readFileSync(outputPath)).toEqual(
      readFileSync("src/animation/assets/hail.json"),
    );
  });

  it("matches all 316 retained bilateral rows through inactive cleanup", () => {
    expect(verifyHailFramebuffer()).toEqual([
      { orientation: "player-back", componentRows: 158, seamRows: 158, rawRgbRows: 158, framebufferRows: 158, residualPixels: 0 },
      { orientation: "opponent-front", componentRows: 158, seamRows: 158, rawRgbRows: 158, framebufferRows: 158, residualPixels: 0 },
    ]);
  }, 30_000);

  it("uses typed species/sides/geometry without a Delibird/Onix pair gate", () => {
    const fixture = JSON.parse(readFileSync(
      "tools/compare/fixtures/hail-evidence.json",
      "utf8",
    ));
    const rows = JSON.parse(gunzipSync(readFileSync(
      fixture.orientations["player-back"].denseState,
    )).toString()).frames;
    const evidence = hailConfigFor("player-back", rows);
    const generic: SceneOnHailConfig = {
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
      sceneOnPresentation: { ...stage, age: 80 },
    })).toHaveLength(240 * 160 * 4);
  });
});
