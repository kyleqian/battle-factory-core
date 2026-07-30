import {
  HOWL_NOISE_LINE_LIFETIME,
  type HowlMatrix,
  type HowlNoiseLine,
  type HowlSide,
} from "./howl.ts";

export interface RoarAttackerTransform {
  readonly active: boolean;
  readonly matrix: HowlMatrix;
}

export interface RoarState {
  readonly active: boolean;
  readonly frameCount: 99 | 104;
  readonly noiseLineLoaded: boolean;
  readonly attackerInMonBg: boolean;
  readonly alpha: Readonly<{ eva: 8; evb: 8 }> | null;
  readonly attackerTransform: RoarAttackerTransform;
  readonly noiseLines: readonly HowlNoiseLine[];
  readonly targetX2: number;
  readonly cry:
    | Readonly<{
        species: "HOUNDOUR";
        mode: "DOUBLE_CRY_ROAR";
        panSide: HowlSide;
      }>
    | null;
  readonly cleanup:
    | "none"
    | "clear-mon-bg"
    | "wait-for-cry"
    | "inactive";
}

export const ROAR_PLAYER_FRAME_COUNT = 99;
export const ROAR_OPPONENT_FRAME_COUNT = 104;
export const ROAR_SCALE_FIRST_AGE = 7;
export const ROAR_SCALE_LAST_AGE = 25;
export const ROAR_FIRST_WAVE_AGE = 7;
export const ROAR_SECOND_WAVE_AGE = 24;
export const ROAR_SLIDE_TASK_AGE = 46;

function roarNoiseWave(
  age: number,
  wave: 0 | 1,
  side: HowlSide,
  attackerCoord: Readonly<{ x: number; y: number }>,
): HowlNoiseLine[] {
  const start = wave === 0 ? ROAR_FIRST_WAVE_AGE : ROAR_SECOND_WAVE_AGE;
  const localAge = age - start;
  if (localAge < 0 || localAge >= HOWL_NOISE_LINE_LIFETIME) return [];
  const callbackCount = localAge + 1;
  const horizontalDirection = side === "player" ? 1 : -1;
  const xOffset = side === "player" ? 24 : -24;
  const toggle = Math.floor(callbackCount / 3) % 2;
  return ([
    { line: 0, yOffset: -8, yDirection: -1, baseFrame: 0, vFlip: false },
    { line: 1, yOffset: 0, yDirection: 0, baseFrame: 2, vFlip: false },
    { line: 2, yOffset: 8, yDirection: 1, baseFrame: 0, vFlip: true },
  ] as const).map((entry) => ({
    wave,
    line: entry.line,
    slot: (3 + entry.line) as 3 | 4 | 5,
    centerX: attackerCoord.x + xOffset
      + ((horizontalDirection * 0x280 * callbackCount) >> 8),
    centerY: attackerCoord.y + entry.yOffset
      + ((entry.yDirection * 0x280 * callbackCount) >> 8),
    frame: (entry.baseFrame + toggle) as 0 | 1 | 2 | 3,
    hFlip: side === "opponent",
    vFlip: entry.vFlip,
    callbackCount,
    callback: "AnimRoarNoiseLine_Step" as const,
  }));
}

function scaleAtAge(age: number): RoarAttackerTransform {
  if (age < ROAR_SCALE_FIRST_AGE || age > ROAR_SCALE_LAST_AGE) {
    return { active: false, matrix: { a: 256, b: 0, c: 0, d: 256 } };
  }
  const step = age - ROAR_SCALE_FIRST_AGE + 1;
  const scale = step <= 10 ? 256 - step * 5 : 206 + (step - 10) * 5;
  return {
    active: true,
    matrix: { a: scale, b: 0, c: 0, d: scale },
  };
}

/**
 * Pure source-relative port of `Move_ROAR`. The resolved side and geometry
 * are presentation inputs; accuracy, guards, forced-switch choice and battle
 * progression remain wholly outside this reducer.
 */
export function roarAtAge(
  age: number,
  side: HowlSide,
  attackerCoord: Readonly<{ x: number; y: number }>,
): RoarState {
  const frameCount = side === "player"
    ? ROAR_PLAYER_FRAME_COUNT
    : ROAR_OPPONENT_FRAME_COUNT;
  const cleanupStart = frameCount - 5;
  const targetDirection = side === "player" ? 1 : -1;
  return {
    active: age >= 0 && age < frameCount - 1,
    frameCount,
    noiseLineLoaded: age >= 1 && age < frameCount - 1,
    attackerInMonBg: age >= 4 && age < cleanupStart + 3,
    alpha: age >= 7 && age < cleanupStart
      ? { eva: 8, evb: 8 }
      : null,
    attackerTransform: scaleAtAge(age),
    noiseLines: [
      ...roarNoiseWave(age, 0, side, attackerCoord),
      ...roarNoiseWave(age, 1, side, attackerCoord),
    ],
    targetX2: age <= ROAR_SLIDE_TASK_AGE
      ? 0
      : targetDirection * 2 * (age - ROAR_SLIDE_TASK_AGE),
    cry: age === ROAR_FIRST_WAVE_AGE
      ? { species: "HOUNDOUR", mode: "DOUBLE_CRY_ROAR", panSide: side }
      : null,
    cleanup: age >= frameCount - 1
      ? "inactive"
      : age >= cleanupStart + 3
      ? "wait-for-cry"
      : age >= cleanupStart
      ? "clear-mon-bg"
      : "none",
  };
}
