import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";

export type ViceGripSide = "player" | "opponent";

export interface ViceGripPincer {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly frame: 0 | 1 | 2;
  readonly hFlip: boolean;
  readonly vFlip: boolean;
  readonly oamSlot: 3 | 4;
}

export interface ViceGripState {
  readonly active: boolean;
  readonly cutLoaded: boolean;
  readonly impactLoaded: boolean;
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly pincers: readonly ViceGripPincer[];
  readonly hitsplat: Readonly<{
    x: number;
    y: number;
    matrix: 372;
    oamSlot: 5;
  }> | null;
  readonly targetOffset: Readonly<{ x2: number; y2: 0 }>;
  readonly sound: "SE_M_VICEGRIP" | null;
  readonly soundPanSide: ViceGripSide | null;
}

/** Pointer entry through the first `gAnimScriptActive == FALSE` cleanup. */
export const VICE_GRIP_FRAME_COUNT = 42;

function pincerFrame(localAge: number): 0 | 1 | 2 {
  return localAge < 2 ? 0 : localAge < 5 ? 1 : 2;
}

function pincer(
  localAge: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  invert: boolean,
): ViceGripPincer {
  const callbacks = Math.min(localAge + 1, 6);
  const direction = invert ? 1 : -1;
  return {
    x: targetCenter.x + (invert ? -32 : 32),
    y: targetCenter.y + (invert ? 32 : -32),
    x2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(direction * 16, 6),
      callbacks,
      6,
    ),
    y2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(direction * -16, 6),
      callbacks,
      6,
    ),
    frame: pincerFrame(localAge),
    hFlip: invert,
    vFlip: invert,
    oamSlot: invert ? 4 : 3,
  };
}

/** Pure source-age reducer for the complete isolated `Move_VICE_GRIP` body. */
export function viceGripAtAge(
  age: number,
  targetSide: ViceGripSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): ViceGripState {
  const localPincerAge = age - 10;
  return {
    active: age >= 0 && age < VICE_GRIP_FRAME_COUNT - 1,
    cutLoaded: age >= 1 && age <= 40,
    impactLoaded: age >= 4 && age <= 40,
    targetOnMonBg: age >= 7 && age <= 36,
    alpha: age >= 10 && age <= 36 ? { eva: 12, evb: 8 } : null,
    pincers:
      localPincerAge >= 0 && localPincerAge <= 25
        ? [
            pincer(localPincerAge, targetCenter, false),
            pincer(localPincerAge, targetCenter, true),
          ]
        : [],
    hitsplat:
      age >= 21 && age <= 30
        ? { x: targetCenter.x, y: targetCenter.y, matrix: 372, oamSlot: 5 }
        : null,
    // The source task installs -x first for this target-relative call, then
    // toggles every two callbacks before restoring zero on destruction.
    targetOffset:
      age >= 21 && age <= 28
        ? { x2: Math.floor((age - 21) / 2) % 2 === 0 ? -2 : 2, y2: 0 }
        : { x2: 0, y2: 0 },
    sound: age === 10 ? "SE_M_VICEGRIP" : null,
    soundPanSide: age === 10 ? targetSide : null,
  };
}
