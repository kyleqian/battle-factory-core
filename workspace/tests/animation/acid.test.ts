import { describe, expect, it } from "vitest";
import {
  ACID_BUBBLE_START_AGES,
  ACID_DROPLET_DURATIONS,
  ACID_DROPLET_START_AGES,
  acidEffectAtAge,
} from "../../src/animation/acid.ts";

describe("MOVE_ACID source-relative reducer", () => {
  const player = (age: number) =>
    acidEffectAtAge(age, "player", { x: 72, y: 97 }, { x: 176, y: 42 });

  it("ports all three literal mirrored 40-callback arc calls", () => {
    expect(ACID_BUBBLE_START_AGES).toEqual([0, 7, 14]);
    expect(ACID_BUBBLE_START_AGES.map((age, index) =>
      player(age).sprites.some((sprite) =>
        sprite.kind === "bubble" && sprite.spawnIndex === index
      )
    )).toEqual([true, true, true]);
    const opponent = acidEffectAtAge(
      0, "opponent", { x: 176, y: 52 }, { x: 72, y: 88 },
    );
    expect(player(0).sprites[0]!.x).toBeGreaterThan(72);
    expect(opponent.sprites[0]!.x).toBeLessThan(176);
    expect(player(53).sprites.filter((sprite) => sprite.kind === "bubble")).toHaveLength(1);
    expect(player(54).sprites.some((sprite) => sprite.kind === "bubble")).toBe(false);
  });

  it("ports all five delayed fixed-point and looping-affine droplets", () => {
    expect(ACID_DROPLET_START_AGES).toEqual([31, 43, 55, 67, 79]);
    expect(ACID_DROPLET_DURATIONS).toEqual([55, 55, 50, 45, 50]);
    expect(ACID_DROPLET_START_AGES.map((age, index) =>
      player(age).sprites.some((sprite) =>
        sprite.kind === "droplet" && sprite.spawnIndex === index
      )
    )).toEqual([true, true, true, true, true]);
    expect(player(31).sprites.find((sprite) => sprite.kind === "droplet"))
      .toMatchObject({ x: 176, y: 21, xScale: 292, yScale: 227 });
  });

  it("uses the literal target ShakeMon2 tuple and defender blend cycle", () => {
    expect([29, 30, 31, 32, 33, 48, 49].map((age) => player(age).targetOffset.x2))
      .toEqual([0, 2, -2, -2, 2, -2, 0]);
    expect(player(30).defenderPaletteY).toBe(0);
    expect(player(35).defenderPaletteY).toBeGreaterThan(0);
    expect(player(90).defenderPaletteY).toBe(0);
  });
});
