import { shakeMonOffsetAtTick } from "./shakeMon.ts";

export type TripleKickSide = "player" | "opponent";
export type TripleKickMoveTurn = 0 | 1 | 2;

export interface TripleKickGeometry {
  readonly attackerSide: TripleKickSide;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

export interface TripleKickState {
  readonly active: boolean;
  readonly moveTurn: TripleKickMoveTurn;
  readonly branch: "left" | "right" | "center";
  readonly handsAndFeetLoaded: boolean;
  readonly impactLoaded: boolean;
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetX2: number;
  readonly shakeTaskActive: boolean;
  readonly foot: Readonly<{ slot: 3; x: number; y: number; animation: 1; remaining: number }> | null;
  readonly hitsplat: Readonly<{ slot: 4; x: number; y: number; matrix: 303 | 372 }> | null;
  readonly soundEvents: readonly Readonly<{ age: 10; song: "SE_M_VITAL_THROW2"; panTarget: true }>[];
}

export const TRIPLE_KICK_FRAME_COUNT = 37;
export const TRIPLE_KICK_EFFECT_AGE = 10;
export const TRIPLE_KICK_CLEAR_AGE = 32;

const SPECS = {
  0: { branch: "left", footX: -16, footY: -8, splatY: -16, shakeX: 4, shakeTimes: 6, matrix: 372 },
  1: { branch: "right", footX: 8, footY: 8, splatY: 0, shakeX: 4, shakeTimes: 6, matrix: 372 },
  2: { branch: "center", footX: 0, footY: 0, splatY: -8, shakeX: 6, shakeTimes: 8, matrix: 303 },
} as const;

/** Pure port of the complete pointer-bounded script for one caller-selected hit. */
export function tripleKickAtAge(
  age: number,
  moveTurn: TripleKickMoveTurn,
  geometry: TripleKickGeometry,
): TripleKickState {
  const spec = SPECS[moveTurn];
  const active = age >= 0 && age < TRIPLE_KICK_FRAME_COUNT - 1;
  const mirror = geometry.attackerSide === "player" ? 1 : -1;
  const effectActive = active && age >= TRIPLE_KICK_EFFECT_AGE;
  const footActive = effectActive && age <= 30;
  const hitsplatActive = effectActive && age <= 19;
  const shakeTick = age - TRIPLE_KICK_EFFECT_AGE + 1;
  const shakeEndAge = moveTurn === 2 ? 24 : 20;
  return {
    active,
    moveTurn,
    branch: spec.branch,
    handsAndFeetLoaded: active && age >= 1,
    impactLoaded: active && age >= 4,
    targetOnMonBg: active && age >= 7 && age < TRIPLE_KICK_CLEAR_AGE,
    alpha: active && age >= TRIPLE_KICK_EFFECT_AGE && age < TRIPLE_KICK_CLEAR_AGE
      ? { eva: 12, evb: 8 }
      : null,
    targetX2: effectActive
      ? shakeMonOffsetAtTick(spec.shakeX, 0, spec.shakeTimes, 1, shakeTick).x2
      : 0,
    shakeTaskActive: effectActive && age < shakeEndAge,
    foot: footActive ? {
      slot: 3,
      x: geometry.targetCenter.x + mirror * spec.footX,
      y: geometry.targetCenter.y + spec.footY,
      animation: 1,
      remaining: Math.max(0, 29 - age),
    } : null,
    hitsplat: hitsplatActive ? {
      slot: 4,
      x: geometry.targetCenter.x + mirror * spec.footX,
      y: geometry.targetCenter.y + spec.splatY,
      matrix: spec.matrix,
    } : null,
    soundEvents: age === TRIPLE_KICK_EFFECT_AGE
      ? [{ age: 10, song: "SE_M_VITAL_THROW2", panTarget: true }]
      : [],
  };
}
