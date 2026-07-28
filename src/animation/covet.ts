import { charmAtAge, type CharmPoint, type CharmState } from "./charm.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export const COVET_HEART_LOAD_AGE = 0;
export const COVET_ITEM_BAG_LOAD_AGE = 3;
export const COVET_CHARM_START_AGE = 6;
export const COVET_SHAKE_START_AGE = 99;
export const COVET_ASSET_UNLOAD_AGE = 134;
export const COVET_FRAME_COUNT = COVET_ASSET_UNLOAD_AGE + 1;

export interface CovetState {
  readonly heartAssetLoaded: boolean;
  readonly itemBagAssetLoaded: boolean;
  readonly charm: CharmState;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
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
  const dizzyRestart = shakeAge >= 0 && shakeAge <= 8 && shakeAge % 4 === 0;
  return {
    heartAssetLoaded: age >= COVET_HEART_LOAD_AGE
      && age < COVET_ASSET_UNLOAD_AGE,
    itemBagAssetLoaded: age >= COVET_ITEM_BAG_LOAD_AGE
      && age < COVET_ASSET_UNLOAD_AGE,
    charm,
    targetOffset: shakeActive ? shake : { x2: 0, y2: 0 },
    shakeActive,
    soundRestart: charm.soundRestart ?? (dizzyRestart ? "SE_M_DIZZY_PUNCH" : null),
    soundPanSide: charm.soundRestart
      ? attackerSide
      : dizzyRestart ? (attackerSide === "player" ? "opponent" : "player") : null,
    active: age >= 0 && age <= COVET_ASSET_UNLOAD_AGE,
  };
}
