import { describe, expect, it } from "vitest";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  FRONT_SEND_OUT_TERMINAL_TICKS,
  frontSendOutFrameAtTick,
} from "../../src/animation/sendOutDispatcher.ts";
import {
  type SpeciesFrontAnimFamily,
  type SpeciesIdleOffset,
  backAndLungeFrameAtTick,
  bounceRotateToSidesFrameAtTick,
  bounceRotateToSidesSlowFrameAtTick,
  bounceRotateToSidesSmallFrameAtTick,
  bounceRotateToSidesSmallSlowFrameAtTick,
  circleCCounterclockwiseSlowFrameAtTick,
  circleIntoBackgroundFrameAtTick,
  circularStretchTwiceFrameAtTick,
  circularVibrateFrameAtTick,
  deepVerticalSquishBounceFrameAtTick,
  figure8FrameAtTick,
  flashYellowFrameAtTick,
  flickerIncreasingFrameAtTick,
  fourPetalFrameAtTick,
  frontFlipFrameAtTick,
  glowBlackFrameAtTick,
  glowBlueFrameAtTick,
  glowOrangeFrameAtTick,
  growInStagesFrameAtTick,
  growVibrateFrameAtTick,
  horizontalJumpsFrameAtTick,
  horizontalJumpsVerticalStretchFrameAtTick,
  horizontalJumpsVerticalStretchTwiceFrameAtTick,
  horizontalPivotFrameAtTick,
  horizontalShakeFrameAtTick,
  horizontalShakeSlowFrameAtTick,
  horizontalSlideFrameAtTick,
  horizontalSlideSlowFrameAtTick,
  horizontalSlideWobbleFrameAtTick,
  horizontalStretchFrameAtTick,
  horizontalVibrateFrameAtTick,
  lungeGrowFrameAtTick,
  rapidHorizontalHopsOffsetAtTick,
  risingWobbleFrameAtTick,
  rotateToSidesTwiceFrameAtTick,
  rotateUpSlamDownFrameAtTick,
  rotateUpToSidesFrameAtTick,
  shrinkGrowFrameAtTick,
  spinFrameAtTick,
  speciesFrontIdleRestOffset,
  swingConcaveFastFrameAtTick,
  swingConcaveFastShortFrameAtTick,
  swingConcaveFrameAtTick,
  swingConvexFastFrameAtTick,
  swingConvexFrameAtTick,
  tipMoveForwardFrameAtTick,
  tumblingFrontFlipTwiceFrameAtTick,
  twistFrameAtTick,
  twistTwiceFrameAtTick,
  verticalJumpsBigFrameAtTick,
  verticalJumpsHorizontalJumpsFrameAtTick,
  verticalJumpsSmallFrameAtTick,
  verticalShakeFrameAtTick,
  verticalShakeTwiceFrameAtTick,
  verticalSlideFrameAtTick,
  verticalSlideSlowFrameAtTick,
  verticalSlideWobbleFrameAtTick,
  verticalSlideWobbleSmallFrameAtTick,
  verticalSquishBounceFrameAtTick,
  verticalSquishBounceSlowFrameAtTick,
  verticalStretchFrameAtTick,
  zigzagFastFrameAtTick,
  zigzagSlowFrameAtTick,
} from "../../src/animation/speciesIdleAnim.ts";

const speciesTable = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;

