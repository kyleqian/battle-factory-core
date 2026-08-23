import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnSpikesConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  spikesConfigFor,
  verifySpikesFramebuffer,
} from "../../tools/compare/spikesFramebuffer.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

describe("MOVE_SPIKES production framebuffer", () => {
  it("regenerates source-identity ANIM_TAG_SPIKES art byte-for-byte", () => {
    const outputPath = join(createScratchDir("pokebench-spikes-assets-"), "spikes.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractSpikesAssets.ts",
      "--out",
      outputPath,
    ]);
    expect(readFileSync(outputPath)).toEqual(readFileSync("src/animation/assets/spikes.json"));
  });

  it("matches all 228 retained bilateral rows through inactive cleanup", () => {
    expect(verifySpikesFramebuffer()).toEqual([
      { orientation: "player-back", componentRows: 114, seamRows: 114, rawRgbRows: 114, framebufferRows: 114, residualPixels: 0 },
      { orientation: "opponent-front", componentRows: 114, seamRows: 114, rawRgbRows: 114, framebufferRows: 114, residualPixels: 0 },
    ]);
  }, 30_000);

  it("uses typed species and geometry without a Qwilfish/Onix pair gate", () => {
    const fixture = JSON.parse(readFileSync("tools/compare/fixtures/spikes-evidence.json", "utf8"));
    const rows = JSON.parse(gunzipSync(readFileSync(
      fixture.orientations["player-back"].denseState,
    )).toString()).frames;
    const evidence = spikesConfigFor("player-back", rows);
    const generic: SceneOnSpikesConfig = {
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
