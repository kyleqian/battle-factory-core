// S6 transition-engine slice: Tier-1 tests for the CIRCLES_MEET phase math
// (src/engine/battleTransition.ts) - pixel parity itself lives in
// tools/compare/traces/transition.json (206/206). These pin the formulas
// (flicker schedule, circle-slide checkpoints, blend ramp, fade steps) as
// state, not pixels - see that module's doc for the oracle-derivation of
// every constant asserted here.
import { describe, expect, it } from "vitest";
import {
  asymmetricSpiralCircleCenter,
  centerLogoEva,
  circleCenter,
  exitFadeY,
  grayFlickerY,
  sequentialCirclePainterOrder,
} from "../src/engine/battleTransition.ts";

describe("grayFlickerY (TransitionIntro_FadeToGray/_FadeFromGray, te = settled.elapsed)", () => {
  it("is 0 through the static hold (te 0-27, trace ticks 843-870)", () => {
    for (let te = 0; te <= 27; te += 1) expect(grayFlickerY(te)).toBe(0);
  });

  it("ramps up 2/tick to a peak of 16 at the midpoint of each 16-tick cycle", () => {
    // Cycle 1: te 28-43 (trace 871-886), peak at te=35 (trace 878).
    const expected = [2, 4, 6, 8, 10, 12, 14, 16, 14, 12, 10, 8, 6, 4, 2, 0];
    for (let k = 0; k < 16; k += 1) expect(grayFlickerY(28 + k)).toBe(expected[k]);
  });

  it("repeats identically for all 3 cycles (te 28-75, trace 871-918)", () => {
    const cycle = Array.from({ length: 16 }, (_, k) => grayFlickerY(28 + k));
    expect(Array.from({ length: 16 }, (_, k) => grayFlickerY(44 + k))).toEqual(cycle);
    expect(Array.from({ length: 16 }, (_, k) => grayFlickerY(60 + k))).toEqual(cycle);
  });

  it("is 0 again once the intro task is destroyed (te >= 76, trace tick >= 919)", () => {
    for (const te of [76, 77, 100, 127]) expect(grayFlickerY(te)).toBe(0);
  });
});

describe("circleCenter (CirclesMeet_CreateSprites / CreateSlidingLogoCircleSprite, anchor trace tick 921)", () => {
  const ANCHOR_TE = 921 - 843; // 78

  it("sits at its off-screen creation position before the anchor tick", () => {
    expect(circleCenter("top", ANCHOR_TE)).toEqual({ x: 120, y: -51 });
    expect(circleCenter("left", ANCHOR_TE)).toEqual({ x: -7, y: 193 });
    expect(circleCenter("right", ANCHOR_TE)).toEqual({ x: 247, y: 193 });
    // Clamped identically for any te at or before the anchor.
    expect(circleCenter("top", 0)).toEqual({ x: 120, y: -51 });
  });

  it("moves by its fixed per-tick delta - checkpoint at anchor+20 (trace tick 941)", () => {
    expect(circleCenter("top", ANCHOR_TE + 20)).toEqual({ x: 120, y: -11 });
    expect(circleCenter("left", ANCHOR_TE + 20)).toEqual({ x: 33, y: 153 });
    expect(circleCenter("right", ANCHOR_TE + 20)).toEqual({ x: 207, y: 153 });
  });

  it("reaches its fixed target simultaneously at anchor+48 (trace tick 969) and holds", () => {
    for (const te of [ANCHOR_TE + 48, ANCHOR_TE + 49, ANCHOR_TE + 200]) {
      expect(circleCenter("top", te)).toEqual({ x: 120, y: 45 });
      expect(circleCenter("left", te)).toEqual({ x: 89, y: 97 });
      expect(circleCenter("right", te)).toEqual({ x: 151, y: 97 });
    }
  });
});

describe("centerLogoEva (FadeInCenterLogoCircle's BLDALPHA ramp, starts trace tick 970)", () => {
  const BLEND_START_TE = 970 - 843; // 127

  it("is 0 before the ramp starts", () => {
    expect(centerLogoEva(BLEND_START_TE)).toBe(0);
    expect(centerLogoEva(0)).toBe(0);
  });

  it("climbs 1/tick from 1 (trace 971) to 16 (trace 986)", () => {
    expect(centerLogoEva(BLEND_START_TE + 1)).toBe(1);
    expect(centerLogoEva(BLEND_START_TE + 8)).toBe(8);
    expect(centerLogoEva(BLEND_START_TE + 16)).toBe(16);
  });

  it("holds at 16 once reached (trace ticks 986-1019 and beyond)", () => {
    for (const te of [BLEND_START_TE + 16, BLEND_START_TE + 40, BLEND_START_TE + 100]) {
      expect(centerLogoEva(te)).toBe(16);
    }
  });
});

