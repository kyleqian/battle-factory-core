import { describe, expect, it } from "vitest";
import {
  POISON_FANG_BUBBLE_START_AGES,
  poisonFangEffectAtAge,
  poisonFangTargetPaletteYAtAge,
} from "../../src/animation/poisonFang.ts";

describe("MOVE_POISON_FANG source-relative reducer", () => {
  const effect = (age: number) =>
    poisonFangEffectAtAge(age, "player", { x: 176, y: 42 });

  it("ports the fang frame and affine programs", () => {
    expect(effect(0).sprites[0]).toMatchObject({
      kind: "fang", frame: 0, xScale: 136, yScale: 136,
    });
    expect([7, 8, 23, 24, 27, 28, 31].map(
      (age) => effect(age).sprites[0]?.frame,
    )).toEqual([0, 1, 1, 2, 2, 3, 3]);
    expect(effect(32).sprites).toHaveLength(0);
  });

  it("ports ShakeMon and all six shared PoisonBubblesEffect spawns", () => {
    expect(POISON_FANG_BUBBLE_START_AGES).toEqual([33, 41, 49, 57, 65, 73]);
    expect([11, 12, 13, 14, 15, 30].map(
      (age) => effect(age).targetOffset.x2,
    )).toEqual([0, 0, 0, 3, 3, 0]);
    expect(POISON_FANG_BUBBLE_START_AGES.map((age, index) =>
      effect(age).sprites.some((sprite) =>
        sprite.kind === "poisonBubble" && sprite.spawnIndex === index
      )
    )).toEqual([true, true, true, true, true, true]);
    expect(effect(93).sprites).toHaveLength(1);
    expect(effect(94).sprites).toHaveLength(0);
  });

  it("ports the delay-zero four-leg target palette cycle", () => {
    expect([34, 35, 45, 46, 52, 53, 63, 64, 70, 71, 81, 82, 88, 89, 99].map(
      poisonFangTargetPaletteYAtAge,
    )).toEqual([0, 2, 12, 12, 12, 10, 0, 0, 0, 2, 12, 12, 12, 10, 0]);
  });
});
