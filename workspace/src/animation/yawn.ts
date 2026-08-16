import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  deepInhaleTransformAtAge,
  type HowlAttackerTransform,
  type HowlMatrix,
} from "./howl.ts";

export type YawnSide = "player" | "opponent";

export interface YawnCloud {
  readonly slot: 3 | 4 | 5;
  readonly affineKind: 0 | 1 | 2;
  readonly callbackCount: number;
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: number;
  readonly matrix: HowlMatrix;
  readonly invisible: boolean;
}

export interface YawnState {
  readonly active: boolean;
  readonly tagsLoaded: boolean;
  readonly scriptOffset: 0 | 3 | 16 | 32 | 43 | 52 | 66;
  readonly attackerTransform: HowlAttackerTransform;
  readonly targetTransform: HowlAttackerTransform;
  readonly clouds: readonly YawnCloud[];
  readonly sound: "SE_M_YAWN" | "SE_M_SPIT_UP" | null;
}

export const YAWN_FIRST_CLOUD_AGE = 69;
export const YAWN_SECOND_CLOUD_AGE = 75;
export const YAWN_THIRD_CLOUD_AGE = 81;
export const YAWN_SECOND_INHALE_AGE = 147;
export const YAWN_CLEANUP_AGE = 212;

const IDENTITY: HowlMatrix = { a: 256, b: 0, c: 0, d: 256 };
const CLOUD_STARTS = [
  { age: YAWN_FIRST_CLOUD_AGE, kind: 2 as const, slot: 3 as const },
  { age: YAWN_SECOND_CLOUD_AGE, kind: 1 as const, slot: 4 as const },
  { age: YAWN_THIRD_CLOUD_AGE, kind: 0 as const, slot: 5 as const },
] as const;

function scriptOffsetAtAge(age: number): YawnState["scriptOffset"] {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 68) return 16;
  if (age <= 74) return 32;
  if (age <= 80) return 43;
  if (age <= 146) return 52;
  return 66;
}

function inactiveTransform(): HowlAttackerTransform {
  return { active: false, x2: 0, y2: 0, matrix: IDENTITY };
}

function inhaleAtAge(age: number, startAge: number, pictureHeight: number): HowlAttackerTransform {
  const localAge = age - startAge + 4;
  return deepInhaleTransformAtAge(localAge, pictureHeight);
}

function cloudMatrix(kind: 0 | 1 | 2, callbackCount: number): number {
  const phase = callbackCount & 15;
  const ramp = phase <= 8 ? phase : 16 - phase;
  const scale = 128 + kind * 64 + (kind === 0 ? -8 : 8) * ramp;
  return Math.trunc(0x10000 / scale);
}

function cloudAtAge(
  age: number,
  startAge: number,
  kind: 0 | 1 | 2,
  slot: 3 | 4 | 5,
  from: Readonly<{ x: number; y: number }>,
  to: Readonly<{ x: number; y: number }>,
): YawnCloud | null {
  const callbackCount = age - startAge + 1;
  if (callbackCount < 1 || callbackCount > 65) return null;
  const dx = Math.trunc(((to.x - from.x) << 4) / 64);
  const dy = Math.trunc(((to.y - from.y) << 4) / 64);
  const xQ4 = (from.x << 4) + dx * callbackCount;
  const yQ4 = (from.y << 4) + dy * callbackCount;
  let invisible = false;
  if (callbackCount > 58) {
    const blinkCount = Math.floor((callbackCount - 58) / 2);
    invisible = (blinkCount & 1) === 1;
  }
  const matrix = cloudMatrix(kind, callbackCount);
  return {
    slot,
    affineKind: kind,
    callbackCount,
    x: xQ4 >> 4,
    y: yQ4 >> 4,
    x2: 0,
    y2: (GBA_SINE_TABLE_256[(callbackCount * 8) & 0xff]! * 8) >> 8,
    matrix: { a: matrix, b: 0, c: 0, d: matrix },
    invisible,
  };
}

/** Pure source-relative port of Move_YAWN's complete Scene-ON body. */
export function yawnAtAge(
  age: number,
  _attackerSide: YawnSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): YawnState {
  const active = age >= 0 && age < YAWN_CLEANUP_AGE;
  const clouds = active
    ? CLOUD_STARTS.flatMap((entry) => {
        const cloud = cloudAtAge(
          age,
          entry.age,
          entry.kind,
          entry.slot,
          attackerCenter,
          targetCenter,
        );
        return cloud ? [cloud] : [];
      })
    : [];
  const attackerTransform = active
    ? inhaleAtAge(age, 4, 48)
    : inactiveTransform();
  const targetTransform = active
    ? inhaleAtAge(age, YAWN_SECOND_INHALE_AGE, 0)
    : inactiveTransform();
  return {
    active,
    tagsLoaded: age >= 1 && age < YAWN_CLEANUP_AGE,
    scriptOffset: scriptOffsetAtAge(age),
    attackerTransform,
    targetTransform,
    clouds,
    sound: age === 4 || age === YAWN_SECOND_INHALE_AGE
      ? "SE_M_YAWN"
      : age === YAWN_FIRST_CLOUD_AGE
        ? "SE_M_SPIT_UP"
        : null,
  };
}
