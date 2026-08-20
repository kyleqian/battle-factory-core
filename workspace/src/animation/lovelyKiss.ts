/**
 * Pure source-relative reducer for Move_LOVELY_KISS.
 *
 * This ports AnimDevil, AnimPinkHeart, AnimPinkHeart_Step, the script cursor,
 * tagged-resource lifetime, palette transfer, target-panned audio, and the
 * presentation-only Random2 stream. It owns no sleep/status or battle state.
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { advanceRngValue } from "../engine/rng.ts";

export const LOVELY_KISS_WINDOW_ROWS = 153;
export const LOVELY_KISS_FIRST_INACTIVE_AGE = 152;
export const LOVELY_KISS_PINK_HEART_TAG = 10219;
export const LOVELY_KISS_DEVIL_TAG = 10221;

const NEUTRAL_MATRIX = [256, 0, 0, 256] as const;
const HEART_ARGS = [
  [-256, -42],
  [128, -14],
  [416, -38],
  [-128, -22],
] as const;

export type LovelyKissSide = "player" | "opponent";

export interface LovelyKissProfile {
  /** gRng2Value in the first retained Move_LOVELY_KISS source row. */
  readonly animationRngAtAge0: number;
  /** CreateSprite's source-selected slots, in the four create-command order. */
  readonly heartSpriteSlots: readonly [number, number, number, number];
  /** Source-selected slot for the preceding Devil sprite. */
  readonly devilSpriteSlot: number;
  /** GetBattlerSpriteSubpriority(gBattleAnimTarget). */
  readonly targetSubpriority: number;
  readonly palette: Readonly<{
    readonly unfadedAtAge0: readonly number[];
    readonly fadedAtAge0: readonly number[];
    readonly hardwareAtAge0: readonly number[];
    readonly unfadedAfterPinkHeartLoad: readonly number[];
    readonly fadedAfterPinkHeartLoad: readonly number[];
    readonly unfadedAfterDevilLoad: readonly number[];
    readonly fadedAfterDevilLoad: readonly number[];
  }>;
}

export interface LovelyKissSprite {
  readonly slot: number;
  readonly template: "gDevilSpriteTemplate" | "gPinkHeartSpriteTemplate";
  readonly callback: "AnimDevil" | "AnimPinkHeart" | "AnimPinkHeart_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly invisible: boolean;
  readonly matrixNum: 0;
  readonly matrix: readonly [256, 0, 0, 256];
  readonly animation: Readonly<{
    readonly animNum: 0;
    readonly animCmdIndex: 0;
    readonly animDelayCounter: 232 | 156;
  }>;
  readonly data: readonly number[];
  /** Sprite-owned OAM attrs after the source visibility/update pass. */
  readonly attr: readonly [number, number, number];
}

export interface LovelyKissState {
  readonly age: number;
  readonly active: boolean;
  readonly source: Readonly<{
    readonly owner: "Move_LOVELY_KISS";
    readonly offset: 0 | 3 | 6 | 21 | 70;
    readonly wait: 0 | 1;
    readonly args: readonly number[];
  }>;
  readonly animationRng: number;
  readonly sprites: readonly LovelyKissSprite[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
  readonly matrices: Readonly<{
    readonly software: readonly (readonly [256, 0, 0, 256])[];
    readonly hardware: readonly (readonly [256, 0, 0, 256])[];
    readonly transferLagRows: 1;
  }>;
  readonly oam: Readonly<{ readonly transferLagRows: 1 }>;
  readonly palette: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
    readonly transferLagRows: 1;
  }>;
  readonly resources: Readonly<{
    readonly pinkHeartLoaded: boolean;
    readonly devilLoaded: boolean;
    readonly tileTags: readonly number[];
    readonly paletteTags: readonly number[];
  }>;
  readonly audio: Readonly<{
    readonly starts: readonly Readonly<{
      readonly age: 7 | 97;
      readonly sound: "SE_M_PSYBEAM2" | "SE_M_ATTRACT";
      readonly id: 200 | 226;
      readonly pan: "SOUND_PAN_TARGET";
    }>[];
    readonly current: "SE_M_PSYBEAM2" | "SE_M_ATTRACT" | null;
    readonly active: boolean;
    readonly targetPan: -63 | 63;
  }>;
}

function trig(index: number, amplitude: number): number {
  return Math.floor(GBA_SINE_TABLE_256[index & 0xff]! * amplitude / 256);
}

function sin(index: number, amplitude: number): number {
  return trig(index, amplitude);
}

function cos(index: number, amplitude: number): number {
  return trig(index + 64, amplitude);
}

