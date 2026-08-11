import { scaleMonAndRestoreAtAge } from "./bind.ts";
import {
  shakeMon2OffsetAtTick,
  shakeMon2DisplayedOffsetAtAge,
  type ShakeMon2Offset,
} from "./shakeMon2.ts";

/** Source ages are relative to the first Move_LEER source-pointer row. */
export const LEER_SPRITE_FIRST_AGE = 7;
export const LEER_SPRITE_LAST_AGE = 22;
export const LEER_SCALE_FIRST_AGE = 7;
export const LEER_SCALE_LAST_AGE = 25;
export const LEER_SHAKE_FIRST_AGE = 39;
export const LEER_SHAKE_LAST_AGE = 54;
export const LEER_CLEANUP_FIRST_AGE = 56;

export interface LeerSpriteState {
  readonly active: boolean;
  readonly tileOffset: number;
  readonly x: number;
  readonly y: number;
}

export interface LeerState {
  readonly age: number;
  readonly monbg: boolean;
  readonly blend: { readonly eva: number; readonly evb: number } | null;
  readonly attackerScale: number;
  readonly displayedAttackerScale: number;
  readonly targetOffset: ShakeMon2Offset;
  readonly displayedTargetOffset: ShakeMon2Offset;
  readonly sprite: LeerSpriteState;
  readonly audio: readonly { readonly age: number; readonly song: "SE_M_LEER"; readonly pan: number }[];
}

function leerSpriteAtAge(age: number, attackerSide: "player" | "opponent"): LeerSpriteState {
  const x = attackerSide === "player" ? 96 : 152;
  const y = attackerSide === "player" ? 76 : 34;
  if (age < LEER_SPRITE_FIRST_AGE || age > LEER_SPRITE_LAST_AGE) {
    return { active: false, tileOffset: 0, x, y };
  }
  // This is the observed software-OAM animation state of AnimLeer: the
  // initial callback row holds cell 0 for two rows and its terminal cell is
  // retained through the callback's one-row destroy handoff.
  const tileOffset = age <= 8 ? 0
    : age <= 11 ? 16
      : age <= 14 ? 32
        : age <= 17 ? 48
          : 64;
  return { active: true, tileOffset, x, y };
}

function scaleAtAge(age: number): number {
  if (age < LEER_SCALE_FIRST_AGE || age > LEER_SCALE_LAST_AGE) return 256;
  return scaleMonAndRestoreAtAge(age - LEER_SCALE_FIRST_AGE, {
    xDelta: -5,
    yDelta: -5,
    duration: 10,
  }).xScale;
}

function targetShakeAtAge(age: number): ShakeMon2Offset {
  if (age < LEER_SHAKE_FIRST_AGE || age > LEER_SHAKE_LAST_AGE) return { x2: 0, y2: 0 };
  return shakeMon2OffsetAtTick(1, 0, 9, 1, age - LEER_SHAKE_FIRST_AGE + 1);
}

/** Complete source-derived reducer for the nine-component Move_LEER body. */
export function leerAtAge(age: number, attackerSide: "player" | "opponent"): LeerState {
  const pan = attackerSide === "player" ? -64 : 63;
  return {
    age,
    monbg: age >= 4 && age < LEER_CLEANUP_FIRST_AGE,
    blend: age >= LEER_SCALE_FIRST_AGE && age < LEER_CLEANUP_FIRST_AGE ? { eva: 8, evb: 8 } : null,
    attackerScale: scaleAtAge(age),
    displayedAttackerScale: scaleAtAge(age - 1),
    targetOffset: age < LEER_SHAKE_FIRST_AGE
      ? { x2: attackerSide === "player" ? 1 : 0, y2: 0 }
      : targetShakeAtAge(age),
    displayedTargetOffset: age <= LEER_SHAKE_FIRST_AGE
      ? { x2: attackerSide === "player" ? 1 : 0, y2: 0 }
      : shakeMon2DisplayedOffsetAtAge(1, 0, 9, 1, age, LEER_SHAKE_FIRST_AGE),
    sprite: leerSpriteAtAge(age, attackerSide),
    audio: age === 4 ? [{ age, song: "SE_M_LEER", pan }] : [],
  };
}
