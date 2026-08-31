import { describe, expect, it } from "vitest";
import {
  HELPING_HAND_BLEND_CALLBACKS,
  HELPING_HAND_CLAP_CALLBACKS,
  HELPING_HAND_MOVEMENT_CALLBACKS,
  helpingHandAttackerX2AtTick,
  helpingHandClapAtTick,
  helpingHandPartnerBlendAtTick,
  helpingHandPartnerShakeAtTick,
} from "../../src/animation/helpingHand.ts";

describe("MOVE_HELPING_HAND source callback reducers", () => {
  it("ports the full two-hand clap state machine and its terminal cleanup", () => {
    expect(HELPING_HAND_CLAP_CALLBACKS).toBe(60);
    expect(helpingHandClapAtTick("left", 0)).toMatchObject({
      x: 100, y: 54, x2: 0, tileOffset: 0, hFlip: true,
    });
    expect(helpingHandClapAtTick("right", 0)).toMatchObject({
      x: 140, y: 58, x2: 0, tileOffset: 0, hFlip: false,
    });
    expect(helpingHandClapAtTick("left", 40)).toMatchObject({
      x: 92, y: 44, x2: -10, tileOffset: 0,
    });
    expect(helpingHandClapAtTick("left", 41)).toMatchObject({ tileOffset: 16 });
    expect(helpingHandClapAtTick("left", 58)).toMatchObject({
      x: 136, y: 56, x2: -31, tileOffset: 16,
    });
    expect(helpingHandClapAtTick("left", 59)).toBeNull();
    expect(helpingHandClapAtTick("right", 59)).toBeNull();
  });

  it("ports the bilateral attacker lunge plus all three partner effects", () => {
    expect(HELPING_HAND_MOVEMENT_CALLBACKS).toBe(61);
    expect([0, 12, 13, 18, 24, 30, 38, 43, 51, 56, 60].map((tick) =>
      helpingHandAttackerX2AtTick("player", tick),
    )).toEqual([0, 0, 3, 18, 0, 12, 0, -3, 5, 9, 0]);
    expect([13, 18, 30, 43, 51, 56].map((tick) =>
      helpingHandAttackerX2AtTick("opponent", tick),
    )).toEqual([-3, -18, -12, 3, -5, -9]);
    expect(HELPING_HAND_BLEND_CALLBACKS).toBe(24);
    expect([-1, 0, 11, 12, 22, 23, 24].map(helpingHandPartnerBlendAtTick))
      .toEqual([0, 1, 12, 11, 1, 0, 0]);
    expect([0, 1, 2, 3, 8, 9].map((tick) =>
      helpingHandPartnerShakeAtTick(0, tick),
    )).toEqual([2, -2, -2, 2, 2, 0]);
    expect([0, 1, 2, 19, 20].map((tick) =>
      helpingHandPartnerShakeAtTick(2, tick),
    )).toEqual([3, -3, -3, 0, 0]);
  });
});
