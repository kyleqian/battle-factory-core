import { shakeMonOffsetAtTick } from "./shakeMon.ts";

/** Complete source-relative presentation state for `Move_DOUBLE_KICK`. */
export type DoubleKickSide = "player" | "opponent";

export interface DoubleKickRandomWords {
  readonly x: number;
  readonly y: number;
  readonly xSign: number;
  readonly ySign: number;
}

export interface DoubleKickGeometry {
  readonly targetSide: DoubleKickSide;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly targetDimensions: Readonly<{ width: number; height: number }>;
  readonly fistRandom: DoubleKickRandomWords;
}

export interface DoubleKickSprite {
  readonly slot: 3;
  readonly childSlot: 4;
  readonly x: number;
  readonly y: number;
  readonly animation: 1;
  readonly remaining: number;
}

export interface DoubleKickState {
  readonly active: boolean;
  readonly handsAndFeetLoaded: boolean;
  readonly impactLoaded: boolean;
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetX2: number;
  readonly shakeTaskActive: boolean;
  readonly fist: DoubleKickSprite | null;
  readonly hitsplat: Readonly<{ slot: 4; parentSlot: 3; x: number; y: number }> | null;
  readonly soundEvents: readonly Readonly<{ age: 10; song: "SE_M_VITAL_THROW2"; panTarget: true }>[];
}

export const DOUBLE_KICK_FRAME_COUNT = 36;
export const DOUBLE_KICK_MONBG_AGE = 7;
export const DOUBLE_KICK_EFFECT_AGE = 10;
export const DOUBLE_KICK_FIST_END_AGE = 30;
export const DOUBLE_KICK_CLEAR_AGE = 31;

function fistAnchor(geometry: DoubleKickGeometry): Readonly<{ x: number; y: number }> {
  const xModulo = Math.floor(geometry.targetDimensions.width / 2);
  const yModulo = Math.floor(geometry.targetDimensions.height / 4);
  let x = geometry.fistRandom.x % xModulo;
  let y = geometry.fistRandom.y % yModulo;
  if (geometry.fistRandom.xSign & 1) x = -x;
  if (geometry.fistRandom.ySign & 1) y = -y;
  if (geometry.targetSide === "player") y -= 16;
  return { x: geometry.targetCenter.x + x, y: geometry.targetCenter.y + y };
}

/**
 * Pure port of the pointer-bounded 0x32-byte body. `age` is relative to the
 * first in-bounds source row. The reducer consumes caller-supplied Random2
 * words and never advances or owns animation/gameplay RNG.
 */
export function doubleKickAtAge(age: number, geometry: DoubleKickGeometry): DoubleKickState {
  const active = age >= 0 && age < DOUBLE_KICK_FRAME_COUNT - 1;
  const spriteActive = active && age >= DOUBLE_KICK_EFFECT_AGE && age < DOUBLE_KICK_FIST_END_AGE;
  const anchor = fistAnchor(geometry);
  const fist: DoubleKickSprite | null = spriteActive ? {
    slot: 3,
    childSlot: 4,
    x: anchor.x,
    y: anchor.y,
    animation: 1,
    remaining: DOUBLE_KICK_FIST_END_AGE - age - 1,
  } : null;
  const shakeTick = age - DOUBLE_KICK_EFFECT_AGE + 1;
  const shakeTaskActive = active && age >= DOUBLE_KICK_EFFECT_AGE && age < 20;
  return {
    active,
    handsAndFeetLoaded: active && age >= 1,
    impactLoaded: active && age >= 4,
    targetOnMonBg: active && age >= DOUBLE_KICK_MONBG_AGE && age < DOUBLE_KICK_CLEAR_AGE,
    alpha: active && age >= DOUBLE_KICK_EFFECT_AGE && age < DOUBLE_KICK_CLEAR_AGE
      ? { eva: 12, evb: 8 }
      : null,
    targetX2: age >= DOUBLE_KICK_EFFECT_AGE
      ? shakeMonOffsetAtTick(4, 0, 6, 1, shakeTick).x2
      : 0,
    shakeTaskActive,
    fist,
    hitsplat: fist ? { slot: 4, parentSlot: 3, x: fist.x, y: fist.y } : null,
    soundEvents: age === DOUBLE_KICK_EFFECT_AGE
      ? [{ age: 10, song: "SE_M_VITAL_THROW2", panTarget: true }]
      : [],
  };
}
