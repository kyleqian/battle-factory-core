import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";

export type CrossChopSide = "player" | "opponent";

export interface CrossChopHand {
  readonly index: 0 | 1;
  readonly oamSlot: 3 | 4;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly hFlip: boolean;
  readonly callback:
    | "AnimTranslateLinear_WithFollowup"
    | "AnimCrossChopHand_Step"
    | "StartAnimLinearTranslation"
    | "DestroyAnimSprite";
}

export interface CrossChopImpact {
  readonly oamSlot: 7;
  readonly x: number;
  readonly y: number;
  readonly remaining: number;
  readonly callback: "WaitAnimForDuration" | "DestroyAnimSprite";
}

export interface CrossChopPaletteBlend {
  readonly color: "white" | "black";
  readonly coefficient: 10;
  readonly callback:
    | "AnimComplexPaletteBlend_Step1"
    | "AnimComplexPaletteBlend_Step2";
}

export interface CrossChopSoundEvent {
  readonly age: 10 | 52;
  readonly song: "SE_M_MEGA_KICK" | "SE_M_RAZOR_WIND";
  readonly pan: number;
  readonly player: "SE1";
}

export interface CrossChopState {
  readonly active: boolean;
  readonly assetsLoaded: Readonly<{
    handsAndFeet: boolean;
    crossImpact: boolean;
  }>;
  readonly targetMonbg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly scriptOffset: 0 | 3 | 6 | 8 | 43 | 100 | 104;
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
  readonly hands: readonly CrossChopHand[];
  readonly impact: CrossChopImpact | null;
  readonly paletteBlend: CrossChopPaletteBlend | null;
  readonly shakeTaskActive: boolean;
  readonly clearMonBgTaskActive: boolean;
  readonly updateMonBgTaskActive: boolean;
  readonly targetOffset: Readonly<{ x2: number; y2: 0 }>;
  readonly targetBaselineX2: number;
  readonly soundEvents: readonly CrossChopSoundEvent[];
  readonly battlerDisplayAge: number;
}

function firstLegOffset(index: 0 | 1, callbacks: number): number {
  const distance = index === 0 ? -20 : 20;
  return linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(distance, 30),
    callbacks,
    30,
  ) || 0;
}

function handAtAge(
  age: number,
  index: 0 | 1,
  target: Readonly<{ x: number; y: number }>,
): CrossChopHand | null {
  if (age < 10 || age > 60) return null;
  const hFlip = index === 1;
  const oamSlot = index === 0 ? 3 : 4;
  const firstX2 = firstLegOffset(index, 30);
  if (age <= 50) {
    const callbacks = Math.min(age - 9, 30);
    return {
      index,
      oamSlot,
      x: target.x,
      y: target.y,
      x2: firstLegOffset(index, callbacks),
      y2: linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(-20, 30),
        callbacks,
        30,
      ) || 0,
      hFlip,
      callback: age <= 39
        ? "AnimTranslateLinear_WithFollowup"
        : "AnimCrossChopHand_Step",
    };
  }
  const x = target.x + firstX2;
  const y = target.y - 20;
  const callbacks = Math.min(Math.max(age - 51, 0), 8);
  return {
    index,
    oamSlot,
    x,
    y,
    x2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(target.x - firstX2 - x, 8),
      callbacks,
      8,
    ) || 0,
    y2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(target.y + 20 - y, 8),
      callbacks,
      8,
    ) || 0,
    hFlip,
    callback: age === 51
      ? "StartAnimLinearTranslation"
      : age === 60
        ? "DestroyAnimSprite"
        : "AnimTranslateLinear_WithFollowup",
  };
}

function scriptOffsetAtAge(age: number): CrossChopState["scriptOffset"] {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 6;
  if (age <= 9) return 8;
  if (age <= 51) return 43;
  if (age <= 73) return 100;
  return 104;
}

function paletteBlendAtAge(age: number): CrossChopPaletteBlend | null {
  if (age >= 52 && age <= 54) {
    return {
      color: "white",
      coefficient: 10,
      callback: "AnimComplexPaletteBlend_Step1",
    };
  }
  if (age >= 55 && age <= 58) {
    return {
      color: "black",
      coefficient: 10,
      callback: "AnimComplexPaletteBlend_Step1",
    };
  }
  if (age === 59) {
    return {
      color: "black",
      coefficient: 10,
      callback: "AnimComplexPaletteBlend_Step2",
    };
  }
  return null;
}

function targetShakeX2(age: number): number {
  if (age < 54 || age > 67) return 0;
  return Math.floor((age - 54) / 2) % 2 === 0 ? 7 : 0;
}

function visualTaskCountAtAge(age: number): number {
  if (age >= 10 && age <= 51) return 2;
  if (age >= 52 && age <= 59) return 5;
  if (age === 60) return 4;
  if (age >= 61 && age <= 67) return 2;
  if (age >= 68 && age <= 72) return 1;
  return 0;
}

/**
 * Pure source-relative port of the complete 88-display Move_CROSS_CHOP
 * envelope. Age 0 is the first HANDS_AND_FEET load display; age 87 is the
 * first inactive cleanup. The only geometry input is the already-resolved
 * target X_2/Y_PIC_OFFSET anchor used by the source sprite commands.
 */
export function crossChopAtAge(
  age: number,
  attackerSide: CrossChopSide,
  targetPictureOffset: Readonly<{ x: number; y: number }>,
): CrossChopState {
  const hands = ([0, 1] as const).flatMap((index) => {
    const hand = handAtAge(age, index, targetPictureOffset);
    return hand ? [hand] : [];
  });
  const impact = age >= 52 && age <= 72
    ? {
        oamSlot: 7 as const,
        x: targetPictureOffset.x,
        y: targetPictureOffset.y,
        remaining: Math.max(0, 71 - age),
        callback: age === 72
          ? "DestroyAnimSprite" as const
          : "WaitAnimForDuration" as const,
      }
    : null;
  const targetPan = attackerSide === "player" ? 63 : -63;
  return {
    active: age >= 0 && age <= 86,
    assetsLoaded: {
      handsAndFeet: age >= 1 && age <= 86,
      crossImpact: age >= 4 && age <= 86,
    },
    targetMonbg: age >= 7 && age <= 76,
    alpha: age >= 10 && age <= 73 ? { eva: 12, evb: 8 } : null,
    scriptOffset: scriptOffsetAtAge(age),
    visualTaskCount: visualTaskCountAtAge(age),
    soundTaskCount: 0,
    hands,
    impact,
    paletteBlend: paletteBlendAtAge(age),
    shakeTaskActive: age >= 52 && age <= 67,
    clearMonBgTaskActive: age >= 74 && age <= 76,
    updateMonBgTaskActive: age >= 7 && age <= 76,
    targetOffset: { x2: targetShakeX2(age), y2: 0 },
    targetBaselineX2:
      attackerSide === "player" && age < 52 ? 1 : 0,
    soundEvents: age === 10
      ? [{
          age: 10,
          song: "SE_M_MEGA_KICK",
          pan: targetPan,
          player: "SE1",
        }]
      : age === 52
        ? [{
            age: 52,
            song: "SE_M_RAZOR_WIND",
            pan: targetPan,
            player: "SE1",
          }]
        : [],
    battlerDisplayAge: age - 1,
  };
}
