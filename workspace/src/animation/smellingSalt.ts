import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export const SMELLING_SALT_FIRST_INACTIVE_AGE = 120;
export const SMELLING_SALT_HAND_FIRST_AGE = 7;
export const SMELLING_SALT_HAND_LAST_AGE = 65;
export const SMELLING_SALT_SQUISH_FIRST_AGE = 41;
export const SMELLING_SALT_SQUISH_LAST_AGE = 65;
export const SMELLING_SALT_EXCLAMATION_FIRST_AGE = 73;
export const SMELLING_SALT_EXCLAMATION_LAST_AGE = 111;

export interface SmellingSaltHand {
  readonly side: "left" | "right";
  readonly x2: number;
  readonly hFlip: boolean;
}

export interface SmellingSaltState {
  readonly age: number;
  readonly scriptActive: boolean;
  readonly sourceOffset: number | null;
  readonly hands: readonly SmellingSaltHand[];
  readonly squishTaskActive: boolean;
  readonly targetMatrix: Readonly<{ a: number; d: number }>;
  readonly targetY2: number;
  /** null means the squish task has not written x2 on this source row. */
  readonly squishTargetX2: number | null;
  readonly shakeTargetX2: number;
  readonly exclamation: null | Readonly<{ visible: boolean }>;
}

function sourceOffset(age: number): number | null {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 6;
  if (age <= 40) return 34;
  if (age <= 66) return 51;
  if (age <= 72) return 54;
  if (age <= SMELLING_SALT_FIRST_INACTIVE_AGE) return 90;
  return null;
}

function handX2(callbacks: number, direction: -1 | 1): number {
  let state = 0;
  let timer = 0;
  let step = 0;
  let squishes = 2;
  let x2 = 0;
  for (let callback = 0; callback < callbacks; callback += 1) {
    if (state === 0) {
      timer += 1;
      if (timer > 1) {
        timer = 0;
        x2 += direction;
        step += 1;
        if (step === 12) state = 1;
      }
    } else if (state === 1) {
      timer += 1;
      if (timer === 8) { timer = 0; state = 2; }
    } else if (state === 2) {
      x2 -= direction * 4;
      timer += 1;
      if (timer === 6) { timer = 0; state = 3; }
    } else {
      x2 += direction * 3;
      timer += 1;
      if (timer === 8) {
        squishes -= 1;
        if (squishes > 0) { timer = 0; state = 2; }
      }
    }
  }
  return x2;
}

function squish(age: number, verticalSpan: number): Pick<SmellingSaltState, "targetMatrix" | "targetY2" | "squishTargetX2"> {
  const start = age >= 54 ? 54 : 41;
  const local = age - start;
  if (age < 41 || age > 65 || age === 53) {
    return { targetMatrix: { a: 256, d: 256 }, targetY2: 0, squishTargetX2: age === 53 ? 0 : null };
  }
  const d = local < 6 ? 256 - 16 * (local + 1) : 160 + 16 * (local - 5);
  const scaledHeight = Math.trunc((verticalSpan << 8) / d);
  return {
    targetMatrix: { a: 256, d },
    targetY2: Math.trunc((verticalSpan - scaledHeight) / 2),
    squishTargetX2: local === 0 ? null : 2,
  };
}

/** Pure source-age port of the complete Move_SMELLING_SALT visual body. */
export function smellingSaltAtAge(age: number, targetVerticalSpan = 64): SmellingSaltState {
  const hands = age >= SMELLING_SALT_HAND_FIRST_AGE && age <= SMELLING_SALT_HAND_LAST_AGE
    ? ([
        { side: "left", x2: handX2(age - 6, -1), hFlip: true },
        { side: "right", x2: handX2(age - 6, 1), hFlip: false },
      ] as const)
    : [];
  const affine = squish(age, targetVerticalSpan);
  const exclamationAge = age - SMELLING_SALT_EXCLAMATION_FIRST_AGE;
  return {
    age,
    scriptActive: age >= 0 && age < SMELLING_SALT_FIRST_INACTIVE_AGE,
    sourceOffset: sourceOffset(age),
    hands,
    squishTaskActive: age >= 41 && age <= 65,
    ...affine,
    shakeTargetX2: age >= 73 && age <= 88
      ? shakeMon2OffsetAtTick(2, 0, 6, 2, age - 72).x2
      : 0,
    exclamation: age >= SMELLING_SALT_EXCLAMATION_FIRST_AGE && age <= SMELLING_SALT_EXCLAMATION_LAST_AGE
      ? { visible: Math.floor((exclamationAge + 1) / 8) % 2 === 0 }
      : null,
  };
}
