import { describe, expect, it } from "vitest";
import {
  SLUDGE_POISON_BUBBLE_OFFSETS,
  SLUDGE_POISON_BUBBLE_START_AGES,
  sludgeEffectAtAge,
} from "../../src/animation/sludge.ts";

describe("MOVE_SLUDGE source-relative reducer", () => {
  const player = (age: number) =>
    sludgeEffectAtAge(age, "player", { x: 72, y: 100 }, { x: 176, y: 42 });

  it("ports the 40-callback sludge projectile arc and attacker mirroring", () => {
    expect(player(0).sprites[0]).toMatchObject({
      kind: "projectile", x: 94, y: 96, xScale: 191, yScale: 191,
    });
    expect(player(39).sprites.some((sprite) => sprite.kind === "projectile")).toBe(true);
    expect(player(40).sprites.some((sprite) => sprite.kind === "projectile")).toBe(false);
    expect(sludgeEffectAtAge(
      0, "opponent", { x: 176, y: 52 }, { x: 72, y: 88 },
    ).sprites[0]!.x).toBeLessThan(176);
  });

  it("ports all six literal PoisonBubblesEffect spawns and callbacks", () => {
    expect(SLUDGE_POISON_BUBBLE_START_AGES).toEqual([41, 49, 57, 65, 73, 81]);
    expect(SLUDGE_POISON_BUBBLE_OFFSETS).toEqual([
      { x: 10, y: 10 }, { x: 20, y: -20 }, { x: -20, y: 15 },
      { x: 0, y: 0 }, { x: -20, y: -20 }, { x: 16, y: -8 },
    ]);
    expect(SLUDGE_POISON_BUBBLE_START_AGES.map((age, index) =>
      player(age).sprites.some((sprite) =>
        sprite.kind === "poisonBubble" && sprite.spawnIndex === index
      )
    )).toEqual([true, true, true, true, true, true]);
    expect(player(41).sprites[0]).toMatchObject({
      kind: "poisonBubble", x: 187, y: 52, xScale: 407, yScale: 407,
    });
    expect(player(101).sprites).toHaveLength(1);
    expect(player(102).sprites).toHaveLength(0);
  });

  it("uses the literal target ShakeMon argv (3, 0, 5, 1)", () => {
    expect([40, 41, 42, 43, 44, 45, 46, 47, 48, 49].map(
      (age) => player(age).targetOffset.x2,
    )).toEqual([0, 0, 0, 3, 3, 0, 0, 3, 3, 0]);
  });
});
