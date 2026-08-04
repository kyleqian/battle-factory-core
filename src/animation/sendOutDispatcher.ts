import selectorTables from "../data/gen/send-out-anim-selector-tables.json" with { type: "json" };
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
} from "./speciesIdleAnim.ts";

/**
 * Rung-3 front send-out dispatcher (ISSUES #71 cross-lane ask item 1).
 *
 * The public per-tick counterpart to `computeTerminalOffset`'s module-private
 * terminal-only switch (`speciesIdleAnim.ts:7086`): it resolves a species'
 * own `Anim_*` front family from `selectorTables.frontAnimIds.species`, clamps
 * the tick to that family's terminal tick (the tick where the family reducer
 * reaches `callback === "WaitAnimEnd"`, copied verbatim from the switch's
 * per-case literals), and calls the same family reducer with the same single
 * tick argument `computeTerminalOffset`'s case calls it at — returning the
 * projected `{ x2, y2 }` offset instead of the full frame. The engine-facing
 * result is a plain frozen `{ x2, y2 }`, the same shape every accepted front
 * reducer's frame already carries.
 *
 * RAPID_H_HOPS is the one family whose terminal tick is not a reducer
 * literal: `computeTerminalOffset` loops `rapidHorizontalHopsOffsetAtTick`
 * from 0 until it returns null and keeps the last non-null offset. Verified
 * with the same loop this step: the last non-null tick is 85
 * (`ticksSinceStart * 24 > 2048` guard, `speciesIdleAnim.ts:1293-1298`),
 * whose offset is `{ x2: 1, y2: 0 }`.
 */

const FRONT_ANIM_PREFIX = "ANIM_";

interface SendOutFrontDispatchEntry {
  readonly reducer: (tick: number) => SpeciesIdleOffset | null;
  readonly terminalTick: number;
}

/**
 * Per-family clamp ticks, copied VERBATIM from `computeTerminalOffset`'s
 * per-case reducer-call literals (`speciesIdleAnim.ts:7088-7528`). The
 * terminal tick is the tick whose reducer result has
 * `callback === "WaitAnimEnd"`; RAPID_H_HOPS is the loop exception at 85.
 */
export const FRONT_SEND_OUT_TERMINAL_TICKS: Readonly<Record<SpeciesFrontAnimFamily, number>> =
  Object.freeze({
    BACK_AND_LUNGE: 32,
    BOUNCE_ROTATE_TO_SIDES: 87,
    BOUNCE_ROTATE_TO_SIDES_SMALL: 87,
    BOUNCE_ROTATE_TO_SIDES_SMALL_SLOW: 167,
    BOUNCE_ROTATE_TO_SIDES_SLOW: 167,
    CIRCLE_INTO_BG: 65,
    CIRCLE_C_CLOCKWISE_SLOW: 43,
    CIRCULAR_VIBRATE: 57,
    CIRCULAR_STRETCH_TWICE: 41,
    DEEP_V_SQUISH_AND_BOUNCE: 64,
    FOUR_PETAL: 63,
    GROW_VIBRATE: 41,
    GROW_IN_STAGES: 114,
    GLOW_BLACK: 129,
    GLOW_BLUE: 65,
    GLOW_ORANGE: 65,
    RISING_WOBBLE: 101,
    LUNGE_GROW: 65,
    FLASH_YELLOW: 56,
    FRONT_FLIP: 49,
    FLICKER_INCREASING: 65,
    FIGURE_8: 63,
    H_JUMPS: 43,
    H_SLIDE: 41,
    H_SLIDE_SLOW: 81,
    H_SLIDE_WOBBLE: 101,
    H_STRETCH: 41,
    H_VIBRATE: 41,
    H_JUMPS_V_STRETCH: 73,
    H_JUMPS_V_STRETCH_TWICE: 156,
    H_PIVOT: 101,
    H_SHAKE: 39,
    H_SHAKE_SLOW: 77,
    RAPID_H_HOPS: 85,
    ROTATE_TO_SIDES_TWICE: 129,
    ROTATE_UP_SLAM_DOWN: 72,
    ROTATE_UP_TO_SIDES: 32,
    SHRINK_GROW: 49,
    SPIN: 61,
    TIP_MOVE_FORWARD: 36,
    TUMBLING_FRONT_FLIP_TWICE: 137,
    SWING_CONVEX: 101,
    SWING_CONVEX_FAST: 102,
    SWING_CONCAVE: 101,
    SWING_CONCAVE_FAST: 102,
    SWING_CONCAVE_FAST_SHORT: 51,
    TWIST: 33,
    TWIST_TWICE: 140,
    V_JUMPS_BIG: 33,
    V_JUMPS_SMALL: 33,
    V_JUMPS_H_JUMPS: 65,
    V_SLIDE: 41,
    V_SLIDE_SLOW: 81,
    V_SLIDE_WOBBLE: 101,
    V_SLIDE_WOBBLE_SMALL: 101,
    V_SQUISH_AND_BOUNCE: 49,
    V_SQUISH_AND_BOUNCE_SLOW: 97,
    V_STRETCH: 41,
    V_SHAKE: 39,
    V_SHAKE_TWICE: 78,
    ZIGZAG_FAST: 54,
    ZIGZAG_SLOW: 108,
  });

