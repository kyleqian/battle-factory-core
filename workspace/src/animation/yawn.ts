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

/**
 * Current battler facts consumed by Move_YAWN's two DeepInhale tasks.
 *
 * The source obtains the scale anchor from `MON_PIC_HEIGHT - 2 * yDelta`
 * and sends clouds between the live picture-offset coordinates.  Fixture
 * callers omit this input to retain their measured Togetic/Gengar staging.
 */
export interface YawnBattlerInput {
  readonly attackerPictureHeight: number;
  readonly targetPictureHeight: number;
  readonly attackerEffectCenter: Readonly<{ x: number; y: number }>;
  readonly targetEffectCenter: Readonly<{ x: number; y: number }>;
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
  // Each source affine command has an initial zero-duration frame followed
  // by the two eight-frame ramps. The runner visits that initial frame again
  // for one callback at each jump, so the observable cycle is 17 callbacks:
  // 1..8, 7..0, 0. Keep this closed form source-relative; it is not a frame
  // lookup table.
  const phase = (callbackCount - 1) % 17;
  const ramp = phase <= 7 ? phase + 1 : phase <= 15 ? 15 - phase : 0;
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
  attackerSide: YawnSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
  battlerInput?: Readonly<YawnBattlerInput>,
): YawnState {
  const active = age >= 0 && age < YAWN_CLEANUP_AGE;
  // Yawn's InitYawnCloudPosition uses the battler picture-offset pair rather
  // than the battle-position pair. The source endpoints are 96 -> 48 for a
  // player attacker and 49 -> 97 for an opponent attacker; the battler
  // animation centers remain their art anchors at the typed seam.
  const cloudFrom = {
    x: battlerInput?.attackerEffectCenter.x ?? attackerCenter.x,
    y: battlerInput?.attackerEffectCenter.y
      ?? (attackerSide === "player" ? 96 : 49),
  };
  const cloudTo = {
    x: battlerInput?.targetEffectCenter.x ?? targetCenter.x,
    y: battlerInput?.targetEffectCenter.y
      ?? (attackerSide === "player" ? 48 : 97),
  };
  const clouds = active
    ? CLOUD_STARTS.flatMap((entry) => {
        const cloud = cloudAtAge(
          age,
          entry.age,
          entry.kind,
          entry.slot,
          cloudFrom,
          cloudTo,
        );
        return cloud ? [cloud] : [];
      })
    : [];
  const attackerTransform = active
    ? inhaleAtAge(
      age,
      4,
      battlerInput?.attackerPictureHeight
        ?? (attackerSide === "player" ? 48 : 46),
    )
    : inactiveTransform();
  const targetTransform = active
    ? inhaleAtAge(
      age,
      YAWN_SECOND_INHALE_AGE,
      battlerInput?.targetPictureHeight
        ?? (attackerSide === "player" ? 54 : 46),
    )
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
