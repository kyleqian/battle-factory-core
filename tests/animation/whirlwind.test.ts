import { describe, expect, it } from "vitest";
import { whirlwindAtAge } from "../../src/animation/whirlwind.ts";
import {
  createSceneOnMovePresentation,
  sceneOnWhirlwindView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_WHIRLWIND source reducer", () => {
  const player = (age: number) =>
    whirlwindAtAge(age, "player", "opponent", { x: 176, y: 40 });
  const opponent = (age: number) =>
    whirlwindAtAge(age, "opponent", "player", { x: 72, y: 80 });

  it("ports all six staggered gWhirlwindLineSpriteTemplate callbacks", () => {
    expect(player(3).lines).toEqual([]);
    expect(player(4).lines).toEqual([
      expect.objectContaining({ x: 144, y: 32, x2: 12, sheetFrame: 2, hFlip: false, data0: 1, remaining: 59 }),
      expect.objectContaining({ x: 144, y: 40, x2: 24, sheetFrame: 1, hFlip: true, data0: 2, remaining: 59 }),
      expect.objectContaining({ x: 144, y: 48, x2: 36, sheetFrame: 0, hFlip: true, data0: 3, remaining: 59 }),
      expect.objectContaining({ x: 144, y: 56, x2: 48, sheetFrame: 0, hFlip: false, data0: 4, remaining: 59 }),
      expect.objectContaining({ x: 144, y: 64, x2: 60, sheetFrame: 1, hFlip: false, data0: 5, remaining: 59 }),
      expect.objectContaining({ x: 144, y: 72, x2: 12, sheetFrame: 2, hFlip: false, data0: 1, remaining: 59 }),
    ]);
    expect(opponent(4).lines.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 48, y: 72 }, { x: 48, y: 80 }, { x: 48, y: 88 },
      { x: 48, y: 96 }, { x: 48, y: 104 }, { x: 48, y: 112 },
    ]);
    expect(player(63).lines).toHaveLength(6);
    expect(player(64).lines).toEqual([]);
  });

  it("ports ShakeMon2, ellipse, side-respecting slide, audio, and cleanup", () => {
    expect([11, 12, 13, 14, 37, 38, 39].map(
      (age) => player(age).targetOffset,
    )).toEqual([
      { x2: -4, y2: 0 }, { x2: -4, y2: 0 },
      { x2: 4, y2: 0 }, { x2: 4, y2: 0 },
      { x2: 4, y2: 0 }, { x2: 4, y2: 0 }, { x2: 0, y2: 0 },
    ]);
    expect([42, 43, 44, 45, 46, 47, 48].map(
      (age) => player(age).targetOffset,
    )).toEqual([
      { x2: 8, y2: 2 }, { x2: 12, y2: 6 },
      { x2: 8, y2: 11 }, { x2: 0, y2: 12 },
      { x2: -9, y2: 11 }, { x2: -12, y2: 6 },
      { x2: 0, y2: 0 },
    ]);
    expect(player(63).targetOffset).toEqual({ x2: 104, y2: 0 });
    expect(player(82).targetOffset).toEqual({ x2: 104, y2: 0 });
    expect(opponent(64).targetOffset).toEqual({ x2: -112, y2: 0 });
    expect(player(11).sound).toEqual({ id: "SE_M_DOUBLE_TEAM", pan: 63 });
    expect(opponent(51).sound).toEqual({ id: "SE_M_STRING_SHOT", pan: -63 });
    expect(player(81).active).toBe(true);
    expect(player(82).active).toBe(false);
  });

  it("exposes only relative age and explicit geometry through the typed seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "WHIRLWIND",
      attacker: {
        species: "BUTTERFREE",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 54 },
          animationCenter: { x: 72, y: 86 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 124, playerMaxHp: 124,
        opponentHp: 110, opponentMaxHp: 110,
      },
    });
    expect(sceneOnWhirlwindView({ ...stage, age: 42 })).toMatchObject({
      age: 42,
      attacker: { species: "BUTTERFREE" },
      target: { species: "ONIX" },
      targetOffset: { x2: 8, y2: 2 },
      lines: expect.any(Array),
    });
  });
});
