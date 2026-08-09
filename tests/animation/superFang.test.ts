import { describe, expect, it } from "vitest";
import {
  superFangAtAge,
  superFangAttackerBlendCoefficientAtAge,
  superFangDisplayedAttackerOffsetAtAge,
  superFangDisplayedTargetOffsetAtAge,
} from "../../src/animation/superFang.ts";

describe("MOVE_SUPER_FANG source-relative reducer", () => {
  it("ports both attacker shake tasks, the signed 4px lunge, and blend ramp", () => {
    const player = (age: number) => superFangAtAge(age, "player", { x: 176, y: 42 });
    const opponent = (age: number) => superFangAtAge(age, "opponent", { x: 72, y: 88 });
    expect([4, 5, 6, 40, 41, 42, 43, 134, 135].map(
      (age) => player(age).attackerOffset.x2,
    )).toEqual([-1, 1, 1, -1, 0, -3, 3, -3, 0]);
    expect([160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170].map(
      (age) => [player(age).attackerOffset.x2, opponent(age).attackerOffset.x2],
    )).toEqual([
      [4, -4], [8, -8], [12, -12], [16, -16], [16, -16], [16, -16],
      [12, -12], [8, -8], [4, -4], [0, 0], [0, 0],
    ]);
    expect([44, 45, 48, 49, 88, 89, 92, 93, 132, 133, 136, 137].map(
      superFangAttackerBlendCoefficientAtAge,
    )).toEqual([0, 1, 1, 2, 11, 12, 12, 11, 2, 1, 1, 0]);
  });

  it("owns the source's four non-affine fang frames and final BG-only blend/shake", () => {
    const effect = (age: number) => superFangAtAge(age, "player", { x: 176, y: 42 });
    expect([165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175].map(
      (age) => effect(age).fang?.frame ?? null,
    )).toEqual([null, 0, 1, 1, 2, 2, 3, 3, 3, 3, null]);
    expect([175, 176, 178, 179, 183, 184].map(
      (age) => effect(age).complexPaletteBlend?.target ?? null,
    )).toEqual([null, "red", "red", "white", "white", null]);
    expect([176, 177, 178, 179, 180, 181, 196, 197, 198].map(
      (age) => effect(age).targetOffset.y2,
    )).toEqual([0, 0, 7, 7, 0, 0, 0, 0, 0]);
  });

  it("keeps each priority-2 in-place shake write for its two transferred displays", () => {
    expect([4, 5, 6, 7, 8, 41, 42, 43, 44, 45, 46].map(
      (age) => superFangDisplayedAttackerOffsetAtAge(age, "player").x2,
    )).toEqual([0, -1, -1, 1, 1, -1, -1, -3, -3, 3, 3]);
  });

  it("keeps the target ShakeMon's independently measured OAM handoff", () => {
    expect([176, 177, 178, 179, 180, 181, 182, 183].map(
      (age) => superFangDisplayedTargetOffsetAtAge(age).y2,
    )).toEqual([0, 7, 0, 0, 7, 7, 0, 0]);
  });
});
