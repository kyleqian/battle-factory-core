import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";
import {
  blazeKickSpinningFootMatrixAtAge,
  type BlazeKickAffineMatrix,
} from "./blazeKick.ts";

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

export interface MeteorMashTwinkleVariant {
  readonly tile: 4 | 5;
  readonly y2: number;
}

export interface MeteorMashMiniStar extends MeteorMashTwinkleVariant {
  readonly index: number;
  readonly parentIndex: 0 | 1 | 2;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly invisible: boolean;
}

export interface MeteorMashGeometry {
  readonly targetSide: "player" | "opponent";
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  /** Two Random2 results, reduced to tile/y, for each of 48 source spawns. */
  readonly twinkles?: readonly MeteorMashTwinkleVariant[];
}

export interface MeteorMashState {
  readonly active: boolean;
  readonly background: "battle" | "cosmic";
  readonly fadeCoefficient: number;
  readonly panActive: boolean;
  readonly stars: readonly MeteorMashStar[];
  readonly miniStars: readonly MeteorMashMiniStar[];
  readonly spinningHand: boolean;
  readonly spinningHandWait: number | null;
  readonly spinningHandMatrix: BlazeKickAffineMatrix | null;
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
  // RestoreBg's task runs one row longer when the target is on the player
  // side. The pointer-bounded windows include the following inactive row.
  const terminalAge = geometry.targetSide === "player" ? 214 : 213;
  const inWindow = age >= 0 && age < terminalAge;
  if (!inWindow) {
    return {
      active: false,
      background: "battle",
      fadeCoefficient: 0,
      panActive: false,
      stars: [],
      miniStars: [],
      spinningHand: false,
      spinningHandWait: null,
      spinningHandMatrix: null,
      hitsplat: false,
      targetX2: 0,
      shakeTaskActive: false,
      restoreActive: false,
    };
  }
  const stars = ([0, 1, 2] as const)
    .map((index) => starAtAge(index, age, geometry))
    .filter((star): star is MeteorMashStar => star !== null);
  const spawnEvents = ([0, 1, 2] as const)
    .flatMap((parentIndex) => Array.from({ length: 16 }, (_, spawnIndex) => ({
      parentIndex,
      spawnAge: [
        METEOR_MASH_FIRST_STAR_AGE,
        METEOR_MASH_SECOND_STAR_AGE,
        METEOR_MASH_THIRD_STAR_AGE,
      ][parentIndex]! + spawnIndex * 2,
    })))
    .sort((left, right) => left.spawnAge - right.spawnAge
      || left.parentIndex - right.parentIndex);
  const miniStars = spawnEvents.flatMap((event, index): MeteorMashMiniStar[] => {
    const variant = geometry.twinkles?.[index];
    const localAge = age - event.spawnAge;
    if (!variant || localAge < 0 || localAge > 60) return [];
    const parent = starAtAge(event.parentIndex, event.spawnAge, geometry);
    // The terminal even callback spawns its mini immediately before destroying
    // the parent, so derive that endpoint even though the parent is no longer live.
    const trajectoryAge = event.spawnAge
      - [METEOR_MASH_FIRST_STAR_AGE, METEOR_MASH_SECOND_STAR_AGE, METEOR_MASH_THIRD_STAR_AGE][event.parentIndex]!;
    const args = STAR_ARGS[event.parentIndex];
    const sideSign = geometry.targetSide === "player" ? -1 : 1;
    const initialX = geometry.targetCenter.x + sideSign * args.x;
    const destinationX = geometry.targetCenter.x + sideSign * args.destinationX;
    const initialY = geometry.targetCenter.y - 64;
    const destinationY = geometry.targetCenter.y + 32;
    const x = parent?.x ?? initialX;
    const y = parent?.y ?? initialY;
    const x2 = parent?.x2 ?? truncDiv((destinationX - initialX) * trajectoryAge, 30);
    const y2 = parent?.y2 ?? truncDiv((destinationY - initialY) * trajectoryAge, 30);
    let invisible = false;
    let phase = 0;
    for (let callback = 1; callback <= localAge; callback += 1) {
      if (callback < 30) {
        phase += 1;
        if (phase === 2) {
          invisible = !invisible;
          phase = 0;
        }
      } else {
        if (phase === 2) invisible = false;
        if (phase === 3) {
          invisible = true;
          phase = -1;
        }
        phase += 1;
      }
    }
    return [{
      index,
      parentIndex: event.parentIndex,
      localAge,
      x: x + x2,
      y: y + y2,
      invisible,
      ...variant,
    }];
  });
  const restore = age >= METEOR_MASH_RESTORE_AGE;
  const restoreFallAge = geometry.targetSide === "player" ? 197 : 196;
  const fadeCoefficient = age < 11
    ? 0
    : age <= 27
      ? Math.min(16, age - 11)
      : age <= 30
        ? 16
        : age <= 46
          ? 46 - age
          : age < 176
            ? 0
            : age <= 192
              ? Math.min(16, age - 176)
              : age < restoreFallAge
                ? 16
                : Math.max(0, 16 - (age - restoreFallAge + 1));
  const handWait = age >= METEOR_MASH_THIRD_STAR_AGE && age < 133
    ? Math.max(0, 133 - age)
    : null;
  const hand = age >= METEOR_MASH_THIRD_STAR_AGE && age <= 154;
  const shakeTaskActive = age >= METEOR_MASH_IMPACT_AGE
    && age <= METEOR_MASH_SHAKE_LAST_AGE;
  return {
    active: true,
    background: age >= 29 && age < 194 ? "cosmic" : "battle",
    fadeCoefficient,
    panActive: age >= 10 && age < 20,
    stars,
    miniStars,
    spinningHand: hand,
    spinningHandWait: handWait,
    spinningHandMatrix: hand
      ? (age < 133
        ? blazeKickSpinningFootMatrixAtAge(age - 99)
        : { pa: 256, pb: 0, pc: 0, pd: 256 })
      : null,
    hitsplat: age >= METEOR_MASH_IMPACT_AGE && age <= 133,
    targetX2: shakeTaskActive
      // This invocation's first visible target write is the negative phase at
      // source age 124. The source callback has already consumed one task
      // step by the pointer row; do not inherit the common long-schedule
      // helper's creation anchor.
      ? shakeMon2OffsetAtTick(5, 0, 20, 1, age - METEOR_MASH_IMPACT_AGE + 1).x2
      : 0,
    shakeTaskActive,
    restoreActive: restore,
  };
}