function sourceAtAge(age: number): LovelyKissState["source"] {
  if (age <= 0) return { owner: "Move_LOVELY_KISS", offset: 0, wait: 0, args: [0, 0, 0, 0, 0, 0, 0, 0] };
  if (age <= 3) return { owner: "Move_LOVELY_KISS", offset: 3, wait: age === 1 ? 1 : 0, args: [0, 0, 0, 0, 0, 0, 0, 0] };
  if (age <= 6) return { owner: "Move_LOVELY_KISS", offset: 6, wait: age === 4 ? 1 : 0, args: [0, 0, 0, 0, 0, 0, 0, 0] };
  if (age <= 96) return { owner: "Move_LOVELY_KISS", offset: 21, wait: 1, args: [0, -24, 0, 0, 0, 0, 0, 0] };
  return { owner: "Move_LOVELY_KISS", offset: 70, wait: 1, args: [-128, -22, 0, 0, 0, 0, 0, 0] };
}

function devilAttr(x: number, y: number, x2: number, y2: number): readonly [number, number, number] {
  return [(y + y2 - 16) & 0xff, 0x8000 | ((x + x2 - 16) & 0x1ff), 0x8935];
}

function devilAtAge(
  age: number,
  target: Readonly<{ x: number; y: number }>,
  profile: LovelyKissProfile,
): LovelyKissSprite | null {
  if (age < 7 || age >= 96) return null;
  const callbackCount = age - 5;
  let data0 = 0;
  let data1 = 0;
  let data2 = 0;
  let data3 = 0;
  let x2 = 0;
  let y2 = 0;
  let invisible = false;
  let attr: readonly [number, number, number] = devilAttr(target.x, target.y - 24, 0, 0);
  for (let pass = 0; pass < callbackCount; pass += 1) {
    if (data3 === 0) data2 = 1;
    data0 += data2;
    data1 = (data0 * 4) & 0xff;
    x2 = cos(data1, 30 - Math.trunc(data0 / 4));
    y2 = sin(data1, 10 - Math.trunc(data0 / 8));
    if (data1 > 128 && data2 > 0) data2 = -1;
    if (data1 === 0 && data2 < 0) data2 = 1;
    data3 += 1;
    invisible = data3 < 10 || data3 > 80 ? (data0 & 1) !== 0 : false;
    if (!invisible) attr = devilAttr(target.x, target.y - 24, x2, y2);
  }
  return {
    slot: profile.devilSpriteSlot,
    template: "gDevilSpriteTemplate",
    callback: "AnimDevil",
    x: target.x,
    y: target.y - 24,
    x2,
    y2,
    subpriority: profile.targetSubpriority - 1,
    invisible,
    matrixNum: 0,
    matrix: NEUTRAL_MATRIX,
    animation: { animNum: 0, animCmdIndex: 0, animDelayCounter: 232 },
    data: [data0, data1, data2, data3, 0, 0, 0, 0],
    attr,
  };
}

function heartAttr(x: number, y: number, x2: number, y2: number): readonly [number, number, number] {
  return [(y + y2 - 8) & 0xff, 0x4000 | ((x + x2 - 8) & 0x1ff), 0x7931];
}

function heartAtAge(
  age: number,
  index: number,
  randomPhase: number,
  target: Readonly<{ x: number; y: number }>,
  profile: LovelyKissProfile,
): LovelyKissSprite | null {
  if (age < 97 || age >= 151) return null;
  const [velocity, amplitude] = HEART_ARGS[index]!;
  const flightPasses = Math.min(24, age - 96);
  const data4 = velocity * flightPasses;
  const flightPhase = flightPasses * 3;
  const flightX2 = data4 >> 8;
  const flightY2 = sin((flightPasses - 1) * 3, amplitude);
  let x = target.x;
  let y = target.y;
  let x2 = flightX2;
  let y2 = flightY2;
  let data3 = flightPhase;
  let data5 = 0;
  let callback: LovelyKissSprite["callback"] = "AnimPinkHeart";
  let invisible = false;
  let attr = heartAttr(x, y, x2, y2);
  if (age >= 120) {
    callback = "AnimPinkHeart_Step";
    x += velocity * 24 >> 8;
    y += sin(69, amplitude);
    const stepPasses = age - 120;
    data3 = (randomPhase + stepPasses * 3) & 0xff;
    data5 = stepPasses;
    x2 = stepPasses === 0 ? 0 : sin(randomPhase + (stepPasses - 1) * 3, 5);
    y2 = Math.trunc(stepPasses / 2);
    invisible = stepPasses > 20 && (stepPasses & 1) !== 0;
    if (invisible) {
      const previousPasses = stepPasses - 1;
      attr = heartAttr(
        x,
        y,
        sin(randomPhase + (previousPasses - 1) * 3, 5),
        Math.trunc(previousPasses / 2),
      );
    } else {
      attr = heartAttr(x, y, x2, y2);
    }
  }
  return {
    slot: profile.heartSpriteSlots[index]!,
    template: "gPinkHeartSpriteTemplate",
    callback,
    x,
    y,
    x2,
    y2,
    subpriority: profile.targetSubpriority - 3,
    invisible,
    matrixNum: 0,
    matrix: NEUTRAL_MATRIX,
    animation: { animNum: 0, animCmdIndex: 0, animDelayCounter: 156 },
    data: [1, velocity, amplitude, data3, data4, data5, 0, 0],
    attr,
  };
}

