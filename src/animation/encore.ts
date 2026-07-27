import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export const ENCORE_SPRITES_FIRST_AGE = 42;
export const ENCORE_SWAY_FIRST_AGE = 60;
export const ENCORE_HANDS_LAST_AGE = 148;
export const ENCORE_SPOTLIGHT_LAST_VISIBLE_AGE = 167;
export const ENCORE_RESTORE_FIRST_AGE = 171;
export const ENCORE_END_AGE = 214;

export interface EncoreHand {
  readonly centerX: number;
  readonly centerY: number;
  readonly hFlip: boolean;
  readonly x2: number;
  readonly remainingClaps: number;
}

export interface EncoreSpotlight {
  readonly centerX: number;
  readonly centerY: number;
  readonly x2: number;
  /** Hardware affine matrix parameters used for inverse texel sampling. */
  readonly pa: number;
  readonly pd: number;
}

export interface EncoreState {
  readonly bldy: number;
  readonly win1Enabled: boolean;
  readonly objWindowEnabled: boolean;
  readonly hands: readonly EncoreHand[];
  readonly spotlight: EncoreSpotlight | null;
  readonly targetY2: number;
  readonly playSe2: boolean;
  readonly playSe2Pan: number | null;
}

function spotlightX2(age: number): number {
  if (age <= 63) return 0;
  let phase = 1;
  let value = 0;
  let count = 0;
  let x2 = 0;
  for (let callbackAge = 64; callbackAge <= age; callbackAge += 1) {
    if (phase === 1 || phase === 3) {
      value += 117;
      x2 = value >> 8;
      count += 1;
      if (count === 21) {
        count = 0;
        phase += 1;
      }
    } else if (phase === 2) {
      value -= 117;
      x2 = value >> 8;
      count += 1;
      if (count === 41) {
        count = 0;
        phase = 3;
      }
    } else if (phase === 4) {
      phase = 5;
    }
  }
  return x2;
}

export function encoreBldyAtAge(age: number): number {
  if (age < 0 || age > ENCORE_END_AGE) return 0;
  if (age <= 40) return Math.min(10, Math.floor((age + 3) / 4));
  if (age < ENCORE_RESTORE_FIRST_AGE) return 10;
  return Math.max(0, 9 - Math.floor((age - ENCORE_RESTORE_FIRST_AGE) / 4));
}

export function encoreHandsAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
): readonly EncoreHand[] {
  const localAge = age - ENCORE_SPRITES_FIRST_AGE;
  if (localAge < 0 || age > ENCORE_HANDS_LAST_AGE) return [];
  const cycle = localAge % 12;
  const leftX2 = cycle <= 5 ? -10 + cycle * 2 : -(cycle - 5) * 2;
  const remainingClaps = 9 - Math.floor((localAge + 1) / 12);
  return [
    {
      centerX: attackerCenter.x - 2,
      centerY: attackerCenter.y,
      hFlip: true,
      x2: leftX2,
      remainingClaps,
    },
    {
      centerX: attackerCenter.x + 2,
      centerY: attackerCenter.y,
      hFlip: false,
      x2: -leftX2,
      remainingClaps,
    },
  ];
}

export function encoreSpotlightAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): EncoreSpotlight | null {
  if (
    age < ENCORE_SPRITES_FIRST_AGE + 1
    || age > ENCORE_SPOTLIGHT_LAST_VISIBLE_AGE
  ) return null;
  let pa = 204;
  if (age <= 62) {
    pa = Math.trunc(0x10000 / (16 * (age - ENCORE_SPRITES_FIRST_AGE)));
  } else if (age >= 149) {
    pa = Math.trunc(0x10000 / (16 * (168 - age)));
  }
  return {
    centerX: targetCenter.x,
    centerY: targetCenter.y - 8,
    x2: spotlightX2(age),
    pa,
    pd: 170,
  };
}

export function encoreTargetY2AtAge(
  age: number,
  attackerSide: "player" | "opponent",
): number {
  if (age < ENCORE_SWAY_FIRST_AGE) return 0;
  let sineIndex = 0;
  let highHalf = 0;
  let lowHalf = 1;
  let sways = 5;
  let y2 = 0;
  for (let callbackAge = ENCORE_SWAY_FIRST_AGE; callbackAge <= age; callbackAge += 1) {
    sineIndex = (sineIndex + 1536) & 0xffff;
    const waveIndex = sineIndex >>> 8;
    const amplitude = attackerSide === "player" ? 8 : -8;
    const sine = (GBA_SINE_TABLE_256[waveIndex]! * amplitude) >> 8;
    const magnitude = Math.abs(sine);
    y2 = attackerSide === "player" ? -magnitude : magnitude;
    if (
      (waveIndex >= 0x80 && highHalf === 0 && lowHalf === 1)
      || (waveIndex < 0x7f && highHalf === 1 && lowHalf === 0)
    ) {
      highHalf ^= 1;
      lowHalf ^= 1;
      sways -= 1;
      if (sways === 0) return 0;
    }
  }
  return y2;
}

export function encoreAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): EncoreState {
  const playSe2 = age === ENCORE_SWAY_FIRST_AGE;
  return {
    bldy: encoreBldyAtAge(age),
    win1Enabled: age >= 0 && age < 212,
    objWindowEnabled: age >= ENCORE_SPRITES_FIRST_AGE && age < 169,
    hands: encoreHandsAtAge(age, attackerCenter),
    spotlight: encoreSpotlightAtAge(age, targetCenter),
    targetY2: encoreTargetY2AtAge(age, attackerSide),
    playSe2,
    playSe2Pan: playSe2 ? (attackerSide === "player" ? 63 : -63) : null,
  };
}
