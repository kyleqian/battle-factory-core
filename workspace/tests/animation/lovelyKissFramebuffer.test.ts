import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnLovelyKissConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  lovelyKissConfigFor,
  verifyLovelyKissFramebuffer,
} from "../../tools/compare/lovelyKissFramebuffer.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

describe("MOVE_LOVELY_KISS production framebuffer", () => {
  it("regenerates source-identity Devil and Pink Heart art byte-for-byte", () => {
    const outputPath = join(
      createScratchDir("pokebench-lovely-kiss-assets-"),
      "lovely-kiss.json",
    );
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractLovelyKissAssets.ts",
      "--out",
      outputPath,
    ]);
    expect(output.length).toBeGreaterThan(0);
    expect(readFileSync(outputPath)).toEqual(
      readFileSync("src/animation/assets/lovely-kiss.json"),
    );
  });

  it("matches all 306 retained bilateral rows through inactive cleanup", () => {
    expect(verifyLovelyKissFramebuffer()).toEqual([
      {
        orientation: "player-back",
        componentRows: 153,
        seamRows: 153,
        rawRgbRows: 153,
        framebufferRows: 153,
        residualPixels: 0,
      },
      {
        orientation: "opponent-front",
        componentRows: 153,
        seamRows: 153,
        rawRgbRows: 153,
        framebufferRows: 153,
        residualPixels: 0,
      },
    ]);
  }, 30_000);

  it("uses typed species and geometry without a Jynx/Onix evidence-pair gate", () => {
    const fixture = JSON.parse(readFileSync(
      "tools/compare/fixtures/lovely-kiss-evidence.json",
      "utf8",
    ));
    const rows = JSON.parse(gunzipSync(readFileSync(
      fixture.orientations["player-back"].denseState,
    )).toString()).frames;
    const evidence = lovelyKissConfigFor("player-back", rows);
    expect(evidence.target.geometry.spriteCorner).toEqual({ x: 145, y: 10 });
    const generic: SceneOnLovelyKissConfig = {
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
