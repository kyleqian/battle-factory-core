import { describe, expect, it } from "vitest";
import {
  WHIRLPOOL_MAIN_FRAME_COUNT,
  WHIRLPOOL_RESIDUAL_FRAME_COUNT,
  whirlpoolAtAge,
} from "../../src/animation/whirlpool.ts";
import {
  createSceneOnMovePresentation,
  sceneOnWhirlpoolView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_WHIRLPOOL source-relative reducer", () => {
  const target = { x: 176, y: 40 };
  const main = (age: number) =>
    whirlpoolAtAge(age, "main", "opponent", target);
  const residual = (age: number) =>
    whirlpoolAtAge(age, "residual", "opponent", target);

  it("ports three main bursts and two residual bursts independently", () => {
    expect(Array.from({ length: 18 }, (_, spawnIndex) => {
      const age = 9 + Math.floor(spawnIndex / 6) * 24
        + (spawnIndex % 6) * 4;
      return main(age).orbs.filter((orb) =>
        orb.spawnIndex === spawnIndex).length;
    })).toEqual(Array(18).fill(1));
    expect(Array.from({ length: 12 }, (_, spawnIndex) => {
      const age = 8 + Math.floor(spawnIndex / 6) * 24
        + (spawnIndex % 6) * 4;
      return residual(age).orbs.filter((orb) =>
        orb.spawnIndex === spawnIndex).length;
    })).toEqual(Array(12).fill(1));
    expect(main(9).orbs[0]).toMatchObject({
      spawnIndex: 0,
      oamSlot: 4,
      x: 176,
      y: 68,
      x2: 0,
      y2: -1,
      frame: 1,
      matrix: { a: 337, b: 0, c: 0, d: 346 },
    });
    expect(residual(8).orbs[0]).toMatchObject({
      spawnIndex: 0,
      oamSlot: 4,
      x: 176,
      y: 68,
      x2: 0,
      y2: 0,
      frame: 0,
      matrix: { a: 341, b: 0, c: 0, d: 341 },
    });
  });

  it("keeps the distinct shake, palette, audio, and cleanup contracts", () => {
    expect(main(9)).toMatchObject({
      targetShakeActive: true,
      targetPaletteBlendY: 0,
      whirlpoolAudio: { pan: 63, flags: 131 },
      registers: { bldcnt: 16192, bldalpha: 2060 },
    });
    expect(main(26).targetPaletteBlendY).toBe(7);
    expect(main(100).targetPaletteBlendY).toBe(5);
    expect(main(106).targetShakeActive).toBe(true);
    expect(main(107).targetShakeActive).toBe(false);
    expect(residual(66).targetShakeActive).toBe(true);
    expect(residual(67).targetShakeActive).toBe(false);
    expect(residual(76).targetPaletteBlendY).toBe(5);
    expect(whirlpoolAtAge(8, "residual", "player", target)
      .whirlpoolAudio).toEqual({ pan: -64, flags: 131 });
    expect(main(WHIRLPOOL_MAIN_FRAME_COUNT - 1)).toMatchObject({
      active: false,
      waterOrbLoaded: false,
      visualTaskCount: 0,
      orbs: [],
    });
    expect(residual(WHIRLPOOL_RESIDUAL_FRAME_COUNT - 1)).toMatchObject({
      active: false,
      waterOrbLoaded: false,
      visualTaskCount: 0,
      orbs: [],
    });
  });

  it("exposes both bodies through one narrow typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "WHIRLPOOL",
      body: "residual",
      attacker: {
        species: "WAILMER",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 69 },
          animationCenter: { x: 72, y: 101 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: target,
        },
      },
      fieldProfile: {
        playerHp: 194,
        playerMaxHp: 205,
        opponentHp: 80,
        opponentMaxHp: 142,
      },
    });
    const view = sceneOnWhirlpoolView({ ...stage, age: 32 });
    expect(view).toMatchObject({
      body: "residual",
      attacker: { species: "WAILMER" },
      target: { species: "ONIX" },
    });
    expect(view.orbs).toEqual(expect.arrayContaining([
      expect.objectContaining({ spawnIndex: 6, oamSlot: 3 }),
    ]));
  });
});
