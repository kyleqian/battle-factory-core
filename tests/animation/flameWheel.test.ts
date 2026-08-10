import { describe, expect, it } from "vitest";
import {
  FLAME_WHEEL_LAST_AGE,
  flameWheelAtAge,
} from "../../src/animation/flameWheel.ts";

const PLAYER = { x: 72, y: 92 } as const;
const OPPONENT = { x: 176, y: 42 } as const;

describe("source-relative Flame Wheel reducer", () => {
  it("models the seven delayed fixed-point spirals and persistent OAM order", () => {
    expect(flameWheelAtAge(7, "player", PLAYER, OPPONENT).sprites).toEqual([]);
    expect(flameWheelAtAge(8, "player", PLAYER, OPPONENT).sprites).toMatchObject([
      { kind: "spiral", index: 0, slot: 3, centerX: 72, centerY: 92, sheetFrame: 0 },
    ]);
    expect(flameWheelAtAge(16, "player", PLAYER, OPPONENT).sprites).toHaveLength(2);
    expect(flameWheelAtAge(53, "player", PLAYER, OPPONENT).sprites.map((sprite) => sprite.slot))
      .toEqual([4, 9, 3, 10, 7, 5]);
  });

  it("models slide, ShakeMon, blend, FireSpread, and cleanup latches", () => {
    expect(flameWheelAtAge(4, "player", PLAYER, OPPONENT)).toMatchObject({
      targetOnMonBg: true,
      splitBgPriority: true,
      smallEmberTagLoaded: true,
    });
    expect(flameWheelAtAge(113, "player", PLAYER, OPPONENT).attackerOffset.x2).toBe(4);
    const impact = flameWheelAtAge(119, "player", PLAYER, OPPONENT);
    expect(impact).toMatchObject({
      attackerOffset: { x2: 24, y2: 0 },
      targetOffset: { x2: 0, y2: 0 },
      targetRedCoefficient: 1,
    });
    expect(impact.sprites.map((sprite) => sprite.slot)).toEqual([12, 7, 9, 11, 4, 5, 10]);
    expect(flameWheelAtAge(120, "player", PLAYER, OPPONENT).sprites.map((sprite) => sprite.slot))
      .toEqual([7, 12, 9, 11, 10, 4, 5]);
    expect(flameWheelAtAge(121, "player", PLAYER, OPPONENT).targetOffset.x2).toBe(5);
    expect(flameWheelAtAge(128, "player", PLAYER, OPPONENT).attackerOffset.x2).toBe(21);
    expect(flameWheelAtAge(160, "player", PLAYER, OPPONENT)).toMatchObject({
      sprites: [], targetOnMonBg: true, splitBgPriority: true,
    });
    expect(flameWheelAtAge(161, "player", PLAYER, OPPONENT)).toMatchObject({
      targetOnMonBg: false, splitBgPriority: false,
    });
    expect(flameWheelAtAge(169, "player", PLAYER, OPPONENT)).toMatchObject({
      smallEmberTagLoaded: false, active: true,
    });
    expect(flameWheelAtAge(FLAME_WHEEL_LAST_AGE + 1, "player", PLAYER, OPPONENT).active)
      .toBe(false);
  });

  it("mirrors only the attacker slide for the reverse orientation", () => {
    expect(flameWheelAtAge(113, "opponent", OPPONENT, PLAYER).attackerOffset.x2).toBe(-4);
    expect(flameWheelAtAge(119, "opponent", OPPONENT, PLAYER).attackerOffset.x2).toBe(-24);
    expect(flameWheelAtAge(128, "opponent", OPPONENT, PLAYER).attackerOffset.x2).toBe(-22);
  });
});
