import { describe, expect, it } from "vitest";
import {
  LEER_CLEANUP_FIRST_AGE,
  LEER_SCALE_FIRST_AGE,
  LEER_SCALE_LAST_AGE,
  LEER_SHAKE_FIRST_AGE,
  LEER_SHAKE_LAST_AGE,
  LEER_SPRITE_FIRST_AGE,
  LEER_SPRITE_LAST_AGE,
  leerAtAge,
} from "../../src/animation/leer.ts";

describe("MOVE_LEER source-relative reducer", () => {
  it("keeps the measured eye-cell lifecycle and scale triangle", () => {
    expect([7, 8, 9, 11, 12, 14, 15, 17, 18, 22, 23].map((age) => {
      const sprite = leerAtAge(age, "player").sprite;
      return sprite.active ? sprite.tileOffset : null;
    })).toEqual([0, 0, 16, 16, 32, 32, 48, 48, 64, 64, null]);
    expect([7, 8, 16, 25, 26].map((age) => leerAtAge(age, "player").attackerScale))
      .toEqual([251, 246, 206, 251, 256]);
    expect([7, 8, 9].map((age) => leerAtAge(age, "player").displayedAttackerScale))
      .toEqual([256, 251, 246]);
    expect(leerAtAge(7, "player").sprite).toMatchObject({ x: 96, y: 76 });
    expect(leerAtAge(7, "opponent").sprite).toMatchObject({ x: 152, y: 34 });
  });

  it("uses the long ShakeMon2 +2 display latch and orientation baseline", () => {
    expect([38, 39, 40, 41, 42, 43, 55, 56].map((age) =>
      leerAtAge(age, "player").targetOffset.x2,
    )).toEqual([1, -1, -1, 1, 1, -1, 0, 0]);
    expect([38, 39, 40, 41, 42, 43, 44].map((age) =>
      leerAtAge(age, "player").displayedTargetOffset.x2,
    )).toEqual([1, 1, 1, -1, -1, 1, 1]);
    expect([38, 39, 40, 41, 42].map((age) =>
      leerAtAge(age, "opponent").displayedTargetOffset.x2,
    )).toEqual([0, 0, 1, -1, -1]);
    expect(leerAtAge(LEER_CLEANUP_FIRST_AGE, "player").blend).toBeNull();
    expect(leerAtAge(4, "player").audio).toEqual([
      { age: 4, song: "SE_M_LEER", pan: -64 },
    ]);
  });

  it("pins source component boundaries", () => {
    expect(LEER_SPRITE_FIRST_AGE).toBe(7);
    expect(LEER_SPRITE_LAST_AGE).toBe(22);
    expect(LEER_SCALE_FIRST_AGE).toBe(7);
    expect(LEER_SCALE_LAST_AGE).toBe(25);
    expect(LEER_SHAKE_FIRST_AGE).toBe(39);
    expect(LEER_SHAKE_LAST_AGE).toBe(54);
  });
});
