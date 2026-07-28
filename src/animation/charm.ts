import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

/** Source-shaped reducer for `Move_CHARM`; age 0 is its first displayed body. */
export type CharmSide = "player" | "opponent";

export interface CharmPoint {
  readonly x: number;
  readonly y: number;
}

export interface CharmMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

export interface CharmHeart {
  readonly identity: `heart-${number}`;
  readonly creationOrder: number;
  readonly slot: number;
  readonly age: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data0: number;
  readonly data1: number;
  readonly data2: number;
}

export interface CharmRockState {
  readonly active: boolean;
  readonly x2: number;
  readonly y2: number;
  readonly rotation: number;
  readonly matrix: CharmMatrix;
}

export interface CharmState {
  readonly assetsLoaded: boolean;
  readonly visualActive: boolean;
  readonly rock: CharmRockState;
  readonly hearts: readonly CharmHeart[];
  readonly soundRestart: "SE_M_CHARM" | null;
  readonly soundPanSide: CharmSide | null;
}

export const CHARM_HEART_CREATION_AGES = [0, 17, 34] as const;
export const CHARM_BODY_FRAME_COUNT = 93;
export const CHARM_TEARDOWN_AGE = CHARM_BODY_FRAME_COUNT - 1;

const gbaSin = (angle: number): number =>
  GBA_SINE_TABLE_256[(angle >> 8) & 0xff]!;

function matrixAtRotation(rotation: number): CharmMatrix {
  const sin = gbaSin(rotation);
  const cos = gbaSin(rotation + 0x4000);
  return { a: cos, b: -sin, c: sin, d: cos };
}

/**
 * Literal `AnimTask_RockMonBackAndForth(attacker, 2, 0)` state. The task
 * callback runs once before the first display and resets on display age 64.
 */
export function rockMonBackAndForthAtAge(
  age: number,
  side: CharmSide,
): CharmRockState {
  if (age < 0 || age >= 64) {
    return {
      active: false,
      x2: 0,
      y2: 0,
      rotation: 0,
      matrix: { a: 256, b: 0, c: 0, d: 256 },
    };
  }
  const direction = side === "player" ? 1 : -1;
  let x2 = 0;
  let rotation = 0;
  for (let callback = 0; callback <= age; callback++) {
    const cycleAge = callback & 31;
    if (cycleAge < 8) {
      x2 += 2 * direction;
      rotation -= 0x100 * direction;
    } else if (cycleAge < 24) {
      x2 -= 2 * direction;
      rotation += 0x100 * direction;
    } else {
      x2 += 2 * direction;
      rotation -= 0x100 * direction;
    }
  }
  const matrix = matrixAtRotation(rotation);
  return {
    active: true,
    x2,
    y2: Math.abs(matrix.c) >> 3,
    rotation,
    matrix,
  };
}

/** Literal `gMagentaHeartSpriteTemplate` / `AnimMagentaHeart` callback. */
export function magentaHeartAtAge(
  age: number,
  index: number,
  side: CharmSide,
  attackerCenter: CharmPoint,
): CharmHeart | null {
  const creationAge = CHARM_HEART_CREATION_AGES[index];
  if (creationAge === undefined) return null;
  const localAge = age - creationAge;
  if (localAge < 0 || localAge >= 58) return null;
  const scriptX = [0, -20, 20][index]!;
  const x = attackerCenter.x
    + (side === "opponent" ? -scriptX : scriptX);
  const data1 = (14 + 7 * localAge) & 0xff;
  const data2 = -0x100 - 0x80 * localAge;
  return {
    identity: `heart-${index}`,
    creationOrder: index,
    slot: 3 + index,
    age: localAge,
    x,
    y: attackerCenter.y + 20,
    x2: (GBA_SINE_TABLE_256[(data1 - 7) & 0xff]! * 8) >> 8,
    // The callback writes y2 before subtracting 0x80 from stored data2.
    y2: (-0x80 - 0x80 * localAge) >> 8,
    data0: localAge + 2,
    data1,
    data2,
  };
}

export function charmAtAge(
  age: number,
  side: CharmSide,
  attackerCenter: CharmPoint,
): CharmState {
  const hearts = CHARM_HEART_CREATION_AGES.map((_, index) =>
    magentaHeartAtAge(age, index, side, attackerCenter))
    .filter((heart): heart is CharmHeart => heart !== null);
  return {
    assetsLoaded: age >= 0 && age <= CHARM_TEARDOWN_AGE,
    visualActive: age >= 0 && age < CHARM_TEARDOWN_AGE,
    rock: rockMonBackAndForthAtAge(age, side),
    hearts,
    soundRestart: CHARM_HEART_CREATION_AGES.includes(age as never)
      ? "SE_M_CHARM"
      : null,
    soundPanSide: CHARM_HEART_CREATION_AGES.includes(age as never) ? side : null,
  };
}
