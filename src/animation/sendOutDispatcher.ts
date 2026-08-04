import selectorTables from "../data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  backCircleCounterclockwiseFrameAtTick,
  backConcaveArcLargeFrameAtTick,
  backConcaveArcSmallFrameAtTick,
  backConvexDoubleArcFrameAtTick,
  backDipRightSideFrameAtTick,
  backGrowFrameAtTick,
  backGrowInStagesFrameAtTick,
  backGrowStutterFrameAtTick,
  backHorizontalRepeatedSpringFrameAtTick,
  backHorizontalShakeFrameAtTick,
  backHorizontalSlideFrameAtTick,
  backHorizontalSpringFrameAtTick,
  backHorizontalStretchFrameAtTick,
  backHorizontalVibrateFrameAtTick,
  backJoltRightFrameAtTick,
  backShakeFlashYellowFrameAtTick,
  backShakeGlowBlueFrameAtTick,
  backShakeGlowGreenFrameAtTick,
  backShakeGlowRedFrameAtTick,
  backShrinkGrowFrameAtTick,
  backShrinkGrowVibrateFrameAtTick,
  backTriangleDownFrameAtTick,
  backVerticalShakeFrameAtTick,
  backVerticalShakeHorizontalSlideFrameAtTick,
  backVerticalShakeLowFrameAtTick,
  backVerticalStretchFrameAtTick,
  selectBackSendOutAnimation,
} from "./backSendOutAnim.ts";
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
 * by that many further ticks. Measured live against the ROM
 * (`tools/compare/fixtures/front-send-out-flight-*.json`, twice-fresh
 * byte-identical): the Anim_* callback installs on the affineAnimEnded tick
 * itself for delay-0 species (GROVYLE/RATTATA, measured gap 0) and
 * `animationDelay[species] - 1` ticks later for delayed species (PIDGEOTTO
 * delay 25, install 24 ticks after the handoff) — `Task_AnimateAfterDelay`'s
 * `--sAnimDelay == 0` pre-decrement consumes the creation frame. The OAM
 * x2/y2 for reducer tick N appears one display frame after that install frame
 * (the write latches one frame late, matching the KABUTO hand-fit,
 * `src/engine/kabutoSendOut.ts:66-69`), so
 * `frontSendOutFrameAtTick(species, frame - t_move - 1)` reproduced every
 * probed flight tick of GROVYLE/PIDGEOTTO/RATTATA (alignment A = -1).
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

/**
 * Rung-3 back send-out dispatcher (ISSUES #71 cross-lane ask item 3).
 *
 * The player-back per-tick counterpart to the front dispatcher above, in the
 * same contract shape. `BattleAnimateBackSprite` resolves the species' back
 * set via `GetSpeciesBackAnimSet` and then picks one of three selectors from
 * the player's nature (`LaunchAnimationTaskForBackSprite`'s
 * `3 * backAnimSet + natureMod` lookup, `pokemon_animation.c`), so this
 * dispatcher keys on species **and** nature name.
 *
 * `nature` accepts the exact `NATURE_*` names whose list index IS the numeric
 * `GetNature` result (`BACK_ANIM_NATURE_ORDER`, source-order
 * `sBackAnimNatureModTable`); an unknown name returns null. The species is
 * resolved through `selectBackSendOutAnimation`, which returns null for an
 * invalid nature id or a non-source species and freezes the selection
 * `{ backAnimSet, selector, ... }` — the selector variant selects which of
 * the set's callbacks the ROM would install.
 *
 * Unlike the front dispatcher there is no terminal-clamp table: every back
 * reducer already returns its own stable terminal frame for large ticks (the
 * source callback reaches WaitAnimEnd and `Task_HandleMonAnimation` holds the
 * last OAM write), so ticks are passed through unclamped. The dispatched
 * result is the same frozen `{ x2, y2 }` projection the front dispatcher
 * returns.
 */
type BackSendOutReducer = (
  species: string,
  natureId: number,
  ticksSinceStart: number,
) => SpeciesIdleOffset | null;

