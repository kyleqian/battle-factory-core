import { describe, expect, it } from "vitest";
import {
  futureSightAttackerEffectAtAge,
  futureSightBgBldyAtAge,
  futureSightBgIsPsychic,
  futureSightBgPaletteRowAtAge,
} from "../src/engine/futureSight.ts";
import type { RgbColor } from "../src/engine/bg.ts";

// RAM-probed via tools/probe/dump-future-sight-psychicbg.py against
// tools/battle-lab/mechanic-future-sight-kadabra-onix.json, ticks 60-200
// (age = tick - 77, `fadetobg BG_PSYCHIC`'s own creation tick).
describe("MOVE_FUTURE_SIGHT's SetPsychicBackground/UnsetPsychicBackground BG swap", () => {
  it("ramps REG_BLDY 0->16 (asymmetric 4-tick hold), then back down revealing BG_PSYCHIC", () => {
    expect(futureSightBgBldyAtAge(0)).toBe(0);
    expect(futureSightBgBldyAtAge(16)).toBe(16);
    expect(futureSightBgBldyAtAge(17)).toBe(16);
    expect(futureSightBgBldyAtAge(19)).toBe(16);
    expect(futureSightBgBldyAtAge(20)).toBe(15);
    expect(futureSightBgBldyAtAge(35)).toBe(0);
    expect(futureSightBgBldyAtAge(36)).toBe(0);
    expect(futureSightBgBldyAtAge(72)).toBe(0);
  });

  it("ramps REG_BLDY back up (asymmetric 5-tick hold) then down for UnsetPsychicBackground", () => {
    expect(futureSightBgBldyAtAge(73)).toBe(0);
    expect(futureSightBgBldyAtAge(74)).toBe(1);
    expect(futureSightBgBldyAtAge(89)).toBe(16);
    expect(futureSightBgBldyAtAge(90)).toBe(16);
    expect(futureSightBgBldyAtAge(93)).toBe(16);
    expect(futureSightBgBldyAtAge(94)).toBe(15);
    expect(futureSightBgBldyAtAge(109)).toBe(0);
    expect(futureSightBgBldyAtAge(110)).toBe(0);
  });

  it("shows BG_PSYCHIC only between the two black covers", () => {
    expect(futureSightBgIsPsychic(19)).toBe(false);
    expect(futureSightBgIsPsychic(20)).toBe(true);
    expect(futureSightBgIsPsychic(54)).toBe(true);
    expect(futureSightBgIsPsychic(91)).toBe(true);
    expect(futureSightBgIsPsychic(92)).toBe(false);
  });

  it("rotates BG palette 2's 11-entry ring (indices 1-11) right by one, every 4 ages, first applied at age 21", () => {
    const base: readonly RgbColor[] = [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 0, b: 0 },
      { r: 164, g: 0, b: 0 },
      { r: 82, g: 0, b: 0 },
      { r: 0, g: 0, b: 0 },
      { r: 41, g: 0, b: 57 },
      { r: 82, g: 0, b: 115 },
      { r: 123, g: 0, b: 172 },
      { r: 148, g: 0, b: 131 },
      { r: 172, g: 0, b: 98 },
      { r: 197, g: 0, b: 65 },
      { r: 222, g: 0, b: 32 },
      { r: 0, g: 0, b: 0 },
    ];
    expect(futureSightBgPaletteRowAtAge(base, 20)).toEqual(base);
    // First rotation (age 21): entry 11's color moves to entry 1, 1-10 shift to 2-11.
    const afterOne = futureSightBgPaletteRowAtAge(base, 21);
    expect(afterOne[1]).toEqual({ r: 222, g: 0, b: 32 });
    expect(afterOne[2]).toEqual({ r: 255, g: 0, b: 0 });
    expect(afterOne[3]).toEqual({ r: 164, g: 0, b: 0 });
    expect(afterOne[11]).toEqual({ r: 197, g: 0, b: 65 });
    expect(afterOne[0]).toEqual(base[0]);
    expect(afterOne[12]).toEqual(base[12]);
    // Still one rotation through age 24; the second rotation lands at age 25.
    expect(futureSightBgPaletteRowAtAge(base, 24)).toEqual(afterOne);
    const afterTwo = futureSightBgPaletteRowAtAge(base, 25);
    expect(afterTwo[1]).toEqual({ r: 197, g: 0, b: 65 });
    expect(afterTwo[2]).toEqual({ r: 222, g: 0, b: 32 });
    expect(afterTwo[3]).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("is inert before the fade begins", () => {
    expect(futureSightBgBldyAtAge(-1)).toBe(0);
    expect(futureSightBgIsPsychic(-1)).toBe(false);
  });
});

describe("MOVE_FUTURE_SIGHT's attacker-only blend_color_cycle + ScaleMonAndRestore", () => {
  it("starts both at age 37 (oracle tick 114), the identical blend argv as MOVE_GROWTH", () => {
    expect(futureSightAttackerEffectAtAge(36).attackerScale.active).toBe(false);
    expect(futureSightAttackerEffectAtAge(37).attackerScale.active).toBe(true);
    expect(futureSightAttackerEffectAtAge(37).attackerObjY).toBe(0);
    expect(futureSightAttackerEffectAtAge(45).attackerObjY).toBe(8);
  });

  it("shrinks the attacker 4px/step to a 15-step trough, then restores (xDelta=yDelta=-4, duration=15)", () => {
    expect(futureSightAttackerEffectAtAge(37).attackerScale.xScale).toBe(252);
    // local age 14 -> step 15 (the trough) -> 256 - 60 = 196.
    expect(futureSightAttackerEffectAtAge(51).attackerScale.xScale).toBe(196);
    // local age 28 -> mirrored step 1 -> 252; local age 29 -> inactive.
    expect(futureSightAttackerEffectAtAge(65).attackerScale.xScale).toBe(252);
    expect(futureSightAttackerEffectAtAge(66).attackerScale.active).toBe(false);
  });

  it("is idle well before or after the single call", () => {
    const before = futureSightAttackerEffectAtAge(0);
    expect(before.attackerScale).toEqual({ active: false, xScale: 256, yScale: 256 });
    expect(before.attackerObjY).toBe(0);
    const after = futureSightAttackerEffectAtAge(200);
    expect(after.attackerScale).toEqual({ active: false, xScale: 256, yScale: 256 });
  });
});
