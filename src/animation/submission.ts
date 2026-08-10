import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export interface SubmissionMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

export interface SubmissionImpact {
  /** Source-created sprite order, retained for software-OAM receipt checks. */
  readonly index: number;
  readonly slot: 3 | 4;
  readonly x: number;
  readonly y: number;
  readonly animation: 1;
  readonly matrix: SubmissionMatrix;
}

export interface SubmissionState {
  readonly age: number;
  readonly active: boolean;
  readonly impactGfxLoaded: boolean;
  readonly monbgTaskActive: boolean;
  readonly clearMonbgTaskActive: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly translationTasksActive: boolean;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly impacts: readonly SubmissionImpact[];
}

const IDENTITY_OFFSET = { x2: 0, y2: 0 };
const IMPACT_MATRIX: SubmissionMatrix = { a: 303, b: 0, c: 0, d: 303 };
const IMPACT_START_AGES = [7, 17, 27, 37, 47, 57, 67, 77, 87] as const;
const IMPACT_OFFSETS = [
  { x: 0, y: -12 },
  { x: -12, y: 8 },
  { x: 12, y: 0 },
] as const;

function ellipseOffset(
  age: number,
  width: number,
  height: number,
): Readonly<{ x2: number; y2: number }> {
  // `AnimTask_TranslateMonElliptical` calls its step immediately at task
  // creation. Its first source snapshot therefore uses phase 16, while task
  // data[5] has already advanced to 32 for the next RunTasks invocation.
  const phase = (age - 6) * 16 & 0xff;
  return {
    x2: Math.floor(GBA_SINE_TABLE_256[phase]! * width / 256),
    y2: -Math.floor(GBA_SINE_TABLE_256[(phase + 64) & 0xff]! * height / 256)
      + height,
  };
}

/**
 * Source-age reducer for `Move_SUBMISSION` / `SubmissionHit`.
 *
 * `age=0` is the first pointer-bounded source frame. The move intentionally
 * uses `AnimTask_TranslateMonElliptical`, not its RespectSide wrapper: widths
 * remain -18 for argument battler 0 and +18 for argument battler 1 in both
 * legal attacker orientations. Display code applies the measured one-frame
 * OAM latch by querying this reducer at `age - 1`.
 */
export function submissionAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): SubmissionState {
  const translationTasksActive = age >= 7 && age <= 100;
  const impactIndex = IMPACT_START_AGES.findIndex(
    (startAge) => age >= startAge && age <= startAge + 9,
  );
  const impacts: SubmissionImpact[] = impactIndex < 0
    ? []
    : (() => {
        const offset = IMPACT_OFFSETS[impactIndex % IMPACT_OFFSETS.length]!;
        return [{
          index: impactIndex,
          // The source allocator reuses these two affine slots in sequence.
          slot: impactIndex % 2 === 0 ? 3 : 4,
          x: targetCenter.x + offset.x,
          y: targetCenter.y + offset.y,
          animation: 1,
          matrix: IMPACT_MATRIX,
        }];
      })();

  return {
    age,
    active: age >= 0 && age <= 122,
    impactGfxLoaded: age >= 1 && age <= 122,
    monbgTaskActive: age >= 4 && age <= 101,
    clearMonbgTaskActive: age >= 102 && age <= 104,
    alpha: age >= 7 && age <= 101 ? { eva: 12, evb: 8 } : null,
    translationTasksActive,
    attackerOffset: translationTasksActive
      ? ellipseOffset(age, -18, 6)
      : IDENTITY_OFFSET,
    targetOffset: translationTasksActive
      ? ellipseOffset(age, 18, 6)
      : IDENTITY_OFFSET,
    impacts,
  };
}
