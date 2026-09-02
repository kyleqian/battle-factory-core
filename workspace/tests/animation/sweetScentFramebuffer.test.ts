import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  type SceneOnSweetScentConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import {
  sweetScentConfigFor,
  verifySweetScentFramebuffer,
} from "../../tools/compare/sweetScentFramebuffer.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

describe("MOVE_SWEET_SCENT production framebuffer", () => {
  it("regenerates the exact PINK_PETAL gfx and palette from pinned source", () => {
    const output = join(createScratchDir("pokebench-sweet-scent-assets-"), "sweet-scent.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractSweetScentAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/sweet-scent.json"),
    );
    expect(sha256(readFileSync(
      "reference/pokeemerald/graphics/battle_anims/sprites/pink_petal.png",
    ))).toBe("acb06f4aadc26b0d39550ba8a4c4033f495f65cca42bda3120465b46a03ab15f");
  });

  it("matches all 350 retained bilateral rows through inactive cleanup", () => {
    expect(verifySweetScentFramebuffer()).toEqual([
      { orientation: "player-back", componentRows: 175, seamRows: 175, rawRgbRows: 175, framebufferRows: 175, residualPixels: 0 },
      { orientation: "opponent-front", componentRows: 175, seamRows: 175, rawRgbRows: 175, framebufferRows: 175, residualPixels: 0 },
    ]);
  }, 30_000);

  it("renders typed live species and geometry beyond the evidence pair", () => {
    const fixture = JSON.parse(readFileSync(
      "tools/compare/fixtures/sweet-scent-evidence.json",
      "utf8",
    ));
    const rows = JSON.parse(gunzipSync(readFileSync(
      fixture.orientations["player-back"].denseState,
    )).toString()).frames;
    const evidence = sweetScentConfigFor("player-back", rows);
    const generic: SceneOnSweetScentConfig = {
      ...evidence,
      attacker: {
        ...evidence.attacker,
        species: "ARON",
        geometry: { ...evidence.attacker.geometry, spriteCorner: { x: 38, y: 56 } },
      },
      target: {
        ...evidence.target,
        species: "GROVYLE",
        geometry: { ...evidence.target.geometry, spriteCorner: { x: 146, y: 12 } },
      },
    };
    const stage = createSceneOnMovePresentation(generic);
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 96 },
    })).toHaveLength(240 * 160 * 4);
  });

  it("promotes Sweet Scent alone and fulfills only its one-move track", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(225);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_SWEET_SCENT"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "pink-petal-sweet-scent")).toMatchObject({ fulfilled: true });
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_CONFUSE_RAY"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_STUN_SPORE"))
      .toMatchObject({ status: "exact" });
  });
});
