import { describe, expect, it } from "vitest";
import {
  confusionAttackerEffectAtAge,
  confusionBgBldyAtAge,
  confusionBgIsPsychic,
  confusionBgPaletteRowAtAge,
  confusionTargetEffectAtAge,
} from "../src/engine/confusion.ts";

// RAM-probed via tools/probe/run-battle-lab-rgb.py (no new probe script)
// against tools/battle-lab/mechanic-confusion-kadabra-onix.json, ticks
// 80-260 (age = tick - 81, `fadetobg BG_PSYCHIC`'s own creation tick, the
// same age-0 convention futureSight.ts uses).
describe("MOVE_CONFUSION's SetPsychicBackground/UnsetPsychicBackground BG swap", () => {
  it("fade 1 is byte-identical in shape to FUTURE_SIGHT's own (same subroutine)", () => {
    expect(confusionBgBldyAtAge(0)).toBe(0);
    expect(confusionBgBldyAtAge(16)).toBe(16);
    expect(confusionBgBldyAtAge(19)).toBe(16);
    expect(confusionBgBldyAtAge(20)).toBe(15);
    expect(confusionBgBldyAtAge(35)).toBe(0);
    expect(confusionBgBldyAtAge(100)).toBe(0);
  });

  it("fade 2 starts later than FUTURE_SIGHT's own (age 101, not 73) but shares its ramp/hold/ramp shape", () => {
    expect(confusionBgBldyAtAge(101)).toBe(0);
    expect(confusionBgBldyAtAge(117)).toBe(16);
    expect(confusionBgBldyAtAge(121)).toBe(16);
    expect(confusionBgBldyAtAge(122)).toBe(15);
    expect(confusionBgBldyAtAge(137)).toBe(0);
    expect(confusionBgBldyAtAge(138)).toBe(0);
  });

  it("shows BG_PSYCHIC only between the two black covers", () => {
    expect(confusionBgIsPsychic(19)).toBe(false);
    expect(confusionBgIsPsychic(20)).toBe(true);
    expect(confusionBgIsPsychic(80)).toBe(true);
    expect(confusionBgIsPsychic(119)).toBe(true);
    expect(confusionBgIsPsychic(120)).toBe(false);
  });

  it("is inert before the fade begins", () => {
    expect(confusionBgBldyAtAge(-1)).toBe(0);
    expect(confusionBgIsPsychic(-1)).toBe(false);
  });

  // RAM-probed directly against the raw bgPalette2Faded row: clean 4-age
  // cadence from 21 through 93, then a one-time hold to 99 (not the naive
  // 97) - the same rung-6 pause mechanism as FUTURE_SIGHT, at this move's
  // own (later) breakpoint since CONFUSION's own blendoff gap lands later.
  it("holds one extra 2-tick beat once, between ages 93 and 99, then resumes its 4-tick cadence permanently shifted", () => {
    const ring = Array.from({ length: 13 }, (_, index) => ({ r: index, g: 0, b: 0 }));
    const at = (age: number) => confusionBgPaletteRowAtAge(ring, age)[1];
    expect(at(93)).toEqual(at(94));
    expect(at(94)).toEqual(at(97));
    expect(at(97)).toEqual(at(98));
    // No further rotation through age 98 (the naive 4-tick formula would
    // have rotated again at age 97 - RAM shows it doesn't).
    expect(at(98)).toEqual(at(93));
    // The next rotation lands at age 99, not age 97.
    expect(at(99)).not.toEqual(at(98));
    // Cadence resumes cleanly every 4 ages from 99, permanently shifted +2.
    expect(at(103)).not.toEqual(at(99));
    expect(at(107)).not.toEqual(at(103));
  });
});

describe("MOVE_CONFUSION's window 1: attacker AnimTask_ShakeMon2 + blend_color_cycle", () => {
  it("both created at age 37 - the same age FUTURE_SIGHT's own attacker effect starts at", () => {
    expect(confusionAttackerEffectAtAge(36).attackerObjY).toBe(0);
    expect(confusionAttackerEffectAtAge(37).attackerObjY).toBe(0);
    expect(confusionAttackerEffectAtAge(45).attackerObjY).toBe(8);
  });

  it("shakes x2 by 1px through the +1 creation-anchor idiom (RAM: [-1,-1,1,1,-1,-1,...] from age 37)", () => {
    expect(confusionAttackerEffectAtAge(36).attackerX2).toBe(0);
    expect(confusionAttackerEffectAtAge(37).attackerX2).toBe(-1);
    expect(confusionAttackerEffectAtAge(38).attackerX2).toBe(-1);
    expect(confusionAttackerEffectAtAge(39).attackerX2).toBe(1);
    expect(confusionAttackerEffectAtAge(40).attackerX2).toBe(1);
    expect(confusionAttackerEffectAtAge(41).attackerX2).toBe(-1);
  });

  it("shake self-destroys (x2 back to 0) before the blend finishes its own longer run", () => {
    expect(confusionAttackerEffectAtAge(55).attackerX2).toBe(0);
    expect(confusionAttackerEffectAtAge(55).attackerObjY).toBeGreaterThan(0);
  });
});

describe("MOVE_CONFUSION's window 2: target AnimTask_ShakeMon + AnimTask_ScaleMonAndRestore", () => {
  it("both created at age 65 (oracle tick 146), once window 1's own tasks are gone", () => {
    expect(confusionTargetEffectAtAge(64).targetScale.active).toBe(false);
    expect(confusionTargetEffectAtAge(65).targetScale.active).toBe(true);
    // scaleMonAndRestoreAtAge's own step=age+1 formula already reads the
    // first-decremented value at local age 0 - no extra offset needed here
    // (xDelta=-4, matching the probed matrix a=252 at oracle tick 146).
    expect(confusionTargetEffectAtAge(65).targetScale.xScale).toBe(252);
  });

  it("shakes x2 by 3px through the +1 creation-anchor idiom (RAM: [0,0,3,3,0,0,3,3,...] from age 65)", () => {
    expect(confusionTargetEffectAtAge(64).targetX2).toBe(0);
    expect(confusionTargetEffectAtAge(65).targetX2).toBe(0);
    expect(confusionTargetEffectAtAge(66).targetX2).toBe(0);
    expect(confusionTargetEffectAtAge(67).targetX2).toBe(3);
    expect(confusionTargetEffectAtAge(68).targetX2).toBe(3);
    expect(confusionTargetEffectAtAge(69).targetX2).toBe(0);
  });

  it("is idle well before either window", () => {
    const before = confusionTargetEffectAtAge(0);
    expect(before.targetScale).toEqual({ active: false, xScale: 256, yScale: 256 });
    expect(before.targetX2).toBe(0);
  });
});
