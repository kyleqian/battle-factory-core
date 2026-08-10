import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";

export type KarateChopSide = "player" | "opponent";

export interface KarateChopState {
  readonly active: boolean;
  readonly scriptOffset: 0 | 3 | 6 | 8 | 40 | 77 | 81;
  readonly handsAndFeetLoaded: boolean;
  readonly impactLoaded: boolean;
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly hand: Readonly<{
    x: number;
    y: number;
    x2: number;
    y2: 0;
    animation: 3;
  }> | null;
  readonly hitsplat: Readonly<{
    x: number;
    y: number;
    matrix: 372;
  }> | null;
  readonly shakeTask: Readonly<{
    remaining: 1 | 2 | 3 | 4 | 5;
    delay: 0 | 1;
    displacement: 4;
  }> | null;
  readonly targetOffset: Readonly<{ x2: 0 | 4; y2: 0 }>;
  readonly sound: "SE_M_DOUBLE_TEAM" | "SE_M_COMET_PUNCH" | null;
  readonly soundPanSide: KarateChopSide | null;
}

/** Pointer entry through the first inactive cleanup frame. */
export const KARATE_CHOP_FRAME_COUNT = 49;

function scriptOffsetAtAge(age: number): KarateChopState["scriptOffset"] {
  if (age < 1) return 0;
  if (age < 4) return 3;
  if (age < 7) return 6;
  if (age < 10) return 8;
  if (age < 22) return 40;
  if (age < 33) return 77;
  return 81;
}

/** Pure source-age reducer for the complete isolated `Move_KARATE_CHOP`. */
export function karateChopAtAge(
  age: number,
  targetSide: KarateChopSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): KarateChopState {
  const localHandAge = age - 10;
  const direction = targetSide === "opponent" ? 1 : -1;
  const handX = targetCenter.x - direction * 32;
  const hand = localHandAge >= 0 && localHandAge <= 10
    ? {
        x: handX,
        y: targetCenter.y,
        x2: linearTranslationOffsetAfterCallbacks(
          linearTranslationDeltaQ8(direction * 32, 10),
          Math.min(localHandAge + 1, 10),
          10,
        ),
        y2: 0 as const,
        animation: 3 as const,
      }
    : null;
  const localShakeAge = age - 22;
  const shakeTask = localShakeAge >= 0 && localShakeAge <= 9
    ? {
        remaining: (5 - Math.floor(localShakeAge / 2)) as 1 | 2 | 3 | 4 | 5,
        delay: (1 - (localShakeAge % 2)) as 0 | 1,
        displacement: 4 as const,
      }
    : null;
  const targetX2 = localShakeAge >= 2 && localShakeAge <= 7
      && Math.floor((localShakeAge - 2) / 2) % 2 === 0
    ? 4
    : 0;

  return {
    active: age >= 0 && age < KARATE_CHOP_FRAME_COUNT - 1,
    scriptOffset: scriptOffsetAtAge(age),
    handsAndFeetLoaded: age >= 1 && age < KARATE_CHOP_FRAME_COUNT - 1,
    impactLoaded: age >= 4 && age < KARATE_CHOP_FRAME_COUNT - 1,
    targetOnMonBg: age >= 7 && age <= 32,
    alpha: age >= 10 && age <= 32 ? { eva: 12, evb: 8 } : null,
    hand,
    hitsplat: age >= 22 && age <= 31
      ? { x: targetCenter.x, y: targetCenter.y, matrix: 372 }
      : null,
    shakeTask,
    targetOffset: { x2: targetX2, y2: 0 },
    sound: age === 10
      ? "SE_M_DOUBLE_TEAM"
      : age === 22
      ? "SE_M_COMET_PUNCH"
      : null,
    soundPanSide: age === 10 || age === 22 ? targetSide : null,
  };
}
