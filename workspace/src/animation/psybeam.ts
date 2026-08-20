import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  psychicBgFadeRampAtLocalAge,
  psychicBgPaletteRowAtAge,
} from "./psychicBackground.ts";
import {
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import type { RgbColor } from "../engine/bg.ts";

/** The two bilateral source orientations retained for MOVE_PSYBEAM. */
export type PsybeamSide = "player" | "opponent";

export interface PsybeamPoint {
  readonly x: number;
  readonly y: number;
}

export type PsybeamScriptOwner = "Move_PSYBEAM" | "PsybeamRings" | null;

export interface PsybeamSourceCursor {
  readonly active: boolean;
  readonly owner: PsybeamScriptOwner;
  readonly offset: number | null;
  readonly wait: number;
  readonly args: readonly number[];
}

export type PsybeamTaskCallback =
  | "Task_FadeToBg"
  | "SetPsychicBackground_Step"
  | "SoundTask_LoopSEAdjustPanning_Step"
  | "AnimTask_SwayMonStep"
  | "AnimTask_BlendColorCycleLoop";

export interface PsybeamTask {
  readonly slot: number;
  readonly callback: PsybeamTaskCallback;
  readonly data: readonly number[];
}

export interface PsybeamRing {
  readonly index: number;
  readonly spawnAge: number;
  readonly localAge: number;
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  /** `AnimTranslateLinear`'s remaining-callback counter. */
  readonly data: readonly [number, number, number, number, number, 0, 15357, 2058];
  readonly callback: "AnimTranslateLinear_WithFollowup" | "DestroyAnimSprite";
  readonly matrix: readonly [256, 0, 0, 256];
  readonly subpriority: 28 | 38;
}

export interface PsybeamSwayMon {
  readonly active: boolean;
  readonly direction: 0;
  readonly amplitude: 6 | -6;
  readonly period: 2048;
  readonly swaysRemaining: 1 | 2 | 3 | 4;
  readonly target: 0 | 1;
  readonly phase: number;
  readonly offsetX2: number;
  readonly taskData: readonly number[];
}

export interface PsybeamRegisters {
  readonly bldcnt: 0 | 232;
  readonly bldalpha: 0;
  readonly bldy: number;
}

export interface PsybeamState {
  readonly age: number;
  readonly active: boolean;
  readonly goldRingLoaded: boolean;
  readonly bgIsPsychic: boolean;
  readonly bgBldy: number;
  readonly bgPaletteRotationCount: number;
  readonly source: PsybeamSourceCursor;
  readonly tasks: readonly PsybeamTask[];
  readonly rings: readonly PsybeamRing[];
  readonly swayMon: PsybeamSwayMon | null;
  readonly targetSwayX2: number;
  readonly targetIdleX2: number;
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0 | 1;
  readonly sound: "SE_M_PSYBEAM" | null;
  readonly soundPanSide: PsybeamSide | null;
  readonly registers: PsybeamRegisters;
  readonly resources: Readonly<{
    readonly tileTags: readonly number[];
    readonly paletteTags: readonly number[];
    readonly loaded: boolean;
  }>;
}

export const PSYBEAM_FIRST_INACTIVE_AGE = 159;
export const PSYBEAM_RING_FIRST_AGE = 42;
export const PSYBEAM_RING_PERIOD = 6;
export const PSYBEAM_RING_COUNT = 11;
export const PSYBEAM_RING_DURATION = 13;
export const PSYBEAM_SWAY_FIRST_AGE = 54;
export const PSYBEAM_SWAY_LAST_AGE = 116;
export const PSYBEAM_BLEND_FIRST_AGE = 54;
export const PSYBEAM_BLEND_LAST_AGE = 112;
export const PSYBEAM_BG_LOAD_AGE = 23;
export const PSYBEAM_BG_FIRST_ROTATION_AGE = 26;
export const PSYBEAM_BG_RESTORE_AGE = 140;

const GOLD_RING_TAG = 10163;
const BLDCNT_FADE = 232;

const ZERO_ARGS = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0]);
const GOLD_RING_ARGS = Object.freeze([16, 0, 0, 0, 13, 0, 15, 0]);
const GOLD_RING_ARGS_AFTER_UNLOAD = Object.freeze([16, 0, 0, 0, 13, 0, 15, -1]);

