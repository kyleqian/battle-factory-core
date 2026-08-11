import { describe, expect, it } from "vitest";
import {
  GUILLOTINE_IMPACT_FIRST_AGE,
  GUILLOTINE_LONG_SHAKE_FIRST_AGE,
  GUILLOTINE_OPPONENT_FRAME_COUNT,
  GUILLOTINE_PINCER_FIRST_AGE,
  GUILLOTINE_PLAYER_FRAME_COUNT,
  guillotineAtAge,
} from "../../src/animation/guillotine.ts";

const target = { x: 176, y: 42 };

describe("MOVE_GUILLOTINE source-relative reducer", () => {
  it("ports the close, 51-callback hold, and reversed open programs", () => {
    expect(guillotineAtAge(48, "opponent", target).pincers).toEqual([]);
    expect(guillotineAtAge(49, "opponent", target).pincers).toMatchObject([
      { x: 208, y: 10, x2: -2, y2: 2, tileOffset: 0, phase: "close" },
      { x: 144, y: 74, x2: 2, y2: -2, tileOffset: 0, phase: "close" },
    ]);
    expect(guillotineAtAge(55, "opponent", target).pincers).toMatchObject([
      { x: 192, y: 25, x2: 2, y2: -2, phase: "hold" },
      { x: 159, y: 58, x2: 2, y2: -2, phase: "hold" },
    ]);
    expect(guillotineAtAge(106, "opponent", target).pincers).toMatchObject([
      { x2: 0, y2: 0, hFlip: true, vFlip: true, phase: "open" },
      { x2: 0, y2: 0, hFlip: false, vFlip: false, phase: "open" },
    ]);
    expect(guillotineAtAge(113, "opponent", target).pincers).toEqual([]);
  });

  it("keeps both independently scheduled ShakeMon2 bodies and palette tasks", () => {
    expect([59, 60, 61, 62, 103, 104].map((age) =>
      guillotineAtAge(age, "opponent", target).targetOffset.x2,
    )).toEqual([0, -2, -2, 2, 2, 0]);
    expect([60, 61, 62, 63, 104, 105].map((age) =>
      guillotineAtAge(age, "opponent", target).displayedTargetOffset.x2,
    )).toEqual([0, -2, -2, 2, 2, 0]);
    expect([49, 52, 53, 95, 97, 98, 107, 108, 110, 111].map((age) =>
      guillotineAtAge(age, "opponent", target).targetBlackCoefficient,
    )).toEqual([0, 0, 1, 15, 15, 16, 16, 8, 8, 0]);
  });

  it("pins orientation-selected fade/restore and complete window boundaries", () => {
    expect([11, 12, 27, 28, 31, 32, 47, 48].map((age) =>
      guillotineAtAge(age, "opponent", target).background.bldy,
    )).toEqual([0, 1, 16, 16, 16, 15, 0, 0]);
    expect(guillotineAtAge(146, "opponent", target).background.kind).toBe("guillotine");
    expect(guillotineAtAge(147, "opponent", target).background.kind).toBe("field");
    expect(guillotineAtAge(145, "player", target).background.kind).toBe("guillotine");
    expect(guillotineAtAge(146, "player", target).background.kind).toBe("field");
    expect(guillotineAtAge(163, "opponent", target).active).toBe(true);
    expect(guillotineAtAge(164, "opponent", target).active).toBe(false);
    expect(guillotineAtAge(162, "player", target).active).toBe(true);
    expect(guillotineAtAge(163, "player", target).active).toBe(false);
    expect({
      GUILLOTINE_PLAYER_FRAME_COUNT,
      GUILLOTINE_OPPONENT_FRAME_COUNT,
      GUILLOTINE_PINCER_FIRST_AGE,
      GUILLOTINE_LONG_SHAKE_FIRST_AGE,
      GUILLOTINE_IMPACT_FIRST_AGE,
    }).toEqual({
      GUILLOTINE_PLAYER_FRAME_COUNT: 165,
      GUILLOTINE_OPPONENT_FRAME_COUNT: 164,
      GUILLOTINE_PINCER_FIRST_AGE: 49,
      GUILLOTINE_LONG_SHAKE_FIRST_AGE: 60,
      GUILLOTINE_IMPACT_FIRST_AGE: 108,
    });
  });
});
