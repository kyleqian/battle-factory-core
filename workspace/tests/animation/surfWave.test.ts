import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import asset from "../../src/animation/assets/surf-wave.json" with { type: "json" };
import { SURF_WAVE_FRAME_COUNT, surfWaveAtAge } from "../../src/animation/surfWave.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSurfView,
  type SceneOnSurfConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

describe("visualCommand:create_surf_wave source checkpoint", () => {
  it("extracts exactly the Factory-required water assets and source dispatch", () => {
    expect(asset.source.carriers[0]).toContain("WARTORTLE_2 set 281");
    expect(asset.source.carriers[1]).toContain("MARSHTOMP_2 set 295");
    expect(asset.source.excluded).toContain("no software sprite");
    expect(asset.water).toMatchObject({ columns: 16, rows: 16 });
    expect(asset.playerTilemap).toMatchObject({ width: 64, height: 32 });
    expect(asset.playerTilemap.entries).toHaveLength(2048);
    expect(asset.opponentTilemap).toMatchObject({ width: 64, height: 32 });
    expect(asset.opponentTilemap.entries).toHaveLength(2048);
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-surf-wave-assets-"));
    const output = join(scratch, "surf-wave.json");
    execFileSync("node", ["--experimental-strip-types", resolve("tools/compare/extractSurfWaveAssets.ts"), "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync(resolve("src/animation/assets/surf-wave.json")));
    const audit = execFileSync("node", ["--experimental-strip-types", resolve("tools/compare/surfWaveSourceAudit.ts")], { encoding: "utf8" });
    expect(audit).toContain("BATTLE_ENVIRONMENT_BUILDING dispatches Move_STRENGTH");
    expect(audit).toContain("MUDDY_WATER");
  });

  it("ports both side-relative scroll/scanline geometries and alpha lifecycle", () => {
    expect(SURF_WAVE_FRAME_COUNT).toBe(144);
    expect(surfWaveAtAge(4, "player")).toMatchObject({
      controllerPhase: "wave", bgLoaded: true,
      bgScroll: { x: 0, y: 464 },
      blend: { eva: 1, evb: 15 },
      scanline: { lower: 48, upper: 112 },
    });
    expect(surfWaveAtAge(4, "opponent")).toMatchObject({
      bgScroll: { x: 0, y: 0 },
      scanline: { lower: 0, upper: 1 },
    });
    expect(surfWaveAtAge(30, "player")).toMatchObject({
      blend: { eva: 13, evb: 3 },
      soundRestart: "SE_M_SURF", soundPan: -62,
    });
    expect(surfWaveAtAge(30, "opponent").soundPan).toBe(61);
    expect(surfWaveAtAge(136, "player")).toMatchObject({
      controllerPhase: "clear", blend: { eva: 0, evb: 16 },
    });
    expect(surfWaveAtAge(143, "player")).toMatchObject({
      active: false, controllerPhase: "inactive", bgLoaded: false,
      bgScroll: { x: 0, y: 0 },
    });
  });

  it("exposes Surf only through relative age, side geometry, and field chrome", () => {
    const config: SceneOnSurfConfig = {
      move: "SURF",
      attacker: {
        species: "WARTORTLE",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 48 },
          animationCenter: { x: 72, y: 80 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "SHUCKLE",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 17 },
          animationCenter: { x: 176, y: 49 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 134, playerMaxHp: 134,
        opponentHp: 127, opponentMaxHp: 127,
      },
    };
    const stage = createSceneOnMovePresentation(config);
    expect(sceneOnSurfView({ ...stage, age: 52 })).toMatchObject({
      age: 52, attacker: { species: "WARTORTLE" },
      target: { species: "SHUCKLE" },
      scanline: { lower: 0, upper: 112 }, paletteRotations: 12,
    });
  });

  it("composites BG1 through the shared framebuffer and clears exactly", () => {
    const config: SceneOnSurfConfig = {
      move: "SURF",
      attacker: {
        species: "WARTORTLE",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 58 },
          animationCenter: { x: 72, y: 90 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "SHUCKLE",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 17 },
          animationCenter: { x: 176, y: 49 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 134, playerMaxHp: 134,
        opponentHp: 127, opponentMaxHp: 127,
      },
    };
    const stage = createSceneOnMovePresentation(config);
    const frame = (age: number) => render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    });
    const digest = (bytes: Uint8Array) =>
      createHash("sha256").update(bytes).digest("hex");
    expect(frame(52)).toHaveLength(240 * 160 * 4);
    expect(digest(frame(52))).not.toBe(digest(frame(0)));
    expect(digest(frame(143))).toBe(digest(frame(0)));
  });
});