function rngAtAge(age: number, seed: number): Readonly<{ value: number; heartPhases: readonly number[] }> {
  let value = seed >>> 0;
  const heartPhases: number[] = [];
  for (let current = 1; current <= Math.max(0, age); current += 1) {
    value = advanceRngValue(value);
    if (current === 120) {
      for (let heart = 0; heart < 4; heart += 1) {
        value = advanceRngValue(value);
        heartPhases.push((value >>> 16) % 180);
      }
    }
  }
  return { value, heartPhases };
}

function palettesAtAge(age: number, profile: LovelyKissProfile): LovelyKissState["palette"] {
  const current = age < 1
    ? [profile.palette.unfadedAtAge0, profile.palette.fadedAtAge0]
    : age < 4
      ? [profile.palette.unfadedAfterPinkHeartLoad, profile.palette.fadedAfterPinkHeartLoad]
      : [profile.palette.unfadedAfterDevilLoad, profile.palette.fadedAfterDevilLoad];
  const hardware = age <= 1
    ? profile.palette.hardwareAtAge0
    : age <= 4
      ? profile.palette.fadedAfterPinkHeartLoad
      : profile.palette.fadedAfterDevilLoad;
  return { unfaded: [...current[0]], faded: [...current[1]], hardware: [...hardware], transferLagRows: 1 };
}

/** `age=0` is the first retained active Move_LOVELY_KISS source row. */
export function lovelyKissAtAge(
  age: number,
  targetSide: LovelyKissSide,
  target: Readonly<{ x: number; y: number }>,
  profile: LovelyKissProfile,
): LovelyKissState {
  const rng = rngAtAge(age, profile.animationRngAtAge0);
  const devil = devilAtAge(age, target, profile);
  const hearts = HEART_ARGS.flatMap((_, index) => {
    const heart = heartAtAge(age, index, rng.heartPhases[index] ?? 0, target, profile);
    return heart ? [heart] : [];
  });
  const sprites = devil ? [devil, ...hearts] : hearts;
  const pinkHeartLoaded = age >= 1 && age < LOVELY_KISS_FIRST_INACTIVE_AGE;
  const devilLoaded = age >= 4 && age < LOVELY_KISS_FIRST_INACTIVE_AGE;
  return {
    age,
    active: age < LOVELY_KISS_FIRST_INACTIVE_AGE,
    source: sourceAtAge(age),
    animationRng: rng.value,
    sprites,
    visualTaskCount: sprites.length,
    soundTaskCount: 0,
    matrices: {
      software: sprites.map(() => NEUTRAL_MATRIX),
      hardware: sprites.map(() => NEUTRAL_MATRIX),
      transferLagRows: 1,
    },
    oam: { transferLagRows: 1 },
    palette: palettesAtAge(age, profile),
    resources: {
      pinkHeartLoaded,
      devilLoaded,
      tileTags: [pinkHeartLoaded ? LOVELY_KISS_PINK_HEART_TAG : null, devilLoaded ? LOVELY_KISS_DEVIL_TAG : null].filter((tag): tag is number => tag !== null),
      paletteTags: [pinkHeartLoaded ? LOVELY_KISS_PINK_HEART_TAG : null, devilLoaded ? LOVELY_KISS_DEVIL_TAG : null].filter((tag): tag is number => tag !== null),
    },
    audio: {
      starts: [
        { age: 7, sound: "SE_M_PSYBEAM2", id: 200, pan: "SOUND_PAN_TARGET" },
        { age: 97, sound: "SE_M_ATTRACT", id: 226, pan: "SOUND_PAN_TARGET" },
      ],
      current: age >= 97 ? "SE_M_ATTRACT" : age >= 7 ? "SE_M_PSYBEAM2" : null,
      active: (age >= 7 && age <= 56) || (age >= 97 && age <= 147),
      targetPan: targetSide === "opponent" ? 63 : -63,
    },
  };
}
