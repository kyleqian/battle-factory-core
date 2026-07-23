import { describe, expect, it } from "vitest";
import {
  faintAttackAttackerEva,
  faintAttackAttackerOffset,
  faintAttackBgState,
  faintAttackHitsplatVisible,
  faintAttackTargetShakeX2,
} from "../src/engine/faintAttack.ts";

describe("FAINT_ATTACK pure animation reducers", () => {
  it("pins both Task_FadeToBg halves at every swap/settle boundary", () => {
    expect(faintAttackBgState(4)).toEqual({ background: "default", bldy: 0 });
    expect(faintAttackBgState(5)).toEqual({ background: "default", bldy: 1 });
    expect(faintAttackBgState(20)).toEqual({ background: "default", bldy: 16 });
    expect(faintAttackBgState(23)).toEqual({ background: "default", bldy: 16 });
    expect(faintAttackBgState(24)).toEqual({ background: "dark", bldy: 15 });
    expect(faintAttackBgState(38)).toEqual({ background: "dark", bldy: 1 });
    expect(faintAttackBgState(39)).toEqual({ background: "dark", bldy: 0 });
    expect(faintAttackBgState(183)).toEqual({ background: "dark", bldy: 0 });
    expect(faintAttackBgState(184)).toEqual({ background: "dark", bldy: 1 });
    expect(faintAttackBgState(199)).toEqual({ background: "dark", bldy: 16 });
    expect(faintAttackBgState(203)).toEqual({ background: "dark", bldy: 16 });
    expect(faintAttackBgState(204)).toEqual({ background: "default", bldy: 15 });
    expect(faintAttackBgState(219)).toEqual({ background: "default", bldy: 0 });
  });

  it("pins the source ellipse's first step, last live step, and reset", () => {
    expect(faintAttackAttackerOffset(43)).toEqual({ x2: 0, y2: 0 });
    expect(faintAttackAttackerOffset(44)).toEqual({ x2: -4, y2: 1 });
    expect(faintAttackAttackerOffset(73)).toEqual({ x2: 6, y2: 1 });
    expect(faintAttackAttackerOffset(74)).toEqual({ x2: 0, y2: 0 });
    expect(faintAttackAttackerOffset(75)).toEqual({ x2: 0, y2: 0 });
  });

  it("pins fade-to/from-invisible coefficients and the invisible hold", () => {
    expect(faintAttackAttackerEva(43)).toBe(16);
    expect(faintAttackAttackerEva(44)).toBe(16);
    expect(faintAttackAttackerEva(45)).toBe(15);
    expect(faintAttackAttackerEva(46)).toBe(15);
    expect(faintAttackAttackerEva(74)).toBe(1);
    expect(faintAttackAttackerEva(75)).toBe(0);
    expect(faintAttackAttackerEva(146)).toBe(0);
    expect(faintAttackAttackerEva(147)).toBe(1);
    expect(faintAttackAttackerEva(148)).toBe(1);
    expect(faintAttackAttackerEva(176)).toBe(15);
    expect(faintAttackAttackerEva(177)).toBe(16);
  });

  it("pins ShakeMon2's alternating two-VBlank poses and teardown", () => {
    expect(faintAttackTargetShakeX2(86)).toBe(0);
    expect(faintAttackTargetShakeX2(87)).toBe(-2);
    expect(faintAttackTargetShakeX2(88)).toBe(-2);
    expect(faintAttackTargetShakeX2(89)).toBe(2);
    expect(faintAttackTargetShakeX2(102)).toBe(2);
    expect(faintAttackTargetShakeX2(103)).toBe(0);
  });

  it("pins the generic animation-1 hitsplat's ten displayed VBlanks", () => {
    expect(faintAttackHitsplatVisible(86)).toBe(false);
    expect(faintAttackHitsplatVisible(87)).toBe(true);
    expect(faintAttackHitsplatVisible(96)).toBe(true);
    expect(faintAttackHitsplatVisible(97)).toBe(false);
  });
});