function s16(value: number): number {
  const wrapped = value & 0xffff;
  return wrapped >= 0x8000 ? wrapped - 0x10000 : wrapped;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function taskData(changes: Readonly<Record<number, number>> = {}): number[] {
  const data = Array.from({ length: 16 }, () => 0);
  for (const [index, value] of Object.entries(changes)) data[Number(index)] = value;
  return data;
}

function fadeTask(age: number): PsybeamTask | null {
  let data0: 3 | -1;
  let stage: 1 | 2 | 3;
  if (age >= 4 && age <= 40) {
    data0 = 3;
    stage = age <= 21 ? 1 : age === 22 ? 2 : 3;
  } else if (age >= 121 && age <= 157) {
    data0 = -1;
    stage = age <= 138 ? 1 : age === 139 ? 2 : 3;
  } else {
    return null;
  }
  return {
    slot: 0,
    callback: "Task_FadeToBg",
    data: taskData({ 0: data0, 10: stage }),
  };
}

function psychicBackgroundTask(age: number): PsybeamTask | null {
  if (age < PSYBEAM_BG_LOAD_AGE || age >= PSYBEAM_BG_RESTORE_AGE) return null;
  return {
    slot: 1,
    callback: "SetPsychicBackground_Step",
    data: taskData({ 5: (age - 22) & 3 }),
  };
}

function soundTask(age: number, side: PsybeamSide): PsybeamTask | null {
  if (age < 42 || age > 88) return null;
  const localAge = age - 42;
  const player = side === "player";
  const startPan = player ? -58 : 57;
  const pan = clamp(startPan + (player ? 3 : -3) * localAge, -64, 63);
  return {
    slot: 0,
    callback: "SoundTask_LoopSEAdjustPanning_Step",
    data: taskData({
      0: 200,
      1: player ? -64 : 63,
      2: player ? 63 : -63,
      3: player ? 3 : -3,
      4: 3 - Math.floor(localAge / 16),
      6: 15,
      11: pan,
      12: localAge & 15,
    }),
  };
}

function swayTask(age: number, side: PsybeamSide): PsybeamTask | null {
  if (age < PSYBEAM_SWAY_FIRST_AGE || age > PSYBEAM_SWAY_LAST_AGE) return null;
  const localAge = age - PSYBEAM_SWAY_FIRST_AGE;
  const player = side === "player";
  const phase = (localAge + 1) * 2048;
  const signBit = phase & 0x8000 ? 1 : 0;
  return {
    slot: 2,
    callback: "AnimTask_SwayMonStep",
    data: taskData({
      0: 0,
      1: player ? 6 : -6,
      2: 2048,
      3: 4 - Math.floor((localAge + 1) / 16),
      4: player ? 8 : 6,
      5: player ? 1 : 0,
      10: s16(phase),
      11: signBit,
      12: 1 - (Math.floor((localAge + 1) / 16) & 1),
    }),
  };
}

function blendTask(age: number): PsybeamTask | null {
  if (age < PSYBEAM_BLEND_FIRST_AGE || age > PSYBEAM_BLEND_LAST_AGE) return null;
  const started = age < 83;
  return {
    slot: 3,
    callback: "AnimTask_BlendColorCycleLoop",
    data: taskData({
      0: 4,
      1: 2,
      2: started ? 1 : 0,
      4: 12,
      5: 32351,
      8: started ? 1 : 0,
    }),
  };
}

function sourceCursorAtAge(age: number): PsybeamSourceCursor {
  const args = age < PSYBEAM_RING_FIRST_AGE
    ? ZERO_ARGS
    : age < PSYBEAM_BG_RESTORE_AGE
      ? GOLD_RING_ARGS
      : GOLD_RING_ARGS_AFTER_UNLOAD;
  if (age === 0) {
    return { active: true, owner: "Move_PSYBEAM", offset: 0, wait: 0, args };
  }
  if (age >= 1 && age <= 3) {
    return {
      active: age < PSYBEAM_FIRST_INACTIVE_AGE,
      owner: "Move_PSYBEAM",
      offset: 3,
      wait: age === 1 ? 1 : 0,
      args,
    };
  }
  if (age >= PSYBEAM_RING_FIRST_AGE && age <= 107) {
    const localAge = (age - PSYBEAM_RING_FIRST_AGE) % PSYBEAM_RING_PERIOD;
    return {
      active: true,
      owner: "PsybeamRings",
      offset: 153,
      wait: Math.max(0, 4 - localAge),
      args,
    };
  }
  if (age >= 108 && age <= 117) {
    return { active: true, owner: "Move_PSYBEAM", offset: 123, wait: 1, args };
  }
  if (age >= 118 && age <= 120) {
    return {
      active: true,
      owner: "Move_PSYBEAM",
      offset: 126,
      wait: age === 118 ? 1 : 0,
      args,
    };
  }
  if (age === PSYBEAM_FIRST_INACTIVE_AGE) {
    return { active: false, owner: "Move_PSYBEAM", offset: 131, wait: 0, args };
  }
  return {
    active: age >= 0 && age < PSYBEAM_FIRST_INACTIVE_AGE,
    owner: null,
    offset: null,
    wait: 1,
    args,
  };
}

/** Signed-magnitude Q8.8 delta used by `InitAnimLinearTranslation`. */
function linearMagnitudeQ8(distance: number, duration: number): number {
  const magnitude = Math.trunc((Math.abs(distance) * 256) / duration);
  return distance < 0 ? magnitude | 1 : magnitude & ~1;
}

function linearOffset(distance: number, duration: number, callbacks: number): number {
  const magnitude = linearMagnitudeQ8(distance, duration);
  return linearTranslationOffsetAfterCallbacks(
    distance < 0 ? -magnitude : magnitude,
    callbacks,
    duration,
  );
}

function ringAtAge(
  age: number,
  index: number,
  side: PsybeamSide,
  attackerCenter: PsybeamPoint,
  targetCenter: PsybeamPoint,
): PsybeamRing | null {
  const spawnAge = PSYBEAM_RING_FIRST_AGE + index * PSYBEAM_RING_PERIOD;
  const localAge = age - spawnAge;
  if (localAge < 0 || localAge > PSYBEAM_RING_DURATION) return null;
  const xSign = side === "player" ? 1 : -1;
  const startX = attackerCenter.x + xSign * 16;
  const startY = attackerCenter.y;
  const xDistance = targetCenter.x - startX;
  const yDistance = targetCenter.y - startY;
  const callbacks = localAge + 1;
  const deltaX = linearMagnitudeQ8(xDistance, PSYBEAM_RING_DURATION);
  const deltaY = linearMagnitudeQ8(yDistance, PSYBEAM_RING_DURATION);
  const x2 = linearOffset(xDistance, PSYBEAM_RING_DURATION, callbacks);
  const y2 = linearOffset(yDistance, PSYBEAM_RING_DURATION, callbacks);
  return {
    index,
    spawnAge,
    localAge,
    slot: 3 + (index % 3),
    x: startX,
    y: startY,
    x2,
    y2,
    data: [
      Math.max(0, PSYBEAM_RING_DURATION - callbacks),
      deltaX,
      deltaY,
      deltaX * callbacks,
      deltaY * callbacks,
      0,
      15357,
      2058,
    ],
    callback: localAge === PSYBEAM_RING_DURATION
      ? "DestroyAnimSprite"
      : "AnimTranslateLinear_WithFollowup",
    matrix: [256, 0, 0, 256],
    subpriority: side === "player" ? 38 : 28,
  };
}

/** Source-owned GoldRing instances, including the age-159 destroy callback. */
export function psybeamRingsAtAge(
  age: number,
  side: PsybeamSide,
  attackerCenter: PsybeamPoint,
  targetCenter: PsybeamPoint,
): readonly PsybeamRing[] {
  return Array.from({ length: PSYBEAM_RING_COUNT }, (_, index) =>
    ringAtAge(age, index, side, attackerCenter, targetCenter))
    .filter((ring): ring is PsybeamRing => ring !== null);
}

/** Hardware-OAM view: script-created sprites reach the preceding display age. */
export function psybeamDisplayedRingsAtAge(
  displayAge: number,
  side: PsybeamSide,
  attackerCenter: PsybeamPoint,
  targetCenter: PsybeamPoint,
): readonly PsybeamRing[] {
  return psybeamRingsAtAge(
    displayAge - 1,
    side,
    attackerCenter,
    targetCenter,
  );
}

/** Source `AnimTask_SwayMonStep` output for the target's horizontal sway. */
export function psybeamSwayMonAtAge(
  age: number,
  side: PsybeamSide,
): PsybeamSwayMon | null {
  const task = swayTask(age, side);
  if (!task) return null;
  const localAge = age - PSYBEAM_SWAY_FIRST_AGE;
  const phase = (localAge + 1) * 2048;
  const waveIndex = (phase >>> 8) & 0xff;
  const amplitude = side === "player" ? 6 : -6;
  return {
    active: true,
    direction: 0,
    amplitude,
    period: 2048,
    swaysRemaining: (4 - Math.floor((localAge + 1) / 16)) as 1 | 2 | 3 | 4,
    target: 1,
    phase: s16(phase),
    offsetX2: (GBA_SINE_TABLE_256[waveIndex]! * amplitude) >> 8,
    taskData: task.data,
  };
}

/** Psybeam's own fade/rotation schedule; no sibling timing is inherited. */
export function psybeamBgBldyAtAge(age: number): number {
  if (age < 5) return 0;
  if (age <= 40) {
    return psychicBgFadeRampAtLocalAge(age - 5, 16, 19, 35);
  }
  if (age < 122) return 0;
  return psychicBgFadeRampAtLocalAge(age - 122, 16, 19, 35);
}

export function psybeamBgPaletteRotationCountAtAge(age: number): number {
  if (age < PSYBEAM_BG_FIRST_ROTATION_AGE || age >= PSYBEAM_BG_RESTORE_AGE) return 0;
  return Math.floor((age - PSYBEAM_BG_FIRST_ROTATION_AGE) / 4) + 1;
}

export function psybeamBgPaletteRowAtAge(
  basePalette: readonly Readonly<RgbColor>[],
  age: number,
): Readonly<RgbColor>[] {
  return psychicBgPaletteRowAtAge(
    basePalette,
    psybeamBgPaletteRotationCountAtAge(age),
  );
}

/** Pure source-relative `Move_PSYBEAM`; battle outcome and RNG stay external. */
export function psybeamAtAge(
  age: number,
  side: PsybeamSide,
  attackerCenter: PsybeamPoint,
  targetCenter: PsybeamPoint,
  targetIdleX2 = 0,
): PsybeamState {
  const tasks = [
    fadeTask(age),
    psychicBackgroundTask(age),
    soundTask(age, side),
    swayTask(age, side),
    blendTask(age),
  ].filter((task): task is PsybeamTask => task !== null);
  const swayMon = psybeamSwayMonAtAge(age, side);
  const bgBldy = psybeamBgBldyAtAge(age);
  const active = age >= 0 && age < PSYBEAM_FIRST_INACTIVE_AGE;
  return {
    age,
    active,
    goldRingLoaded: age >= 1 && age < PSYBEAM_FIRST_INACTIVE_AGE,
    bgIsPsychic: age >= PSYBEAM_BG_LOAD_AGE && age < PSYBEAM_BG_RESTORE_AGE,
    bgBldy,
    bgPaletteRotationCount: psybeamBgPaletteRotationCountAtAge(age),
    source: sourceCursorAtAge(age),
    tasks,
    rings: psybeamRingsAtAge(age, side, attackerCenter, targetCenter),
    swayMon,
    targetSwayX2: swayMon?.offsetX2 ?? 0,
    targetIdleX2,
    visualTaskCount: tasks.length,
    soundTaskCount: soundTask(age, side) ? 1 : 0,
    sound: age === 0 ? "SE_M_PSYBEAM" : null,
    soundPanSide: age === 0 ? side : null,
    registers: {
      bldcnt: (age >= 5 && age <= 40) || (age >= 122 && age <= 157)
        ? BLDCNT_FADE
        : 0,
      bldalpha: 0,
      bldy: bgBldy,
    },
    resources: {
      tileTags: age >= 1 && age < PSYBEAM_FIRST_INACTIVE_AGE
        ? [GOLD_RING_TAG]
        : [],
      paletteTags: age >= 1 && age < PSYBEAM_FIRST_INACTIVE_AGE
        ? [GOLD_RING_TAG]
        : [],
      loaded: age >= 1 && age < PSYBEAM_FIRST_INACTIVE_AGE,
    },
  };
}