const REDUCERS: Readonly<Record<SpeciesFrontAnimFamily, (tick: number) => SpeciesIdleOffset | null>> = {
  BACK_AND_LUNGE: backAndLungeFrameAtTick,
  BOUNCE_ROTATE_TO_SIDES: bounceRotateToSidesFrameAtTick,
  BOUNCE_ROTATE_TO_SIDES_SMALL: bounceRotateToSidesSmallFrameAtTick,
  BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW: bounceRotateToSidesSmallSlowFrameAtTick,
  BOUNCE_ROTATE_TO_SIDES_SLOW: bounceRotateToSidesSlowFrameAtTick,
  CIRCLE_INTO_BG: circleIntoBackgroundFrameAtTick,
  CIRCLE_C_CLOCKWISE_SLOW: circleCCounterclockwiseSlowFrameAtTick,
  CIRCULAR_VIBRATE: circularVibrateFrameAtTick,
  CIRCULAR_STRETCH_TWICE: circularStretchTwiceFrameAtTick,
  DEEP_V_SQUISH_AND_BOUNCE: deepVerticalSquishBounceFrameAtTick,
  FOUR_PETAL: fourPetalFrameAtTick,
  GROW_VIBRATE: growVibrateFrameAtTick,
  GROW_IN_STAGES: growInStagesFrameAtTick,
  GLOW_BLACK: glowBlackFrameAtTick,
  GLOW_BLUE: glowBlueFrameAtTick,
  GLOW_ORANGE: glowOrangeFrameAtTick,
  RISING_WOBBLE: risingWobbleFrameAtTick,
  LUNGE_GROW: lungeGrowFrameAtTick,
  FLASH_YELLOW: flashYellowFrameAtTick,
  FRONT_FLIP: frontFlipFrameAtTick,
  FLICKER_INCREASING: flickerIncreasingFrameAtTick,
  FIGURE_8: figure8FrameAtTick,
  H_JUMPS: horizontalJumpsFrameAtTick,
  H_SLIDE: horizontalSlideFrameAtTick,
  H_SLIDE_SLOW: horizontalSlideSlowFrameAtTick,
  H_SLIDE_WOBBLE: horizontalSlideWobbleFrameAtTick,
  H_STRETCH: horizontalStretchFrameAtTick,
  H_VIBRATE: horizontalVibrateFrameAtTick,
  H_JUMPS_V_STRETCH: horizontalJumpsVerticalStretchFrameAtTick,
  H_JUMPS_V_STRETCH_TWICE: horizontalJumpsVerticalStretchTwiceFrameAtTick,
  H_PIVOT: horizontalPivotFrameAtTick,
  H_SHAKE: horizontalShakeFrameAtTick,
  H_SHAKE_SLOW: horizontalShakeSlowFrameAtTick,
  RAPID_H_HOPS: rapidHorizontalHopsOffsetAtTick,
  ROTATE_TO_SIDES_TWICE: rotateToSidesTwiceFrameAtTick,
  ROTATE_UP_SLAM_DOWN: rotateUpSlamDownFrameAtTick,
  ROTATE_UP_TO_SIDES: rotateUpToSidesFrameAtTick,
  SHRINK_GROW: shrinkGrowFrameAtTick,
  SPIN: spinFrameAtTick,
  TIP_MOVE_FORWARD: tipMoveForwardFrameAtTick,
  TUMBLING_FRONT_FLIP_TWICE: tumblingFrontFlipTwiceFrameAtTick,
  SWING_CONVEX: swingConvexFrameAtTick,
  SWING_CONVEX_FAST: swingConvexFastFrameAtTick,
  SWING_CONCAVE: swingConcaveFrameAtTick,
  SWING_CONCAVE_FAST: swingConcaveFastFrameAtTick,
  SWING_CONCAVE_FAST_SHORT: swingConcaveFastShortFrameAtTick,
  TWIST: twistFrameAtTick,
  TWIST_TWICE: twistTwiceFrameAtTick,
  V_JUMPS_BIG: verticalJumpsBigFrameAtTick,
  V_JUMPS_SMALL: verticalJumpsSmallFrameAtTick,
  V_JUMPS_H_JUMPS: verticalJumpsHorizontalJumpsFrameAtTick,
  V_SLIDE: verticalSlideFrameAtTick,
  V_SLIDE_SLOW: verticalSlideSlowFrameAtTick,
  V_SLIDE_WOBBLE: verticalSlideWobbleFrameAtTick,
  V_SLIDE_WOBBLE_SMALL: verticalSlideWobbleSmallFrameAtTick,
  V_SQUISH_AND_BOUNCE: verticalSquishBounceFrameAtTick,
  V_SQUISH_AND_BOUNCE_SLOW: verticalSquishBounceSlowFrameAtTick,
  V_STRETCH: verticalStretchFrameAtTick,
  V_SHAKE: verticalShakeFrameAtTick,
  V_SHAKE_TWICE: verticalShakeTwiceFrameAtTick,
  ZIGZAG_FAST: zigzagFastFrameAtTick,
  ZIGZAG_SLOW: zigzagSlowFrameAtTick,
};