/**
 * Family -> reducer. Every reducer is the exact function `computeTerminalOffset`
 * calls for its case, with the same single `(tick: number)` argument shape.
 * The `Record<SpeciesFrontAnimFamily, ...>` type enforces exhaustive coverage
 * at compile time, so the dispatcher's own key check (below) is a runtime
 * guard against selector strings outside the 62-member union, not a
 * double-maintained list.
 */
const FRONT_SEND_OUT_REDUCERS: Readonly<Record<SpeciesFrontAnimFamily, (tick: number) => SpeciesIdleOffset | null>> =
  Object.freeze({
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
  });

const generatedFrontAnimIds = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;

/**
 * Per-tick front send-out offset for `species` at `ticksSinceStart`, or null
 * when the species has no `Anim_*` front family or the tick is invalid.
 *
 * ticksSinceStart 0 is the tick the species' own Anim_* mon-animation callback
 * is installed. In source that is the tick `SpriteCB_OpponentMonFromBall`
 * (reference/pokeemerald/src/battle_main.c:2838) observes
 * `sprite->affineAnimEnded` TRUE after the ball-release affine emerge and
 * calls `BattleAnimateFrontSprite(sprite, species, TRUE, 1)`; when
 * `sMonAnimationDelayTable[species-1] != 0` (src/pokemon.c,
 * `Task_AnimateAfterDelay` branch; extracted as
 * `selectorTables.animationDelay.species`), the movement animation is deferred
 * by that many further ticks, so the engine-side anchor is
 * affineAnimEnded-tick + animationDelay[species]. The exact live RAM-probe
 * pin of this anchor is a separate follow-up acceptance step; this module's
 * contract is reducer-relative and matches the tick contract every accepted
 * front reducer already uses.
 *
 * Ticks past the family's terminal tick clamp to the terminal tick (the
 * settled residual `{ x2, y2 }` the sprite freezes for the rest of the
 * battle), mirroring `computeTerminalOffset`'s terminal lookup. A mid-flight
 * reducer null below the clamp is returned as-is, never masked.
 */
export function frontSendOutFrameAtTick(
  species: string,
  ticksSinceStart: number,
): SpeciesIdleOffset | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;
  const raw = generatedFrontAnimIds[species];
  if (!raw?.startsWith(FRONT_ANIM_PREFIX)) return null;
  const family = raw.slice(FRONT_ANIM_PREFIX.length);
  if (!(family in FRONT_SEND_OUT_REDUCERS)) return null;
  const resolvedFamily = family as SpeciesFrontAnimFamily;
  const t = Math.min(ticksSinceStart, FRONT_SEND_OUT_TERMINAL_TICKS[resolvedFamily]);
  const offset = FRONT_SEND_OUT_REDUCERS[resolvedFamily](t);
  if (offset === null) return null;
  return Object.freeze({ x2: offset.x2, y2: offset.y2 });
}
