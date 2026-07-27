import { describe, expect, it } from "vitest";
import {
  hyperFangBranch,
  hyperFangEffectAtAge,
} from "../../src/animation/hyperFang.ts";

describe("MOVE_HYPER_FANG source-relative reducer", () => {
  it("takes the honest non-contest result and both target-side branches", () => {
    expect(hyperFangBranch("opponent")).toEqual({
      contest: false, targetPlayerSide: false, background: "opponent",
    });
    expect(hyperFangBranch("player")).toEqual({
      contest: false, targetPlayerSide: true, background: "player",
    });
  });

  it("reuses the source-identical fang program and ports ShakeMon(3,0,10,1)", () => {
    const effect = (age: number) =>
      hyperFangEffectAtAge(age, "opponent", { x: 176, y: 42 });
    expect(effect(25).sprites).toHaveLength(0);
    expect(effect(26).sprites[0]).toMatchObject({
      kind: "fang", frame: 0, xScale: 136, yScale: 136,
    });
    expect(effect(57).sprites[0]).toMatchObject({ kind: "fang", frame: 3 });
    expect(effect(58).sprites).toHaveLength(0);
    expect([45, 46, 47, 48, 49, 64].map(
      (age) => effect(age).targetOffset.x2,
    )).toEqual([0, 0, 0, 3, 3, 0]);
  });

  it("ports the impact-background fade, side selection, restore, and teardown", () => {
    const effect = (age: number) =>
      hyperFangEffectAtAge(age, "player", { x: 72, y: 88 });
    expect([8, 9, 24, 25, 26, 40, 41, 69, 70, 85, 86, 101, 102, 105, 106].map(
      (age) => [effect(age).background.impact, effect(age).background.bldy],
    )).toEqual([
      [false, 0], [false, 1], [false, 16], [false, 16],
      [true, 15], [true, 1], [true, 0],
      [true, 0], [true, 1], [true, 16], [true, 16],
      [false, 1], [false, 0], [false, 0], [false, 0],
    ]);
    expect(effect(106)).toMatchObject({
      contest: false,
      targetPlayerSide: true,
      background: { variant: "player", impact: false, bldy: 0 },
      sprites: [],
    });
  });
});
