import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import {
  psychicBgFadeRampAtLocalAge,
  psychicBgPaletteRowAtAge,
  psychicBgRotationCountAtAge,
} from "./psychicBackground.ts";
import {
  blendColorCycleObjYAtAge,
  type BlendColorCycleTiming,
} from "./blendColorCycle.ts";
import type { RgbColor } from "../engine/bg.ts";

export type HypnosisSide = "player" | "opponent";
export interface HypnosisPoint { readonly x: number; readonly y: number }

export interface HypnosisRing {
  readonly index: number;
  readonly pair: 0 | 1;
  readonly spawnAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data0: number;
  readonly callback:
    | "AnimTranslateLinear_WithFollowup"
    | "DestroyAnimSprite";
}

export interface HypnosisState {
  readonly active: boolean;
  readonly goldRingLoaded: boolean;
  readonly bgBldy: number;
  readonly bgIsPsychic: boolean;
  readonly rings: readonly HypnosisRing[];
  readonly targetBlendTaskActive: boolean;
  readonly targetBlendCoefficient: number;
  readonly sound: "SE_M_SUPERSONIC" | null;
  readonly soundPanSide: HypnosisSide | null;
}

export const HYPNOSIS_PLAYER_FRAME_COUNT = 169;
export const HYPNOSIS_OPPONENT_FRAME_COUNT = 168;
export const HYPNOSIS_RING_FIRST_AGE = 42;
export const HYPNOSIS_RING_DURATION = 27;
const RING_PAIR_PERIOD = 8;
const FADE_2_START_AGE = 129;
const TARGET_BLEND_START_AGE = 66;

export const HYPNOSIS_TARGET_BLEND_COLOR: Readonly<RgbColor> =
  Object.freeze({ r: 255, g: 148, b: 255 });
export const HYPNOSIS_TARGET_BLEND_TIMING: Readonly<BlendColorCycleTiming> =
  Object.freeze({
    legs: Object.freeze([
      Object.freeze({ startY: 0, targetY: 12 }),
      Object.freeze({ startY: 12, targetY: 0 }),
    ]),
    // `blend_color_cycle` delay=2 advances the selected OBJ coefficient by
    // one at each source palette-fade step.
    deltaY: 1,
  });

function ringAtAge(
  age: number,
  index: number,
  attackerSide: HypnosisSide,
  attackerCenter: HypnosisPoint,
  targetCenter: HypnosisPoint,
): HypnosisRing | null {
  const group = Math.floor(index / 2);
  const pair = (index % 2) as 0 | 1;
  const spawnAge = HYPNOSIS_RING_FIRST_AGE + group * RING_PAIR_PERIOD;
  const local = age - spawnAge;
  if (local < 0 || local >= HYPNOSIS_RING_DURATION + 1) return null;
  const initialX = pair === 0 ? 0 : 16;
  const initialY = pair === 0 ? 8 : -8;
  const targetY = pair === 0 ? 8 : -8;
  const xSign = attackerSide === "player" ? 1 : -1;
  const startX = attackerCenter.x + initialX * xSign;
  const startY = attackerCenter.y + initialY;
  const endX = targetCenter.x;
  const endY = targetCenter.y + targetY;
  const callbacks = local + 1;
  return {
    index,
    pair,
    spawnAge,
    x: startX,
    y: startY,
    x2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(endX - startX, HYPNOSIS_RING_DURATION),
      callbacks,
      HYPNOSIS_RING_DURATION,
    ),
    y2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(endY - startY, HYPNOSIS_RING_DURATION),
      callbacks,
      HYPNOSIS_RING_DURATION,
    ),
    data0: Math.max(0, HYPNOSIS_RING_DURATION - callbacks),
    callback:
      local === HYPNOSIS_RING_DURATION
        ? "DestroyAnimSprite"
        : "AnimTranslateLinear_WithFollowup",
  };
}

export function hypnosisBgPaletteRowAtAge(
  basePalette: readonly Readonly<RgbColor>[],
  age: number,
): Readonly<RgbColor>[] {
  // The script's blend-color-cycle gap pauses SetPsychicBackground's
  // four-tick ring by two ticks immediately before restorebg.
  return psychicBgPaletteRowAtAge(
    basePalette,
    psychicBgRotationCountAtAge(age, 125, 2),
  );
}

/** Pure source-relative `Move_HYPNOSIS` body; sleep remains gameplay-owned. */
export function hypnosisAtAge(
  age: number,
  attackerSide: HypnosisSide,
  attackerCenter: HypnosisPoint,
  targetCenter: HypnosisPoint,
): HypnosisState {
  const firstInactive =
    attackerSide === "player"
      ? HYPNOSIS_PLAYER_FRAME_COUNT - 1
      : HYPNOSIS_OPPONENT_FRAME_COUNT - 1;
  const sound = age === 42 || age === 50 || age === 58
    ? "SE_M_SUPERSONIC"
    : null;
  const bgBldy = age < FADE_2_START_AGE
    ? psychicBgFadeRampAtLocalAge(age - 5, 16, 19, 35)
    : psychicBgFadeRampAtLocalAge(
        age - (FADE_2_START_AGE + 1),
        16,
        attackerSide === "player" ? 20 : 19,
        attackerSide === "player" ? 36 : 35,
      );
  return {
    active: age >= 0 && age < firstInactive,
    goldRingLoaded: age >= 1 && age < firstInactive,
    bgBldy,
    bgIsPsychic:
      age >= 24
      && age <= (attackerSide === "player" ? 148 : 147),
    rings: Array.from(
      { length: 6 },
      (_, index) =>
        ringAtAge(age, index, attackerSide, attackerCenter, targetCenter),
    ).filter((ring): ring is HypnosisRing => ring !== null),
    targetBlendTaskActive: age >= TARGET_BLEND_START_AGE && age < 125,
    targetBlendCoefficient: blendColorCycleObjYAtAge(
      age - TARGET_BLEND_START_AGE,
      HYPNOSIS_TARGET_BLEND_TIMING,
    ),
    sound,
    soundPanSide: sound ? attackerSide : null,
  };
}
