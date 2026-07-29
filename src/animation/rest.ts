export type RestSide = "player" | "opponent";

export interface RestMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

export interface RestLetterZ {
  readonly index: 0 | 1 | 2;
  readonly slot: 3 | 4 | 5;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrix: RestMatrix;
  readonly callback: "AnimSleepLetterZ_Step";
}

export interface RestState {
  readonly active: boolean;
  readonly letterZLoaded: boolean;
  readonly scriptOffset: 0 | 7 | 26 | 45 | 62 | 63;
  readonly letters: readonly RestLetterZ[];
  readonly soundRestart: "SE_M_SNORE" | null;
  readonly soundPanSide: RestSide | null;
}

export const REST_FRAME_COUNT = 110;
export const REST_LETTER_SPAWN_AGES = [4, 26, 48] as const;
export const REST_LETTER_LIFETIME = 60;

// `ObjAffineSet` results for the source
// AFFINEANIMCMD_FRAME(0x14,0x14,±30,0) followed by
// AFFINEANIMCMD_FRAME(0x8,0x8,∓1,24). These are the 24 Q8.8 inverse
// matrices emitted by the GBA BIOS; the terminal entry is retained after
// AFFINEANIMCMD_END for the rest of each sprite's lifetime.
const MATRIX_A = [
  1771, 1406, 1173, 1012, 892, 800, 728, 669,
  619, 577, 541, 509, 482, 458, 436, 416,
  398, 381, 367, 353, 339, 327, 316, 305,
] as const;
const MATRIX_B = [
  1528, 1154, 916, 750, 628, 535, 461, 401,
  350, 308, 272, 241, 213, 189, 168, 148,
  131, 115, 101, 88, 76, 65, 54, 45,
] as const;

export function restLetterMatrixAtAge(
  localAge: number,
  side: RestSide,
): RestMatrix | null {
  if (localAge < 0 || localAge >= REST_LETTER_LIFETIME) return null;
  const matrixAge = Math.min(localAge, MATRIX_A.length - 1);
  const a = MATRIX_A[matrixAge]!;
  const signedB = MATRIX_B[matrixAge]! * (side === "player" ? 1 : -1);
  return { a, b: signedB, c: -signedB, d: a };
}

function scriptOffsetAtAge(age: number): RestState["scriptOffset"] {
  if (age === 0) return 0;
  if (age <= 3) return 7;
  if (age <= 25) return 26;
  if (age <= 47) return 45;
  if (age <= 108) return 62;
  return 63;
}

/**
 * Pure source-relative port of `Move_REST`. Age zero is the first displayed
 * script frame; age 109 is the first inactive cleanup. The attacker point is
 * the already-resolved `GetBattlerSpriteCoord(..., 2/3)` pair.
 */
export function restAtAge(
  age: number,
  side: RestSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
): RestState {
  const direction = side === "player" ? 1 : -1;
  const letters: RestLetterZ[] = [];
  for (
    let index = 0 as 0 | 1 | 2;
    index < REST_LETTER_SPAWN_AGES.length;
    index = (index + 1) as 0 | 1 | 2
  ) {
    const localAge = age - REST_LETTER_SPAWN_AGES[index]!;
    const matrix = restLetterMatrixAtAge(localAge, side);
    if (matrix === null) continue;
    const priorData0 = localAge * (localAge - 1) / 2;
    letters.push({
      index,
      slot: (3 + index) as 3 | 4 | 5,
      x: attackerCenter.x + direction * 4,
      y: attackerCenter.y - 10,
      x2: direction * Math.trunc(localAge * 2 / 10),
      y2: -Math.trunc(priorData0 / 40),
      matrix,
      callback: "AnimSleepLetterZ_Step",
    });
  }
  return {
    active: age >= 0 && age < REST_FRAME_COUNT - 1,
    letterZLoaded: age >= 1 && age < REST_FRAME_COUNT - 1,
    scriptOffset: scriptOffsetAtAge(age),
    letters,
    soundRestart: age === 1 ? "SE_M_SNORE" : null,
    soundPanSide: age === 1 ? side : null,
  };
}
