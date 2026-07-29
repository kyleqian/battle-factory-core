import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type SweetKissSide = "player" | "opponent";
export interface SweetKissPoint { readonly x: number; readonly y: number }

export interface SweetKissAngel {
  readonly slot: 3;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data0: number;
  readonly data2: number;
  readonly callback: "AnimAngel";
}

export interface SweetKissHeart {
  readonly index: number;
  readonly slot: 3 | 4 | 5 | 7 | 9 | 10;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data0: 1;
  readonly data1: number;
  readonly data2: number;
  readonly data3: number;
  readonly data4: number;
  readonly invisible: boolean;
  readonly callback: "AnimParticleBurst";
}

export interface SweetKissState {
  readonly active: boolean;
  readonly redHeartLoaded: boolean;
  readonly angelLoaded: boolean;
  readonly scriptOffset: 0 | 3 | 6 | 23 | 29 | 33 | 104;
  readonly angel: SweetKissAngel | null;
  readonly hearts: readonly SweetKissHeart[];
  readonly sound:
    | "SE_M_HEAL_BELL"
    | "SE_M_ATTRACT"
    | null;
  readonly soundPanSide: SweetKissSide | null;
}

export const SWEET_KISS_FRAME_COUNT = 159;
export const SWEET_KISS_FIRST_INACTIVE_AGE = 158;
export const SWEET_KISS_ANGEL_FIRST_AGE = 7;
export const SWEET_KISS_ANGEL_LAST_AGE = 105;
export const SWEET_KISS_HEART_FIRST_AGE = 107;
export const SWEET_KISS_HEART_LAST_AGE = 146;

const HEART_ARGS = [
  { data1: 160, data2: -30, slot: 3 },
  { data1: -256, data2: -42, slot: 4 },
  { data1: 128, data2: -14, slot: 5 },
  { data1: 416, data2: -38, slot: 7 },
  { data1: -128, data2: -22, slot: 9 },
  { data1: -384, data2: -31, slot: 10 },
] as const;

function scriptOffsetAtAge(age: number): SweetKissState["scriptOffset"] {
  if (age <= 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 6;
  if (age <= 31) return 23;
  if (age <= 56) return 29;
  if (age <= 106) return 33;
  return 104;
}

function gbaSin(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function angelAtAge(
  age: number,
  targetCenter: SweetKissPoint,
): SweetKissAngel | null {
  if (age < SWEET_KISS_ANGEL_FIRST_AGE || age > SWEET_KISS_ANGEL_LAST_AGE) {
    return null;
  }
  const data0 = age - 5;
  const angle = (data0 * 10) & 0xff;
  const data2 = Math.max(0, data0 - 90);
  let x2 = gbaSin(angle, 80) >> 8;
  if (data0 > 90) x2 -= Math.trunc(data2 / 2);
  const y2 = data0 < 80
    ? Math.trunc(data0 / 2) + (gbaSin(angle + 64, 80) >> 8)
    : 39;
  return {
    slot: 3,
    x: targetCenter.x + 16,
    y: targetCenter.y - 48,
    x2,
    y2,
    data0,
    data2,
    callback: "AnimAngel",
  };
}

function heartsAtAge(
  age: number,
  targetCenter: SweetKissPoint,
): SweetKissHeart[] {
  if (age < SWEET_KISS_HEART_FIRST_AGE || age > SWEET_KISS_HEART_LAST_AGE) {
    return [];
  }
  const steps = age - 106;
  const data3 = steps * 3;
  return HEART_ARGS.map((args, index) => ({
    index,
    slot: args.slot,
    x: targetCenter.x,
    y: targetCenter.y,
    x2: (args.data1 * steps) >> 8,
    y2: gbaSin(data3 - 3, args.data2),
    data0: 1 as const,
    data1: args.data1,
    data2: args.data2,
    data3,
    data4: args.data1 * steps,
    invisible: data3 > 100 && data3 % 2 !== 0,
    callback: "AnimParticleBurst" as const,
  }));
}

/**
 * Pure source-relative port of the complete `Move_SWEET_KISS` presentation
 * body. The target point is the resolved `BATTLER_COORD_X_2/Y_PIC_OFFSET`;
 * confusion state and gameplay RNG stay outside this reducer.
 */
export function sweetKissAtAge(
  age: number,
  targetSide: SweetKissSide,
  targetCenter: SweetKissPoint,
): SweetKissState {
  const sound = age === 7 || age === 32 || age === 57
    ? "SE_M_HEAL_BELL"
    : age === 107 ? "SE_M_ATTRACT" : null;
  return {
    active: age >= 0 && age < SWEET_KISS_FIRST_INACTIVE_AGE,
    redHeartLoaded: age >= 0 && age < SWEET_KISS_FRAME_COUNT,
    angelLoaded: age >= 4 && age < SWEET_KISS_FRAME_COUNT,
    scriptOffset: scriptOffsetAtAge(age),
    angel: angelAtAge(age, targetCenter),
    hearts: heartsAtAge(age, targetCenter),
    sound,
    soundPanSide: sound ? targetSide : null,
  };
}
