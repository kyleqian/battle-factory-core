import { describe, expect, it } from "vitest";
import {
  SLUDGE_BOMB_HIT_OFFSETS,
  SLUDGE_BOMB_HIT_START_AGES,
  SLUDGE_BOMB_POISON_BUBBLE_FIRST_AGE,
  SLUDGE_BOMB_PROJECTILE_START_AGES,
  sludgeBombEffectAtAge,
} from "../../src/animation/sludgeBomb.ts";

describe("MOVE_SLUDGE_BOMB source-relative reducer", () => {
  const player = (age: number) => sludgeBombEffectAtAge(
    age, "player", { x: 72, y: 100 }, { x: 176, y: 42 },
  );

  it("reuses all ten delayed sludge projectiles", () => {
    expect(SLUDGE_BOMB_PROJECTILE_START_AGES).toEqual(
      [0, 5, 10, 15, 20, 25, 30, 35, 40, 45],
    );
    expect(player(45).sprites.filter((sprite) => sprite.kind === "projectile"))
      .toHaveLength(8);
    expect(player(85).sprites.some((sprite) => sprite.kind === "projectile"))
      .toBe(false);
  });

  it("ports the three literal four-particle hit batches", () => {
    expect(SLUDGE_BOMB_HIT_START_AGES).toEqual([50, 57, 64]);
    expect(SLUDGE_BOMB_HIT_OFFSETS).toHaveLength(12);
    expect(player(50).sprites.filter((sprite) => sprite.kind === "hitParticle"))
      .toHaveLength(4);
    expect(player(57).sprites.filter((sprite) => sprite.kind === "hitParticle"))
      .toHaveLength(8);
    expect(player(64).sprites.filter((sprite) => sprite.kind === "hitParticle"))
      .toHaveLength(12);
    expect(player(50).sprites.find((sprite) => sprite.kind === "hitParticle"))
      .toMatchObject({ x: 178, y: 43, xScale: 277, yScale: 277 });
    expect(player(84).sprites.some((sprite) => sprite.kind === "hitParticle"))
      .toBe(false);
  });

  it("ports ShakeMon2, palette cycle, waitsound boundary, and shared bubbles", () => {
    expect([49, 50, 51, 52, 53, 78, 79, 80].map(
      (age) => player(age).targetOffset.x2,
    )).toEqual([0, -3, -3, 3, 3, 0, 0, 0]);
    expect([52, 53, 68, 77, 78, 92, 96, 97].map(
      (age) => player(age).defenderPaletteY,
    )).toEqual([0, 2, 12, 10, 10, 0, 0, 0]);
    expect(SLUDGE_BOMB_POISON_BUBBLE_FIRST_AGE).toBe(98);
    expect(player(98).sprites.some((sprite) => sprite.kind === "poisonBubble"))
      .toBe(true);
    expect(player(158).sprites).toHaveLength(1);
    expect(player(159).sprites).toHaveLength(0);
  });
});
