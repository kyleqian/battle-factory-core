import { describe, expect, it } from "vitest";
import {
  DRAGON_BREATH_FIRE_LIFETIME,
  DRAGON_BREATH_FIRE_SPAWN_COUNT,
  CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY,
  dragonBreathFireSprites,
} from "../src/engine/dragonBreath.ts";

describe("DRAGON_BREATH fire-projectile reducer", () => {
  const pressTick = 2945;

  it("pins all eleven source spawns and the complete shared lifetime", () => {
    expect(DRAGON_BREATH_FIRE_SPAWN_COUNT).toBe(11);
    expect(DRAGON_BREATH_FIRE_LIFETIME).toBe(21);
    expect(dragonBreathFireSprites(3174, pressTick)).toEqual([]);
    expect(dragonBreathFireSprites(3175, pressTick)).toMatchObject([
      { spawnIndex: 0, age: 0, centerX: 77, centerY: 86 },
    ]);
    expect(dragonBreathFireSprites(3215, pressTick).some(({ spawnIndex, age }) =>
      spawnIndex === 10 && age === 0
    )).toBe(true);
    expect(dragonBreathFireSprites(3235, pressTick)).toMatchObject([
      { spawnIndex: 10, age: 20, centerX: 175, centerY: 45 },
    ]);
    expect(dragonBreathFireSprites(3236, pressTick)).toEqual([]);
  });

  it("pins frame cycling and the RAM-read affine matrix endpoints", () => {
    expect(dragonBreathFireSprites(3175, pressTick)[0]).toMatchObject({
      sheetFrame: 1,
      pa: -703,
      pb: -17,
      pc: 17,
      pd: -703,
      subpriority: 38,
      hFlip: true,
      vFlip: true,
      targetOnMonBg: true,
    });
    expect(dragonBreathFireSprites(3177, pressTick)[0]).toMatchObject({
      age: 2,
      sheetFrame: 2,
      pa: -549,
      pb: -13,
      pc: 13,
      pd: -549,
    });
    expect(dragonBreathFireSprites(3235, pressTick)[0]).toMatchObject({
      age: 20,
      sheetFrame: 2,
      pa: -184,
      pb: -4,
      pc: 4,
      pd: -184,
    });
  });

  it("returns equal-subpriority sprites in framebuffer back-to-front order", () => {
    const sprites = dragonBreathFireSprites(3195, pressTick);
    expect(sprites).toHaveLength(6);
    expect(sprites.map(({ centerY }) => centerY)).toEqual(
      [...sprites.map(({ centerY }) => centerY)].sort((a, b) => a - b),
    );
  });

  it("derives player-to-opponent translation from battler coordinates", () => {
    const shifted = dragonBreathFireSprites(3175, pressTick, {
      ...CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY,
      attackerCenter: { x: 60, y: 100 },
      targetCenter: { x: 160, y: 50 },
      targetSubpriority: 44,
      subpriorityOffset: 3,
    })[0]!;
    expect(shifted).toMatchObject({
      centerX: 65,
      centerY: 98,
      subpriority: 41,
      hFlip: true,
      vFlip: true,
      pa: -703,
      pb: -17,
      pc: 17,
      pd: -703,
    });
  });

  it("selects the source's opposite-side affine and animation variants", () => {
    const sprite = dragonBreathFireSprites(3175, pressTick, {
      ...CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY,
      attackerCenter: { x: 176, y: 44 },
      targetCenter: { x: 72, y: 88 },
      attackerSide: "opponent",
      targetSubpriority: 30,
    })[0]!;
    expect(sprite).toMatchObject({
      centerX: 171,
      centerY: 46,
      subpriority: 28,
      hFlip: false,
      vFlip: false,
      pa: 704,
      pb: 0,
      pc: 0,
      pd: 704,
      targetOnMonBg: true,
    });
  });

  it("rejects unproved affine durations instead of fitting a new table", () => {
    expect(() => dragonBreathFireSprites(3175, pressTick, {
      ...CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY,
      duration: 12,
    })).toThrow(/affine evidence currently requires duration 20/);
  });
});
