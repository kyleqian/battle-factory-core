import { describe, expect, it } from "vitest";
import {
  firePunchFistVisible,
  firePunchParticlesInDrawOrder,
  firePunchResolutionState,
  firePunchSpiralParticles,
  firePunchSpreadParticles,
  firePunchTargetBlendCoeff,
} from "../src/engine/firePunch.ts";
import ember from "../src/assets/gen/battle-anim-small-ember.json" with { type: "json" };
import hands from "../src/assets/gen/battle-anim-hands-and-feet.json" with { type: "json" };

describe("FIRE_PUNCH source-derived reducers", () => {
  it("pins the delay-2 red ramp and delay-0 restore", () => {
    expect([45, 46, 48, 49, 70, 114, 115, 122, 123].map(firePunchTargetBlendCoeff))
      .toEqual([0, 1, 1, 2, 9, 9, 8, 1, 0]);
  });

  it("pins all four spiral phases and its closed lifetime", () => {
    expect(firePunchSpiralParticles(40)).toEqual([]);
    expect(firePunchSpiralParticles(41).map(({ x, y, frame }) => [x, y, frame]))
      .toEqual([[188, 107, 1], [232, 38, 1], [163, -6, 1], [120, 69, 1]]);
    expect(firePunchSpiralParticles(70)).toHaveLength(4);
    expect(firePunchSpiralParticles(71)).toEqual([]);
  });

  it("pins the seven fixed-point spread vectors and fist lifetime", () => {
    expect(firePunchSpreadParticles(72).map(({ x, y }) => [x, y]))
      .toEqual([[176, 61], [175, 61], [176, 60], [175, 60], [176, 61], [175, 60], [176, 60]]);
    expect(firePunchSpreadParticles(73).map(({ x, y }) => [x, y]))
      .toEqual([[177, 62], [174, 62], [177, 59], [174, 60], [177, 61], [174, 60], [176, 60]]);
    expect(firePunchSpreadParticles(112)).toHaveLength(7);
    expect(firePunchSpreadParticles(113)).toEqual([]);
    expect([71, 72, 80, 81].map(firePunchFistVisible)).toEqual([false, true, true, false]);
    expect(firePunchParticlesInDrawOrder(72).map(({ x, y }) => [x, y]))
      .toEqual([[176, 60], [175, 60], [175, 60], [176, 60], [176, 61], [176, 61], [175, 61]]);
  });

  it("pins hit wobble/blink and the pre-write display drain", () => {
    expect(firePunchResolutionState(132)).toMatchObject({ healthboxY2: 0, targetInvisible: false });
    expect(firePunchResolutionState(133).healthboxY2).toBe(1);
    expect(firePunchResolutionState(134)).toMatchObject({ healthboxY2: -1, targetInvisible: true });
    expect(firePunchResolutionState(137).targetInvisible).toBe(true);
    expect(firePunchResolutionState(138).targetInvisible).toBe(false);
    expect(firePunchResolutionState(152).healthboxY2).toBe(-1);
    expect(firePunchResolutionState(153).healthboxY2).toBe(0);
    expect(firePunchResolutionState(168).displayedHp).toBe(141);
    expect(firePunchResolutionState(234).displayedHp).toBe(75);
    expect(firePunchResolutionState(235).displayedHp).toBe(75);
  });
});

describe("FIRE_PUNCH extracted assets", () => {
  it("pins the shared small-ember sheet and source animation metadata", () => {
    expect(ember.tileset).toMatchObject({ columns: 4, rows: 20 });
    expect(ember.tileset.tiles).toHaveLength(80);
    expect(ember.firePunchAnims).toMatchObject({
      frames: [1, 2, 3],
      frameDurationTicks: 4,
      spiral: { durationTicks: 30, radiusStart: 60, radiusDeltaFixed8: -512, angleStep: 9 },
      spread: { startYOffset: 10, durationTicks: 40 },
    });
  });

  it("pins the hands-and-feet sheet and FIRE_PUNCH's fist frame", () => {
    expect(hands.tileset).toMatchObject({ columns: 4, rows: 16 });
    expect(hands.tileset.tiles).toHaveLength(64);
    expect(hands.palette).toHaveLength(16);
    expect(hands.firePunchFist).toMatchObject({ frame: 0, durationArg: 8 });
  });
});
