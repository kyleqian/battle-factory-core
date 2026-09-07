import {
  psychicBgFadeRampAtLocalAge,
  psychicBgPaletteRowAtAge,
  psychicBgRotationCountAtAge,
} from "./psychicBackground.ts";
import type { RgbColor } from "../engine/bg.ts";

export type AmnesiaSide = "player" | "opponent";
export interface AmnesiaPoint { readonly x: number; readonly y: number }

export interface AmnesiaQuestionMark {
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly affine: boolean;
  readonly matrix: readonly [number, number, number, number];
}

export interface AmnesiaState {
  readonly active: boolean;
  readonly resourceLoaded: boolean;
  readonly psychicTaskActive: boolean;
  readonly bgBldy: number;
  readonly bgIsPsychic: boolean;
  readonly questionMark: AmnesiaQuestionMark | null;
  readonly sound: "SE_M_METRONOME" | null;
  readonly soundPanSide: AmnesiaSide | null;
  readonly animationRngAdvances: number;
}

export const AMNESIA_FRAME_COUNT = 216;
const QUESTION_SPAWN_AGE = 52;

const ANGLES = [
  4, 8, 12, 16, 12, 8, 4, 0,
  -4, -8, -12, -16, -12, -8, -4, 0,
] as const;
const MATRIX_BY_ANGLE: Readonly<Record<number, readonly [number, number, number, number]>> = {
  0: [256, 0, 0, 256],
  4: [254, -25, 25, 254], 8: [251, -49, 49, 251],
  12: [244, -74, 74, 244], 16: [236, -97, 97, 236],
  [-4]: [254, 25, -25, 254], [-8]: [251, 49, -49, 251],
  [-12]: [244, 74, -74, 244], [-16]: [236, 97, -97, 236],
};

function questionFrame(local: number): number {
  if (local < 5) return 0;
  if (local < 11) return 1;
  if (local < 17) return 2;
  if (local < 23) return 3;
  if (local < 29) return 4;
  if (local < 35) return 5;
  return 6;
}

function questionAtAge(
  age: number,
  side: AmnesiaSide,
  center: AmnesiaPoint,
  pictureSize: Readonly<{ width: number; height: number }>,
): AmnesiaQuestionMark | null {
  const local = age - QUESTION_SPAWN_AGE;
  if (local < 0 || local > 122) return null;
  const affineLocal = local - 55;
  const affine = affineLocal >= 0 && affineLocal <= 48;
  const angle = affineLocal >= 0 && affineLocal < 48
    ? ANGLES[affineLocal % ANGLES.length]!
    : 0;
  return {
    x: center.x + (side === "player" ? pictureSize.width / 2 : -pictureSize.width / 2),
    y: Math.max(16, center.y - pictureSize.height / 2),
    frame: questionFrame(local),
    affine,
    matrix: MATRIX_BY_ANGLE[angle] ?? MATRIX_BY_ANGLE[0]!,
  };
}

/** Hardware OAM/matrix transfer precedes sprite callbacks by one frame. */
export function amnesiaDisplayedQuestionMarkAtAge(
  age: number,
  side: AmnesiaSide,
  center: AmnesiaPoint,
  pictureSize: Readonly<{ width: number; height: number }>,
): AmnesiaQuestionMark | null {
  return questionAtAge(age - 1, side, center, pictureSize);
}

export function amnesiaBgPaletteRowAtAge(
  basePalette: readonly Readonly<RgbColor>[],
  displayedAge: number,
): Readonly<RgbColor>[] {
  return psychicBgPaletteRowAtAge(
    basePalette,
    psychicBgRotationCountAtAge(displayedAge, Number.POSITIVE_INFINITY, 0),
  );
}

/** Pure source-relative `Move_AMNESIA`; the Sp. Def rise remains gameplay-owned. */
export function amnesiaAtAge(
  age: number,
  side: AmnesiaSide,
  center: AmnesiaPoint,
  pictureSize: Readonly<{ width: number; height: number }>,
): AmnesiaState {
  const sound = age === 52 || age === 107 || age === 123 || age === 139
    ? "SE_M_METRONOME"
    : null;
  return {
    active: age >= 0 && age < AMNESIA_FRAME_COUNT - 1,
    resourceLoaded: age >= 1 && age < AMNESIA_FRAME_COUNT - 1,
    psychicTaskActive: age >= 23 && age <= 194,
    bgBldy: age < 177
      ? psychicBgFadeRampAtLocalAge(age - 5, 16, 19, 35)
      : psychicBgFadeRampAtLocalAge(age - 177, 16, 20, 36),
    bgIsPsychic: age >= 24 && age <= 195,
    questionMark: questionAtAge(age, side, center, pictureSize),
    sound,
    soundPanSide: sound ? side : null,
    animationRngAdvances: Math.max(0, Math.min(age, AMNESIA_FRAME_COUNT - 2)),
  };
}
