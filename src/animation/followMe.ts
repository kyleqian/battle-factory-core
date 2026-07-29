import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  metronomeFingerMatrixAtAge,
  type MetronomeMatrix,
  type MetronomePoint,
  type MetronomeSide,
} from "./metronome.ts";

export interface FollowMeFinger {
  readonly slot: 3;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly subpriority: number;
  readonly matrix: MetronomeMatrix;
}

export interface FollowMeState {
  readonly active: boolean;
  readonly fingerLoaded: boolean;
  readonly finger: FollowMeFinger | null;
  readonly soundRestart: "SE_M_TAIL_WHIP" | "SE_M_ATTRACT" | null;
  readonly soundPanSide: MetronomeSide | null;
}

export const FOLLOW_ME_FRAME_COUNT = 185;
export const FOLLOW_ME_FINGER_CREATION_AGE = 4;

function fingerMatrix(age: number): MetronomeMatrix | null {
  if (age >= 4 && age <= 11) {
    return metronomeFingerMatrixAtAge(age + 11);
  }
  if (age >= 12 && age <= 106) {
    return { a: 256, b: 0, c: 0, d: 256 };
  }
  if (age >= 107 && age <= 182) {
    return metronomeFingerMatrixAtAge(age - 66);
  }
  return null;
}

function sineOffset(age: number): number {
  if (age < 27 || age > 89) return 0;
  const phase = (age - 26) * 4;
  const x1 = GBA_SINE_TABLE_256[phase]!;
  const x2 = x1 >> 3;
  return x2 + (x2 >> 1);
}

export function followMeAtAge(
  age: number,
  attackerSide: MetronomeSide,
  attackerTop: MetronomePoint,
): FollowMeState {
  const matrix = fingerMatrix(age);
  const baseSubpriority = attackerSide === "player" ? 28 : 38;
  const crossedBehindAttacker = age >= 46 && age <= 65;
  const soundRestart = age === 4 ? "SE_M_TAIL_WHIP"
    : age === 24 ? "SE_M_ATTRACT"
    : age === 97 || age === 119 || age === 141 ? "SE_M_TAIL_WHIP"
    : null;
  return {
    active: age >= 0 && age < 184,
    fingerLoaded: age >= 1 && age < 184,
    finger: matrix ? {
      slot: 3,
      x: attackerTop.x,
      y: Math.max(attackerTop.y, 10),
      x2: sineOffset(age),
      subpriority: baseSubpriority + (crossedBehindAttacker ? 4 : 0),
      matrix,
    } : null,
    soundRestart,
    soundPanSide: soundRestart === null ? null : attackerSide,
  };
}