const selectorFamilies = new Set(Object.values(speciesTable).map((family) => family.slice("ANIM_".length)));
const families = Object.keys(FRONT_SEND_OUT_TERMINAL_TICKS) as SpeciesFrontAnimFamily[];

function alphabeticallyFirstSpeciesForFamily(family: SpeciesFrontAnimFamily): string {
  const prefix = `ANIM_${family}`;
  const species = Object.keys(speciesTable)
    .filter((key) => speciesTable[key] === prefix)
    .sort();
  expect(species.length, `no species maps to ${family}`).toBeGreaterThan(0);
  return species[0]!;
}

describe("send-out front dispatcher", () => {
  it("exposes exactly the 62 accepted front families", () => {
    expect(Object.keys(FRONT_SEND_OUT_TERMINAL_TICKS).length).toBe(62);
    expect([...families].sort()).toEqual([...selectorFamilies].sort());
    expect(Object.keys(REDUCERS).length).toBe(62);
  });

  it("terminal consistency: every keyed species settles on its rest offset", () => {
    for (const species of Object.keys(speciesTable)) {
      const dispatched = frontSendOutFrameAtTick(species, 100000);
      expect(dispatched, species).not.toBeNull();
      expect(dispatched).toEqual(speciesFrontIdleRestOffset(species));
    }
  });

  it("mid-flight passthrough matches every family reducer directly", () => {
    for (const family of families) {
      const terminal = FRONT_SEND_OUT_TERMINAL_TICKS[family];
      const species = alphabeticallyFirstSpeciesForFamily(family);
      const reducer = REDUCERS[family];
      for (const tick of [0, 1, 2, 5, Math.floor(terminal / 2), terminal]) {
        const expected = reducer(tick);
        const dispatched = frontSendOutFrameAtTick(species, tick);
        if (expected === null) {
          expect(dispatched, `${family} @ ${tick}`).toBeNull();
        } else {
          expect(dispatched, `${family} @ ${tick}`).toEqual({ x2: expected.x2, y2: expected.y2 });
        }
      }
    }
  });

  it("clamps past-terminal ticks to the terminal offset", () => {
    const clampCases: ReadonlyArray<readonly [string, SpeciesFrontAnimFamily]> = [
      ["ONIX", "RAPID_H_HOPS"],
      ["CHARMELEON", "BACK_AND_LUNGE"],
      ["FEAROW", "FIGURE_8"],
      ["SHARPEDO", "H_JUMPS_V_STRETCH_TWICE"],
      ["FLYGON", "ZIGZAG_SLOW"],
    ];
    for (const [species, family] of clampCases) {
      const terminal = FRONT_SEND_OUT_TERMINAL_TICKS[family];
      const atTerminal = frontSendOutFrameAtTick(species, terminal);
      expect(atTerminal, species).not.toBeNull();
      expect(frontSendOutFrameAtTick(species, terminal + 1)).toEqual(atTerminal);
      expect(frontSendOutFrameAtTick(species, terminal + 1000)).toEqual(atTerminal);
    }
    expect(frontSendOutFrameAtTick("ONIX", 85)).toEqual({ x2: 1, y2: 0 });
  });

  it("returns null for unknown species or invalid ticks", () => {
    expect(frontSendOutFrameAtTick("NOT_A_SPECIES", 0)).toBeNull();
    expect(frontSendOutFrameAtTick("OLD_UNOWN_B", 0)).toBeNull();
    expect(frontSendOutFrameAtTick("ONIX", -1)).toBeNull();
    expect(frontSendOutFrameAtTick("ONIX", 1.5)).toBeNull();
  });

  it("returns a frozen offset object", () => {
    expect(Object.isFrozen(frontSendOutFrameAtTick("ONIX", 5))).toBe(true);
    expect(Object.isFrozen(frontSendOutFrameAtTick("BULBASAUR", 5))).toBe(true);
  });
});
