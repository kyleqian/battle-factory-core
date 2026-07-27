import { describe, expect, it } from "vitest";
import {
  EXPLOSION_BODY_LAST_AGE,
  explosionAtAge,
  explosionBackgroundBlendAtAge,
} from "../../src/animation/explosion.ts";

describe("MOVE_EXPLOSION complete source-component reducer", () => {
  const player = (age: number) =>
    explosionAtAge(age, "player", { x: 72, y: 80 });
  const opponent = (age: number) =>
    explosionAtAge(age, "opponent", { x: 176, y: 40 });

  it("reuses both literal five-sprite Explosion1 calls with mirrored geometry", () => {
    expect(player(0).explosions).toEqual([
      { spawnIndex: 0, age: 0, x: 72, y: 80, frame: 0 },
    ]);
    expect(player(8).explosions.at(-1)).toMatchObject({ x: 96, y: 56 });
    expect(opponent(8).explosions.at(-1)).toMatchObject({ x: 152, y: 16 });
    expect(player(72).explosions.some((sprite) => sprite.spawnIndex === 9)).toBe(true);
    expect(player(92).explosions).toHaveLength(0);
  });

  it("ports the distinct 8px/40-toggle ShakeMon2 program", () => {
    expect([0, 1, 2, 3, 76, 77, 78, 79].map((age) => player(age).battlerX2))
      .toEqual([-8, -8, 8, 8, -8, -8, 0, 0]);
  });

  it("ports complex BG alternation, cleanup gap, white hold, fade, and teardown", () => {
    expect([0, 7, 8, 16, 17, 25, 80, 89, 90, 92].map(
      explosionBackgroundBlendAtAge,
    )).toEqual([
      { kind: "red", coefficient: 8 },
      { kind: "red", coefficient: 8 },
      { kind: "black", coefficient: 8 },
      { kind: "black", coefficient: 8 },
      { kind: "red", coefficient: 8 },
      { kind: "red", coefficient: 8 },
      { kind: "black", coefficient: 8 },
      { kind: "black", coefficient: 8 },
      { kind: "none", coefficient: 0 },
      { kind: "none", coefficient: 0 },
    ]);
    expect(explosionBackgroundBlendAtAge(93)).toEqual({ kind: "white", coefficient: 16 });
    expect(explosionBackgroundBlendAtAge(150)).toEqual({ kind: "white", coefficient: 16 });
    expect(explosionBackgroundBlendAtAge(151)).toEqual({ kind: "white", coefficient: 15 });
    expect(explosionBackgroundBlendAtAge(207)).toEqual({ kind: "white", coefficient: 1 });
    expect(explosionBackgroundBlendAtAge(211)).toEqual({ kind: "none", coefficient: 0 });
    expect(EXPLOSION_BODY_LAST_AGE).toBe(211);
    expect(player(211)).toMatchObject({
      active: true,
      battlerX2: 0,
      explosions: [],
      backgroundBlend: { kind: "none", coefficient: 0 },
    });
    expect(player(212).active).toBe(false);
  });
});
