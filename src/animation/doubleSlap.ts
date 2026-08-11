import { shakeMonOffsetAtTick } from "./shakeMon.ts";

export type DoubleSlapSide = "player" | "opponent";
export type DoubleSlapMoveTurn = number;

export interface DoubleSlapGeometry {
  readonly attackerSide: DoubleSlapSide;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

export interface DoubleSlapState {
  readonly active: boolean;
  readonly moveTurn: DoubleSlapMoveTurn;
  readonly branch: "left" | "right";
  readonly impactLoaded: boolean;
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetX2: number;
  readonly shakeTaskActive: boolean;
  readonly hitsplat: Readonly<{ slot: 3; x: number; y: number; matrix: 372 }> | null;
  readonly soundEvents: readonly Readonly<{ age: 7; song: "SE_M_DOUBLE_SLAP"; panTarget: true }>[];
}

export const DOUBLE_SLAP_FRAME_COUNT = 34;
export const DOUBLE_SLAP_EFFECT_AGE = 7;
export const DOUBLE_SLAP_CLEAR_AGE = 29;

/** Pure presentation port; the controller owns the natural 2-5 hit sequence. */
export function doubleSlapAtAge(
  age: number,
  moveTurn: DoubleSlapMoveTurn,
  geometry: DoubleSlapGeometry,
): DoubleSlapState {
  const active = age >= 0 && age < DOUBLE_SLAP_FRAME_COUNT - 1;
  const left = (moveTurn & 1) === 0;
  const mirror = geometry.attackerSide === "player" ? 1 : -1;
  const effectActive = active && age >= DOUBLE_SLAP_EFFECT_AGE;
  const hitsplatActive = effectActive && age <= 16;
  const shakeTick = age - DOUBLE_SLAP_EFFECT_AGE + 1;
  return {
    active,
    moveTurn,
    branch: left ? "left" : "right",
    impactLoaded: active && age >= 1,
    targetOnMonBg: active && age >= 4 && age < DOUBLE_SLAP_CLEAR_AGE,
    alpha: effectActive && age < DOUBLE_SLAP_CLEAR_AGE ? { eva: 12, evb: 8 } : null,
    targetX2: effectActive ? shakeMonOffsetAtTick(3, 0, 6, 1, shakeTick).x2 : 0,
    shakeTaskActive: effectActive && age < 17,
    hitsplat: hitsplatActive ? {
      slot: 3,
      x: geometry.targetCenter.x + mirror * (left ? -8 : 8),
      y: geometry.targetCenter.y,
      matrix: 372,
    } : null,
    soundEvents: age === DOUBLE_SLAP_EFFECT_AGE
      ? [{ age: 7, song: "SE_M_DOUBLE_SLAP", panTarget: true }]
      : [],
  };
}