describe("exitFadeY (CirclesMeet_End's BeginNormalPaletteFade, starts trace tick 1020)", () => {
  const FADE_START_TE = 1020 - 843; // 177

  it("is 0 before the fade starts", () => {
    expect(exitFadeY(FADE_START_TE - 1)).toBe(0);
    expect(exitFadeY(0)).toBe(0);
  });

  it("steps 3-per-2-ticks: 3,6,9,12,15 then clamps at 16 (trace ticks 1020-1031)", () => {
    const expected = [3, 3, 6, 6, 9, 9, 12, 12, 15, 15, 16, 16];
    for (let d = 0; d < expected.length; d += 1) expect(exitFadeY(FADE_START_TE + d)).toBe(expected[d]);
  });

  it("holds at 16 (solid black) indefinitely past the fade", () => {
    for (const te of [FADE_START_TE + 20, FADE_START_TE + 100]) expect(exitFadeY(te)).toBe(16);
  });
});

describe("B_TRANSITION_FRONTIER_CIRCLES_ASYMMETRIC_SPIRAL_IN_SEQ", () => {
  const KIND = "asymmetricSpiralInSeq" as const;

  it("shifts the shared three-cycle gray intro to selection-relative ages 25-72", () => {
    expect(grayFlickerY(24, KIND)).toBe(0);
    expect(grayFlickerY(25, KIND)).toBe(2);
    expect(grayFlickerY(32, KIND)).toBe(16);
    expect(grayFlickerY(72, KIND)).toBe(0);
    expect(grayFlickerY(73, KIND)).toBe(0);
  });

  it("creates top/left/right at task-timer stagger ages 76/92/108 and follows the source spiral", () => {
    expect(asymmetricSpiralCircleCenter("top", 75)).toBeNull();
    expect(asymmetricSpiralCircleCenter("top", 76)).toEqual({ x: 146, y: 170 });
    expect(asymmetricSpiralCircleCenter("left", 91)).toBeNull();
    expect(asymmetricSpiralCircleCenter("left", 92)).toEqual({ x: -33, y: 57 });
    expect(asymmetricSpiralCircleCenter("right", 107)).toBeNull();
    expect(asymmetricSpiralCircleCenter("right", 108)).toEqual({ x: 246, y: 11 });
  });

  it("settles each circle after 32 callbacks and holds its distinct target", () => {
    expect(asymmetricSpiralCircleCenter("top", 108)).toEqual({ x: 120, y: 45 });
    expect(asymmetricSpiralCircleCenter("left", 124)).toEqual({ x: 89, y: 97 });
    expect(asymmetricSpiralCircleCenter("right", 140)).toEqual({ x: 151, y: 97 });
    expect(asymmetricSpiralCircleCenter("right", 200)).toEqual({ x: 151, y: 97 });
  });

  it("uses SortSprites' y ordering and preserves the inherited order on the one top/right tie", () => {
    expect(sequentialCirclePainterOrder(125)).toEqual(["right", "top", "left"]);
    expect(sequentialCirclePainterOrder(126)).toEqual(["right", "top", "left"]);
    expect(sequentialCirclePainterOrder(127)).toEqual(["top", "right", "left"]);
  });

  it("starts the center blend after the final circle and preserves the 31-tick full-logo hold", () => {
    expect(centerLogoEva(140, KIND)).toBe(0);
    expect(centerLogoEva(141, KIND)).toBe(1);
    expect(centerLogoEva(156, KIND)).toBe(16);
    expect(exitFadeY(189, KIND)).toBe(0);
    expect(exitFadeY(190, KIND)).toBe(3);
    expect(exitFadeY(200, KIND)).toBe(16);
  });

  it("leaves the existing circles-meet defaults unchanged", () => {
    expect(grayFlickerY(28)).toBe(2);
    expect(circleCenter("top", 78)).toEqual({ x: 120, y: -51 });
    expect(centerLogoEva(128)).toBe(1);
    expect(exitFadeY(177)).toBe(3);
  });
});