export const BACK_SEND_OUT_REDUCERS: Readonly<Record<string, BackSendOutReducer>> = Object.freeze({
  BACK_ANIM_H_VIBRATE: backHorizontalVibrateFrameAtTick,
  BACK_ANIM_H_SLIDE: backHorizontalSlideFrameAtTick,
  BACK_ANIM_H_SPRING: backHorizontalSpringFrameAtTick,
  BACK_ANIM_H_SPRING_REPEATED: backHorizontalRepeatedSpringFrameAtTick,
  BACK_ANIM_SHRINK_GROW: backShrinkGrowFrameAtTick,
  BACK_ANIM_GROW: backGrowReducerForSelection,
  BACK_ANIM_CIRCLE_COUNTERCLOCKWISE: backCircleCounterclockwiseFrameAtTick,
  BACK_ANIM_H_SHAKE: backHorizontalShakeFrameAtTick,
  BACK_ANIM_V_SHAKE: backVerticalShakeFrameAtTick,
  BACK_ANIM_V_SHAKE_H_SLIDE: backVerticalShakeHorizontalSlideFrameAtTick,
  BACK_ANIM_V_STRETCH: backVerticalStretchFrameAtTick,
  BACK_ANIM_H_STRETCH: backHorizontalStretchFrameAtTick,
  BACK_ANIM_GROW_STUTTER: backGrowStutterFrameAtTick,
  BACK_ANIM_V_SHAKE_LOW: backVerticalShakeLowFrameAtTick,
  BACK_ANIM_TRIANGLE_DOWN: backTriangleDownFrameAtTick,
  BACK_ANIM_CONCAVE_ARC_LARGE: backConcaveArcLargeFrameAtTick,
  BACK_ANIM_CONVEX_DOUBLE_ARC: backConvexDoubleArcFrameAtTick,
  BACK_ANIM_CONCAVE_ARC_SMALL: backConcaveArcSmallFrameAtTick,
  BACK_ANIM_DIP_RIGHT_SIDE: backDipRightSideFrameAtTick,
  BACK_ANIM_SHRINK_GROW_VIBRATE: backShrinkGrowVibrateFrameAtTick,
  BACK_ANIM_JOLT_RIGHT: backJoltRightFrameAtTick,
  BACK_ANIM_SHAKE_FLASH_YELLOW: backShakeFlashYellowFrameAtTick,
  BACK_ANIM_SHAKE_GLOW_RED: backShakeGlowRedFrameAtTick,
  BACK_ANIM_SHAKE_GLOW_GREEN: backShakeGlowGreenFrameAtTick,
  BACK_ANIM_SHAKE_GLOW_BLUE: backShakeGlowBlueFrameAtTick,
});

const BACK_ANIM_GROW_IN_STAGES_SELECTOR = "ANIM_GROW_IN_STAGES";

/**
 * `BACK_ANIM_GROW` is ONE set served by TWO reducers split by selector
 * variant: `backGrowFrameAtTick` handles the shared Grow helper's
 * `ANIM_GROW` / `ANIM_GROW_TWICE` selectors (whose variants carry
 * speed/runs), while `backGrowInStagesFrameAtTick` handles the distinct
 * `ANIM_GROW_IN_STAGES` staged callback. Each reducer also rejects the other
 * selector's variant, so route on the selection's selector rather than
 * blind-trying both.
 */
function backGrowReducerForSelection(
  species: string,
  natureId: number,
  ticksSinceStart: number,
): SpeciesIdleOffset | null {
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection?.backAnimSet !== "BACK_ANIM_GROW") return null;
  if (selection.selector === BACK_ANIM_GROW_IN_STAGES_SELECTOR) {
    return backGrowInStagesFrameAtTick(species, natureId, ticksSinceStart);
  }
  return backGrowFrameAtTick(species, natureId, ticksSinceStart);
}

/**
 * Per-tick back send-out offset for `species` with player nature `nature` at
 * `ticksSinceStart`, or null when the species has no back set, the nature
 * name is unknown, or the tick is invalid.
 *
 * ticksSinceStart 0 is the tick `LaunchAnimationTaskForBackSprite` installs
 * the selected back animation callback (`GetSpeciesBackAnimSet` +
 * `sBackAnimNatureModTable[GetNature(player)]`); every reducer is invoked
 * with exactly `(species, natureId, ticksSinceStart)` and validates its own
 * routing, so a reducer null passes through as null. Ticks past the reducer's
 * own terminal tick return its stable terminal frame (see
 * `BACK_SEND_OUT_REDUCERS`).
 */
export function backSendOutFrameAtTick(
  species: string,
  nature: string,
  ticksSinceStart: number,
): SpeciesIdleOffset | null {
  if (!Number.isInteger(ticksSinceStart) || ticksSinceStart < 0) return null;
  const natureId = BACK_ANIM_NATURE_ORDER.indexOf(nature);
  if (natureId === -1) return null;
  const selection = selectBackSendOutAnimation(species, natureId);
  if (selection === null) return null;
  const reducer = BACK_SEND_OUT_REDUCERS[selection.backAnimSet];
  if (reducer === undefined) return null;
  const offset = reducer(species, natureId, ticksSinceStart);
  if (offset === null) return null;
  return Object.freeze({ x2: offset.x2, y2: offset.y2 });
}
