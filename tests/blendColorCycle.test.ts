import { describe, expect, it } from "vitest";
import {
  blendColorCycleBgYAtAge,
  blendColorCycleLegDuration,
  blendColorCycleObjYAtAge,
  type BlendColorCycleTiming,
} from "../src/engine/blendColorCycle.ts";
import { blendComponentToward } from "../src/engine/paletteFade.ts";

// MOVE_GROWTH's own `blend_color_cycle` argv (ATTACKER, delay=0, numBlends=2,
// initialBlendY=0, targetBlendY=8, WHITE) - RAM-probed tick-by-tick against
// the live oracle via `tools/probe/dump-growth-blendcolorcycle.py` and
// `tools/battle-lab/mechanic-growth-player-ivysaur-opponent-onix.json`
// (ticks 211-238 of that trace, task-creation tick = age 0). See
// `src/engine/blendColorCycle.ts`'s own module doc for the two probed
// timing quirks this pins.
const GROWTH_TIMING: BlendColorCycleTiming = {
  legs: [{ startY: 0, targetY: 8 }, { startY: 8, targetY: 0 }],
  deltaY: 2,
};

// gPaletteFade.y read directly at oracle ticks 211..238 (age = tick - 211).
const GROWTH_BG_Y: readonly number[] = [
  2, 2, 4, 4, 6, 6, 8, 8, 8, 8, 8, 8, 8,
  8, 6, 6, 4, 4, 2, 2, 0, 0, 0, 0, 0, 0, 0,
];

// The attacker's own gPlttBufferFaded OBJ-row blue channel at the same
// ticks, base component8=0xA8 (5-bit 21, expanded), target WHITE (5-bit 31).
const GROWTH_OBJ_B: readonly number[] = [
  21, 21, 22, 22, 23, 23, 24, 24, 26, 26, 26, 26, 26,
  26, 26, 26, 24, 24, 23, 23, 22, 22, 21, 21, 21, 21, 21,
];

describe("blend_color_cycle (AnimTask_BlendColorCycle port)", () => {
  it("pins GROWTH's leg durations to the RAM-probed constants (13, then 14 for the destroy leg)", () => {
    expect(blendColorCycleLegDuration(GROWTH_TIMING.legs[0]!, 2, false)).toBe(13);
    expect(blendColorCycleLegDuration(GROWTH_TIMING.legs[1]!, 2, true)).toBe(14);
  });

  it("replays gPaletteFade.y across both legs plus the finishing holds, matching the RAM probe exactly", () => {
    const timeline = GROWTH_BG_Y.map((_, age) => blendColorCycleBgYAtAge(age, GROWTH_TIMING).bgY);
    expect(timeline).toEqual(GROWTH_BG_Y);
    expect(blendColorCycleBgYAtAge(-1, GROWTH_TIMING).active).toBe(false);
    expect(blendColorCycleBgYAtAge(27, GROWTH_TIMING).active).toBe(false);
    expect(blendColorCycleBgYAtAge(0, GROWTH_TIMING).active).toBe(true);
  });

  it("replays the attacker OBJ palette row's blend, matching the RAM-probed blue channel exactly", () => {
    const base8 = (21 << 3) | (21 >> 2);
    const target8 = (31 << 3) | (31 >> 2);
    const timeline = GROWTH_OBJ_B.map((_, age) => {
      const y = blendColorCycleObjYAtAge(age, GROWTH_TIMING);
      const blended8 = blendComponentToward(base8, target8, y);
      return blended8 >> 3;
    });
    expect(timeline).toEqual(GROWTH_OBJ_B);
  });
});
