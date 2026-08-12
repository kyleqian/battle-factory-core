import { shakeMon2DisplayedOffsetAtAge } from "./shakeMon2.ts";

/** Source-relative Move_METEOR_MASH script clock. */
export const METEOR_MASH_FRAME_COUNT = 214;
export const METEOR_MASH_FIRST_STAR_AGE = 48;
export const METEOR_MASH_SECOND_STAR_AGE = 60;
export const METEOR_MASH_THIRD_STAR_AGE = 102;
export const METEOR_MASH_IMPACT_AGE = 124;
export const METEOR_MASH_SHAKE_LAST_AGE = 161;
export const METEOR_MASH_RESTORE_AGE = 175;

export interface MeteorMashStar {
  readonly index: 0 | 1 | 2;
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly callbacks: number;
}

export interface MeteorMashGeometry {
  readonly targetSide: "player" | "opponent";
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

export interface MeteorMashState {
  readonly active: boolean;
  readonly background: "battle" | "cosmic";
  readonly fadeCoefficient: number;
  readonly panActive: boolean;
  readonly stars: readonly MeteorMashStar[];
  readonly spinningHand: boolean;
  readonly spinningHandWait: number | null;
  readonly hitsplat: boolean;
  readonly targetX2: number;
  readonly shakeTaskActive: boolean;
  readonly restoreActive: boolean;
}

const STAR_ARGS = [
  { x: -48, destinationX: 72 },
  { x: -112, destinationX: 8 },
  { x: -80, destinationX: 40 },
] as const;

function truncDiv(numerator: number, denominator: number): number {
  const value = Math.trunc(numerator / denominator);
  return value === 0 ? 0 : value;
}

function starAtAge(
  index: 0 | 1 | 2,
  age: number,
  geometry: MeteorMashGeometry,
): MeteorMashStar | null {
  const start = [
    METEOR_MASH_FIRST_STAR_AGE,
    METEOR_MASH_SECOND_STAR_AGE,
    METEOR_MASH_THIRD_STAR_AGE,
  ][index]!;
  const local = age - start;
  if (local < 0 || local > 29) return null;
  // The source callback evaluates data[5] before incrementing it. The first
  // displayed row therefore reports data[5] == 1 while x2/y2 still use 0.
  const callbacks = local + 1;
  const args = STAR_ARGS[index];
  const sideSign = geometry.targetSide === "player" ? -1 : 1;
  const initialX = geometry.targetCenter.x + sideSign * args.x;
  const destinationX = geometry.targetCenter.x + sideSign * args.destinationX;
  const initialY = geometry.targetCenter.y - 64;
  const destinationY = geometry.targetCenter.y + 32;
  return {
    index,
    slot: [3, 12, 38][index]!,
    x: initialX,
    y: initialY,
    x2: truncDiv((destinationX - initialX) * local, 30),
    y2: truncDiv((destinationY - initialY) * local, 30),
    callbacks,
  };
}

/** Source pointer-relative reducer for the complete unbranched Meteor Mash body. */
export function meteorMashAtAge(
  age: number,
  geometry: MeteorMashGeometry,
): MeteorMashState {
  const inWindow = age >= 0 && age < METEOR_MASH_FRAME_COUNT;
  if (!inWindow) {
    return {
      active: false,
      background: "battle",
      fadeCoefficient: 0,
      panActive: false,
      stars: [],
      spinningHand: false,
      spinningHandWait: null,
      hitsplat: false,
      targetX2: 0,
      shakeTaskActive: false,
      restoreActive: false,
    };
  }
  const stars = ([0, 1, 2] as const)
    .map((index) => starAtAge(index, age, geometry))
    .filter((star): star is MeteorMashStar => star !== null);
  const fadeIn = age >= 10 && age < 44;
  const restore = age >= METEOR_MASH_RESTORE_AGE;
  const fadeCoefficient = restore
    ? Math.max(0, 16 - Math.min(16, age - METEOR_MASH_RESTORE_AGE))
    : fadeIn
      ? Math.min(16, Math.floor((age - 10) / 2))
      : 16;
  const handWait = age >= METEOR_MASH_THIRD_STAR_AGE && age < 133
    ? Math.max(0, 133 - age)
    : null;
  const hand = age >= METEOR_MASH_THIRD_STAR_AGE && age <= 154;
  const shakeTaskActive = age >= METEOR_MASH_IMPACT_AGE
    && age <= METEOR_MASH_SHAKE_LAST_AGE;
  return {
    active: true,
    background: restore ? "battle" : "cosmic",
    fadeCoefficient,
    panActive: age >= 10 && age < 20,
    stars,
    spinningHand: hand,
    spinningHandWait: handWait,
    hitsplat: age >= METEOR_MASH_IMPACT_AGE && age <= 133,
    targetX2: shakeTaskActive
      ? shakeMon2DisplayedOffsetAtAge(5, 0, 20, 1, age, METEOR_MASH_IMPACT_AGE).x2
      : 0,
    shakeTaskActive,
    restoreActive: restore,
  };
}
