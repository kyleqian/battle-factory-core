import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import {
  shakeMon2OffsetAtTick,
  type ShakeMon2Offset,
} from "./shakeMon2.ts";

export type GuillotineSide = "player" | "opponent";
export const GUILLOTINE_PLAYER_FRAME_COUNT = 165;
export const GUILLOTINE_OPPONENT_FRAME_COUNT = 164;
export const GUILLOTINE_PINCER_FIRST_AGE = 49;
export const GUILLOTINE_LONG_SHAKE_FIRST_AGE = 60;
export const GUILLOTINE_IMPACT_FIRST_AGE = 108;

export interface GuillotinePincer {
  readonly oamSlot: 3 | 4;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly tileOffset: 0 | 16 | 32;
  readonly hFlip: boolean;
  readonly vFlip: boolean;
  readonly phase: "close" | "hold" | "open";
}

export interface GuillotineState {
  readonly age: number;
  readonly active: boolean;
  readonly cutLoaded: boolean;
  readonly impactLoaded: boolean;
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly background: Readonly<{
    kind: "field" | "guillotine";
    variant: GuillotineSide;
    bldy: number;
  }>;
  readonly pincers: readonly GuillotinePincer[];
  readonly targetBlackCoefficient: number;
  readonly allPaletteBlackCoefficient: number;
  readonly targetOffset: ShakeMon2Offset;
  readonly displayedTargetOffset: ShakeMon2Offset;
  readonly hitsplat: Readonly<{ x: number; y: number; oamSlot: 5 }> | null;
  readonly sound: "SE_M_VICEGRIP" | "SE_M_RAZOR_WIND" | null;
  readonly soundPanSide: GuillotineSide | null;
}

function fadeBldy(age: number, targetSide: GuillotineSide): number {
  if (age >= 12 && age <= 27) return age - 11;
  if (age >= 28 && age <= 31) return 16;
  if (age >= 32 && age <= 47) return 47 - age;
  if (age < 125) return 0;
  if (age <= 127) return 1;
  if (age <= 142) return age - 126;
  const restoreFirstAge = targetSide === "opponent" ? 147 : 146;
  if (age < restoreFirstAge) return 16;
  return Math.max(0, 16 - (age - restoreFirstAge + 1));
}

function pincerTileOffset(phaseAge: number): 0 | 16 | 32 {
  return phaseAge <= 0 ? 0 : phaseAge <= 2 ? 16 : 32;
}

function openPincerTileOffset(callbacks: number): 0 | 16 | 32 {
  return callbacks <= 1 ? 0 : callbacks <= 3 ? 16 : 32;
}

function pincerAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  inverted: boolean,
): GuillotinePincer | null {
  const local = age - GUILLOTINE_PINCER_FIRST_AGE;
  if (local < 0 || local > 63) return null;
  const sign = inverted ? -1 : 1;
  const startX = targetCenter.x + sign * 32;
  const startY = targetCenter.y - sign * 32;
  if (local <= 5) {
    const callbacks = local + 1;
    return {
      oamSlot: inverted ? 4 : 3,
      x: startX,
      y: startY,
      x2: linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(-sign * 16, 6), callbacks, 6,
      ),
      y2: linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(sign * 16, 6), callbacks, 6,
      ),
      tileOffset: pincerTileOffset(local),
      hFlip: inverted,
      vFlip: inverted,
      phase: "close",
    };
  }
  const centerX = targetCenter.x + (inverted ? -17 : 16);
  const centerY = targetCenter.y + (inverted ? 16 : -17);
  if (local <= 56) {
    const negative = Math.floor((local - 6) / 2) % 2 === 1;
    return {
      oamSlot: inverted ? 4 : 3,
      x: centerX,
      y: centerY,
      x2: negative ? -2 : 2,
      y2: negative ? 2 : -2,
      tileOffset: 0,
      hFlip: inverted,
      vFlip: inverted,
      phase: "hold",
    };
  }
  const callbacks = local - 57;
  return {
    oamSlot: inverted ? 4 : 3,
    x: centerX,
    y: centerY,
    x2: callbacks === 0 ? 0 : linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(sign * 16, 6), callbacks, 6,
    ),
    y2: callbacks === 0 ? 0 : linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(-sign * 16, 6), callbacks, 6,
    ),
    tileOffset: openPincerTileOffset(callbacks),
    hFlip: !inverted,
    vFlip: !inverted,
    phase: "open",
  };
}

function sourceTargetOffset(age: number): ShakeMon2Offset {
  if (age >= 108 && age <= 121)
    return shakeMon2OffsetAtTick(4, 0, 8, 1, age - 108 + 1);
  if (age >= 60 && age <= 103)
    return shakeMon2OffsetAtTick(2, 0, 23, 1, age - 60 + 1);
  return { x2: 0, y2: 0 };
}

function displayedTargetOffset(age: number): ShakeMon2Offset {
  return sourceTargetOffset(age - 1);
}

/** Pure source-relative reducer for the complete bilateral Guillotine body. */
export function guillotineAtAge(
  age: number,
  targetSide: GuillotineSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): GuillotineState {
  const frameCount = targetSide === "opponent"
    ? GUILLOTINE_PLAYER_FRAME_COUNT
    : GUILLOTINE_OPPONENT_FRAME_COUNT;
  const p0 = pincerAtAge(age, targetCenter, false);
  const p1 = pincerAtAge(age, targetCenter, true);
  const complexBlack = age >= 108 && age <= 110 ? 8 : 0;
  const targetBlack = age < 53 ? 0
    : age <= 97 ? Math.floor((age - 50) / 3)
      : age <= 107 ? 16
        : complexBlack;
  const restoreFirstAge = targetSide === "opponent" ? 147 : 146;
  const backgroundKind = age >= 32 && age < restoreFirstAge
    ? "guillotine"
    : "field";
  return {
    age,
    active: age >= 0 && age < frameCount - 1,
    cutLoaded: age >= 1 && age < frameCount - 1,
    impactLoaded: age >= 4 && age < frameCount - 1,
    targetOnMonBg: age >= 7 && age <= 125,
    alpha: age >= 10 && age < 123 ? { eva: 12, evb: 8 } : null,
    background: {
      kind: backgroundKind,
      variant: targetSide,
      bldy: fadeBldy(age, targetSide),
    },
    pincers: [p0, p1].filter((p): p is GuillotinePincer => p !== null),
    targetBlackCoefficient: targetBlack,
    allPaletteBlackCoefficient: complexBlack,
    targetOffset: sourceTargetOffset(age),
    displayedTargetOffset: displayedTargetOffset(age),
    hitsplat: age >= 108 && age <= 116
      ? { x: targetCenter.x, y: targetCenter.y, oamSlot: 5 }
      : null,
    sound: age === 49 ? "SE_M_VICEGRIP"
      : age === 108 ? "SE_M_RAZOR_WIND"
        : null,
    soundPanSide: age === 49 || age === 108 ? targetSide : null,
  };
}
