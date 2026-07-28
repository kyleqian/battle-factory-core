import { charmAtAge, type CharmPoint, type CharmState } from "./charm.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export const COVET_HEART_LOAD_AGE = 0;
export const COVET_ITEM_BAG_LOAD_AGE = 3;
export const COVET_CHARM_START_AGE = 6;
export const COVET_SHAKE_START_AGE = 99;
export const COVET_CLEANUP_AGE = 113;
export const COVET_FRAME_COUNT = COVET_CLEANUP_AGE + 1;

export interface CovetState {
  readonly heartAssetLoaded: boolean;
  readonly itemBagAssetLoaded: boolean;
  readonly charm: CharmState;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  /** Prior OAM transfer, including the creation display's initial +offset. */
  readonly displayedTargetOffset: Readonly<{ x2: number; y2: number }>;
  readonly shakeActive: boolean;
  readonly soundRestart: "SE_M_CHARM" | "SE_M_DIZZY_PUNCH" | null;
  readonly soundPanSide: "player" | "opponent" | null;
  readonly active: boolean;
}

/**
 * Source-relative `Move_COVET` reducer. Age zero is the first displayed
 * MAGENTA_HEART load; ITEM_BAG loads three displays later but the script
 * never creates any of its sprite templates.
 */
export function covetAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  attackerCenter: CharmPoint,
): CovetState {
  const charmAge = age - COVET_CHARM_START_AGE;
  const charm = charmAtAge(charmAge, attackerSide, attackerCenter);
  const shakeAge = age - COVET_SHAKE_START_AGE;
  const shake = shakeMon2OffsetAtTick(2, 0, 8, 1, shakeAge + 1);
  const shakeActive = shakeAge >= 0 && shakeAge < 14;
  const displayedShakeAge = age - COVET_SHAKE_START_AGE - 2;
  const displayedTargetOffset = age === COVET_SHAKE_START_AGE + 1
    ? { x2: 2, y2: 0 }
    : displayedShakeAge >= 0 && displayedShakeAge < 14
      ? shakeMon2OffsetAtTick(2, 0, 8, 1, displayedShakeAge + 1)
      : { x2: 0, y2: 0 };
  const dizzyRestart = shakeAge === 0 || shakeAge === 4 || shakeAge === 9;
  return {
    heartAssetLoaded: age >= COVET_HEART_LOAD_AGE
      && age <= COVET_CLEANUP_AGE,
    itemBagAssetLoaded: age >= COVET_ITEM_BAG_LOAD_AGE
      && age <= COVET_CLEANUP_AGE,
    charm,
    targetOffset: shakeActive ? shake : { x2: 0, y2: 0 },
    displayedTargetOffset,
    shakeActive,
    soundRestart: charm.soundRestart ?? (dizzyRestart ? "SE_M_DIZZY_PUNCH" : null),
    soundPanSide: charm.soundRestart
      ? attackerSide
      : dizzyRestart ? (attackerSide === "player" ? "opponent" : "player") : null,
    active: age >= 0 && age <= COVET_CLEANUP_AGE,
  };
}
