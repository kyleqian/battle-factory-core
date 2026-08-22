import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnOctazookaConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  octazookaConfigFor,
  verifyOctazookaFramebuffer,
} from "../../tools/compare/octazookaFramebuffer.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

describe("MOVE_OCTAZOOKA production framebuffer", () => {
  it("regenerates source-identity Black Ball and Gray Smoke art byte-for-byte", () => {
    const outputPath = join(createScratchDir("pokebench-octazooka-assets-"), "octazooka.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractOctazookaAssets.ts",
      "--out",
      outputPath,
    ]);
    expect(readFileSync(outputPath)).toEqual(
      readFileSync("src/animation/assets/octazooka.json"),
    );
  });

  it("matches all 160 retained bilateral rows through inactive cleanup", () => {
    expect(verifyOctazookaFramebuffer()).toEqual([
      { orientation: "player-back", componentRows: 80, seamRows: 80, rawRgbRows: 80, framebufferRows: 80, residualPixels: 0 },
      { orientation: "opponent-front", componentRows: 80, seamRows: 80, rawRgbRows: 80, framebufferRows: 80, residualPixels: 0 },
    ]);
  }, 30_000);

  it("uses typed species and geometry without an Octillery/Onix pair gate", () => {
    const fixture = JSON.parse(readFileSync("tools/compare/fixtures/octazooka-evidence.json", "utf8"));
    const rows = JSON.parse(gunzipSync(readFileSync(
      fixture.orientations["player-back"].denseState,
    )).toString()).frames;
    const evidence = octazookaConfigFor("player-back", rows);
    const generic: SceneOnOctazookaConfig = {
      ...evidence,
      attacker: {
        ...evidence.attacker,
        species: "ARON",
        geometry: { ...evidence.attacker.geometry, spriteCorner: { x: 38, y: 56 }, animationCenter: { x: 70, y: 88 } },
      },
      target: {
        ...evidence.target,
        species: "GROVYLE",
        geometry: { ...evidence.target.geometry, spriteCorner: { x: 146, y: 12 }, animationCenter: { x: 178, y: 44 } },
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
