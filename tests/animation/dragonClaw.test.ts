import { describe, expect, it } from "vitest";
import {
  DRAGON_CLAW_END_AGE,
  dragonClawAtAge,
  dragonClawDisplayedAttackerShakeY,
  dragonClawFadedPaletteCoefficient,
  dragonClawFireSpinAtAge,
  dragonClawSlashesAtAge,
} from "../../src/animation/dragonClaw.ts";

const PLAYER = {
  attackerSide: "player",
  attackerCenter: { x: 72, y: 80 },
  targetCenter: { x: 176, y: 42 },
} as const;
const OPPONENT = {
  attackerSide: "opponent",
  attackerCenter: { x: 176, y: 40 },
  targetCenter: { x: 72, y: 80 },
} as const;

describe("Dragon Claw source reducer", () => {
  it("expands both DragonClawFireSpiral calls and every later fire sprite", () => {
    expect(dragonClawFireSpinAtAge(0, PLAYER)).toHaveLength(0);
    expect(dragonClawFireSpinAtAge(1, PLAYER)[0]).toMatchObject({
      spawnAge: 1, x: 72, y: 108, x2: 0, y2: -2,
      remaining: 29, angle: 13,
    });
    expect(dragonClawFireSpinAtAge(25, PLAYER).map((s) => s.spawnAge))
      .toContain(25);
    expect(dragonClawFireSpinAtAge(49, PLAYER).map((s) => s.spawnAge))
      .toContain(49);
    expect(dragonClawFireSpinAtAge(93, PLAYER).map((s) => s.spawnAge))
      .toContain(93);
    expect(dragonClawFireSpinAtAge(97, OPPONENT).at(-1))
      .toMatchObject({ x: 176 });
  });

  it("ports both paired claw slashes and their source animation direction", () => {
    expect(dragonClawSlashesAtAge(52, PLAYER)).toEqual([]);
    expect(dragonClawSlashesAtAge(53, PLAYER)).toEqual([
      { spawnAge: 53, x: 166, y: 32, animation: 0, animationFrame: 0 },
      { spawnAge: 53, x: 166, y: 52, animation: 0, animationFrame: 0 },
    ]);
    expect(dragonClawSlashesAtAge(69, PLAYER)[0]?.animationFrame).toBe(4);
    expect(dragonClawSlashesAtAge(69, PLAYER).find((s) => s.animation === 1))
      .toMatchObject({
      x: 186, animation: 1, animationFrame: 0,
    });
    expect(dragonClawSlashesAtAge(89, PLAYER)).toHaveLength(2);
    expect(dragonClawSlashesAtAge(90, PLAYER)).toEqual([]);
  });

  it("pins both lunge orientations, Y-shakes, sound events, and cleanup", () => {
    expect(dragonClawAtAge(49, PLAYER).attackerOffset.x2).toBe(4);
    expect(dragonClawAtAge(49, OPPONENT).attackerOffset.x2).toBe(-4);
    expect(dragonClawAtAge(54, PLAYER).targetGlobalY).toBe(4);
    expect(dragonClawAtAge(55, PLAYER).targetGlobalY).toBe(4);
    expect(dragonClawAtAge(56, PLAYER).targetGlobalY).toBe(0);
    expect(dragonClawAtAge(63, PLAYER).targetGlobalY).toBe(0);
    expect(dragonClawAtAge(53, PLAYER).soundEvents[0])
      .toMatchObject({ song: "SE_M_RAZOR_WIND", pan: 63 });
    expect(dragonClawAtAge(69, OPPONENT).soundEvents[0]?.pan).toBe(-63);
    expect(dragonClawAtAge(93, PLAYER).blendDirection).toBe("reverse");
    expect(dragonClawAtAge(136, PLAYER).blendDirection).toBeNull();
    expect([
      0, 0, 1, 7, 8, 8, 7, 1, 0,
    ]).toEqual([
      -1, 8, 9, 39, 44, 100, 101, 131, 136,
    ].map(dragonClawFadedPaletteCoefficient));
    expect(dragonClawAtAge(136, PLAYER).hardwarePaletteCoefficient).toBe(1);
    expect([0, 2, 0, 2, 2, 0, 0]).toEqual(
      [1, 2, 3, 5, 6, 7, 31].map(dragonClawDisplayedAttackerShakeY),
    );
    expect(dragonClawAtAge(DRAGON_CLAW_END_AGE + 1, PLAYER))
      .toMatchObject({ blendDirection: null, fireSpin: [], slashes: [] });
  });
});
