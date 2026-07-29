import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { focusEnergyAtAge } from "../../src/animation/focusEnergy.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFocusEnergyView,
  type SceneOnFocusEnergyConfig,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_FOCUS_ENERGY source-relative reducer", () => {
  const player = (age: number) =>
    focusEnergyAtAge(age, "player", { x: 72, y: 80 });

  it("ports all three literal five-sprite EndureEffect calls", () => {
    expect(player(4).sprites).toEqual([
      expect.objectContaining({
        wave: 0,
        index: 0,
        oamSlot: 3,
        x: 48,
        y: 105,
        frame: 0,
        data0: 1,
        data1: 2,
      }),
    ]);
    expect(player(28).sprites.map((sprite) =>
      [sprite.oamSlot, sprite.index, sprite.frame]
    )).toEqual([
      [4, 1, 2],
      [5, 2, 1],
      [7, 3, 1],
      [9, 4, 0],
    ]);
    expect(player(38).sprites.some((sprite) =>
      sprite.wave === 1 && sprite.index === 0 && sprite.oamSlot === 3
    )).toBe(true);
    expect(player(72).sprites.some((sprite) =>
      sprite.wave === 2 && sprite.index === 0 && sprite.oamSlot === 3
    )).toBe(true);
    expect(player(120).sprites).toEqual([]);
  });

  it("ports white BlendColorCycle, attacker ShakeMon2, audio, and cleanup", () => {
    expect([38, 42, 62, 72, 88, 92, 97, 100].map((age) => ({
      age,
      palette: player(age).attackerPaletteY,
      x2: player(age).attackerX2,
      paletteTask: player(age).paletteTaskActive,
      shakeTask: player(age).shakeTaskActive,
    }))).toEqual([
      { age: 38, palette: 0, x2: -1, paletteTask: true, shakeTask: true },
      { age: 42, palette: 2, x2: -1, paletteTask: true, shakeTask: true },
      { age: 62, palette: 11, x2: -1, paletteTask: true, shakeTask: true },
      { age: 72, palette: 9, x2: 1, paletteTask: true, shakeTask: true },
      { age: 88, palette: 1, x2: 1, paletteTask: true, shakeTask: true },
      { age: 92, palette: 0, x2: 1, paletteTask: true, shakeTask: true },
      { age: 97, palette: 0, x2: 1, paletteTask: false, shakeTask: true },
      { age: 100, palette: 0, x2: 0, paletteTask: false, shakeTask: false },
    ]);
    expect(player(1).soundEvents).toEqual([{
      age: 1,
      song: "SE_M_DRAGON_RAGE",
      pan: -64,
      player: "SE1",
    }]);
    expect(focusEnergyAtAge(1, "opponent", { x: 176, y: 40 }).soundEvents[0])
      .toMatchObject({ pan: 63 });
    expect(player(39)).toMatchObject({
      attackerX2: -1,
      attackerShakeDisplayAge: 37,
      attackerDisplayX2: 1,
    });
    expect(player(40)).toMatchObject({
      attackerShakeDisplayAge: 38,
      attackerDisplayX2: -1,
    });
    expect(player(121)).toMatchObject({
      active: false,
      assetLoaded: false,
      scriptOffset: 63,
      visualTaskCount: 0,
    });
  });

  it("re-extracts only Taillow and FOCUS_ENERGY assets byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "focus-energy-assets-"));
    const output = join(scratch, "focus-energy.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractFocusEnergyAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/focus-energy.json"),
    );
  });

  it("exposes only typed resolved presentation geometry", () => {
    const stage = createSceneOnMovePresentation<SceneOnFocusEnergyConfig>({
      move: "FOCUS_ENERGY",
      attacker: {
        species: "TAILLOW",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 65 },
          animationCenter: { x: 72, y: 89 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      attackerCoord: { x: 72, y: 80 },
      fieldProfile: {
        playerHp: 126,
        playerMaxHp: 126,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    });
    expect(sceneOnFocusEnergyView({ ...stage, age: 38 })).toMatchObject({
      age: 38,
      attacker: { species: "TAILLOW" },
      target: { species: "ONIX" },
      visualTaskCount: 6,
      attackerX2: -1,
    });
    expect(() => sceneOnFocusEnergyView({
      ...stage,
      config: { ...stage.config, move: "CROSS_CHOP" },
      age: 0,
    } as never)).toThrow("expected FOCUS_ENERGY");
  });
});
