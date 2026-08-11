import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export const FAKE_OUT_FRAME_COUNT = 86;
export const FAKE_OUT_TARGET_START_AGE = 17;

export interface FakeOutTargetTransform {
  readonly x2: number;
  readonly y2: number;
  readonly matrix: Readonly<{ a: number; b: 0; c: 0; d: number }>;
  readonly shakeActive: boolean;
  readonly stretchActive: boolean;
}

export interface FakeOutState {
  /** Source software WIN0H. Hardware scanout is independently latched below. */
  readonly softwareWin0H: number;
  /** Displayed WIN0H, measured at RAM+1 for this task in both orientations. */
  readonly displayedWin0H: number;
  readonly displayedWin0V: number;
  readonly windowEnabled: boolean;
  readonly bgMode: "none" | "darken" | "lighten";
  readonly bgBldy: number;
  readonly bgWhiteCoeff: number;
  readonly target: FakeOutTargetTransform;
  readonly sound: Readonly<{
    id: "SE_M_FLATTER" | "SE_M_SKETCH";
    pan: number;
  }> | null;
  readonly active: boolean;
}

function shutterWin0H(step: number): number {
  if (step <= 0) return 0x00f0;
  if (step >= 10) return 0;
  return (13 * step << 8) | (240 - 13 * step);
}

function targetTransform(
  localAge: number,
  pictureYOffset: number,
): FakeOutTargetTransform {
  if (localAge < 0 || localAge > 19) {
    return {
      x2: 0, y2: 0,
      matrix: { a: 256, b: 0, c: 0, d: 256 },
      shakeActive: false, stretchActive: false,
    };
  }
  // StretchTargetUp runs after ShakeMon2 in the task list. Its first callback
  // negates the initializer's +4 back to +4; thereafter the two callbacks'
  // writes leave the same displayed sequence as ShakeMon2's source port.
  const shake = localAge <= 7
    ? shakeMon2OffsetAtTick(4, 0, 5, 1, localAge)
    : { x2: 0, y2: 0 };
  const affineStep = localAge < 10 ? localAge + 1 : 19 - localAge;
  const a = 256 + 10 * affineStep;
  const d = 256 - 13 * affineStep;
  const sourceHeight = 64 - pictureYOffset * 2;
  const inverseHeight = Math.min(128, Math.trunc((sourceHeight << 8) / d));
  return {
    x2: shake.x2,
    y2: Math.trunc((sourceHeight - inverseHeight) / 2),
    matrix: { a, b: 0, c: 0, d },
    shakeActive: localAge <= 7,
    stretchActive: true,
  };
}

/** Complete source-relative Move_FAKE_OUT reducer, including cleanup age 85. */
export function fakeOutAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  targetPictureYOffset: number,
): FakeOutState {
  const target = targetTransform(age - FAKE_OUT_TARGET_START_AGE, targetPictureYOffset);
  const softwareStep = age <= 0 ? 0 : Math.min(age, 10);
  const displayStep = age <= 1 ? 0 : Math.min(age - 1, 10);
  const bgWhiteCoeff = age < 15 ? 0
    : age < 42 ? 16
    : Math.max(0, 14 - Math.floor((age - 42) / 5) * 2);
  return {
    softwareWin0H: age === 0 ? 0
      : age <= 16 ? shutterWin0H(softwareStep) : 0,
    displayedWin0H: age <= 16 ? shutterWin0H(displayStep) : 0,
    displayedWin0V: age >= 1 && age <= 16 ? 160 : 0,
    windowEnabled: age >= 1 && age <= 16,
    bgMode: age >= 1 && age <= 15 ? "darken"
      : age === 16 ? "lighten" : "none",
    bgBldy: age >= 1 && age <= 16 ? 16 : 0,
    bgWhiteCoeff,
    target,
    sound: age === 0 ? { id: "SE_M_FLATTER", pan: 0 }
      : age === 17 ? {
        id: "SE_M_SKETCH",
        pan: attackerSide === "player" ? 63 : -63,
      } : null,
    active: age >= 0 && age < FAKE_OUT_FRAME_COUNT - 1,
  };
}
