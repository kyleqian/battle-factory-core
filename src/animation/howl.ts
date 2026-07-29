export type HowlSide = "player" | "opponent";

export interface HowlMatrix {
  readonly a: number;
  readonly b: 0;
  readonly c: 0;
  readonly d: number;
}

export interface HowlAttackerTransform {
  readonly active: boolean;
  readonly x2: -1 | 0 | 1;
  readonly matrix: HowlMatrix;
}

export interface HowlNoiseLine {
  readonly wave: 0 | 1;
  readonly line: 0 | 1 | 2;
  readonly slot: 3 | 4 | 5;
  readonly centerX: number;
  readonly centerY: number;
  readonly frame: 0 | 1 | 2 | 3;
  readonly hFlip: boolean;
  readonly vFlip: boolean;
  readonly callbackCount: number;
  readonly callback: "AnimRoarNoiseLine_Step";
}

export interface HowlState {
  readonly active: boolean;
  readonly noiseLineLoaded: boolean;
  readonly scriptOffset: 0 | 3 | 14 | 30 | 33 | "RoarEffect";
  readonly attacker: HowlAttackerTransform;
  readonly noiseLines: readonly HowlNoiseLine[];
  readonly cry:
    | Readonly<{
        species: "LOUDRED";
        mode: "CRY_MODE_HIGH_PITCH";
        panSide: HowlSide;
      }>
    | null;
}

export const HOWL_FRAME_COUNT = 102;
export const HOWL_FIRST_WAVE_AGE = 18;
export const HOWL_SECOND_WAVE_AGE = 35;
export const HOWL_NOISE_LINE_LIFETIME = 13;
export const HOWL_INHALE_FIRST_AGE = 4;
export const HOWL_INHALE_LAST_AGE = 67;

function scriptOffsetAtAge(age: number): HowlState["scriptOffset"] {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 17) return 14;
  if (age <= 34) return "RoarEffect";
  if (age <= 68) return 30;
  return 33;
}

function attackerTransformAtAge(age: number): HowlAttackerTransform {
  if (age < HOWL_INHALE_FIRST_AGE || age > HOWL_INHALE_LAST_AGE) {
    return {
      active: false,
      x2: 0,
      matrix: { a: 256, b: 0, c: 0, d: 256 },
    };
  }
  const step = age - 3;
  let a: number;
  let d: number;
  if (step <= 4) {
    a = 256 + 16 * step;
    d = 256;
  } else if (step <= 20) {
    a = 320;
    d = 256 - 3 * (step - 4);
  } else if (step <= 24) {
    a = 320 + 4 * (step - 20);
    d = 208;
  } else if (step <= 48) {
    a = 336;
    d = 208;
  } else {
    a = 336 - 5 * (step - 48);
    d = 208 + 3 * (step - 48);
  }
  let x2: -1 | 0 | 1 = 0;
  if (step >= 22 && step <= 43) {
    x2 = Math.floor((step - 20) / 2) % 2 === 1 ? 1 : -1;
  }
  return { active: true, x2, matrix: { a, b: 0, c: 0, d } };
}

function noiseWaveAtAge(
  age: number,
  wave: 0 | 1,
  side: HowlSide,
  attackerCoord: Readonly<{ x: number; y: number }>,
): HowlNoiseLine[] {
  const start = wave === 0 ? HOWL_FIRST_WAVE_AGE : HOWL_SECOND_WAVE_AGE;
  const localAge = age - start;
  if (localAge < 0 || localAge >= HOWL_NOISE_LINE_LIFETIME) return [];
  const callbackCount = localAge + 1;
  const horizontalDirection = side === "player" ? 1 : -1;
  const xOffset = side === "player" ? 24 : -24;
  const x2 = (horizontalDirection * 0x280 * callbackCount) >> 8;
  const toggle = Math.floor(callbackCount / 3) % 2;
  return ([
    { line: 0, yOffset: -8, yDirection: -1, baseFrame: 0, vFlip: false },
    { line: 1, yOffset: 0, yDirection: 0, baseFrame: 2, vFlip: false },
    { line: 2, yOffset: 8, yDirection: 1, baseFrame: 0, vFlip: true },
  ] as const).map((entry) => ({
    wave,
    line: entry.line,
    slot: (3 + entry.line) as 3 | 4 | 5,
    centerX: attackerCoord.x + xOffset + x2,
    centerY: attackerCoord.y + entry.yOffset
      + ((entry.yDirection * 0x280 * callbackCount) >> 8),
    frame: (entry.baseFrame + toggle) as 0 | 1 | 2 | 3,
    hFlip: side === "opponent",
    vFlip: entry.vFlip,
    callbackCount,
    callback: "AnimRoarNoiseLine_Step" as const,
  }));
}

/**
 * Pure source-relative port of the complete `Move_HOWL` presentation body.
 * `attackerCoord` is the resolved source `BATTLER_COORD_X/Y` pair. The
 * reducer never reads a battle clock and never mutates stat stages or RNG.
 */
export function howlAtAge(
  age: number,
  side: HowlSide,
  attackerCoord: Readonly<{ x: number; y: number }>,
): HowlState {
  return {
    active: age >= 0 && age < HOWL_FRAME_COUNT - 1,
    noiseLineLoaded: age >= 1 && age < HOWL_FRAME_COUNT - 1,
    scriptOffset: scriptOffsetAtAge(age),
    attacker: attackerTransformAtAge(age),
    noiseLines: [
      ...noiseWaveAtAge(age, 0, side, attackerCoord),
      ...noiseWaveAtAge(age, 1, side, attackerCoord),
    ],
    cry: age === HOWL_SECOND_WAVE_AGE
      ? {
          species: "LOUDRED",
          mode: "CRY_MODE_HIGH_PITCH",
          panSide: side,
        }
      : null,
  };
}
