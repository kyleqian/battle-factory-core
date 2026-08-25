import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type ScreechSide = "player" | "opponent";

export const SCREECH_RING_COUNT = 2;
export const SCREECH_RING_FIRST_AGE = 4;
export const SCREECH_RING_SPAWN_PERIOD = 4;
export const SCREECH_RING_DURATION = 30;
export const SCREECH_SWAY_FIRST_AGE = 30;
export const SCREECH_SWAY_LAST_AGE = 60;
export const SCREECH_FIRST_INACTIVE_AGE = 62;
export const SCREECH_SHAKE_SCANOUT_FIRST_AGE = 5;

export interface ScreechRingSprite {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly xScale: number;
  readonly yScale: number;
  readonly spawnIndex: number;
}

export interface ScreechSoundEvent {
  readonly age: number;
  readonly song: "SE_M_SCREECH";
  readonly pan: number;
}

export interface ScreechEffect {
  readonly active: boolean;
  readonly scriptActive: boolean;
  readonly sourceOffset: number | null;
  readonly shakeTaskActive: boolean;
  readonly swayTaskActive: boolean;
  /** True once SwayMon owns the target x2, including its reset cleanup row. */
  readonly targetOffsetOverwrite: boolean;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  /**
   * Live attacker scanout. The creation write is a source task state,
   * distinct from the first retained post-callback RAM row.
   */
  readonly displayedAttackerOffset: Readonly<{ x2: number; y2: number }>;
  /**
   * SwayMon overwrites the target OBJ x2 rather than adding a delta.
   * It is only meaningful while swayTaskActive is true.
   */
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly rings: readonly ScreechRingSprite[];
  readonly soundEvents: readonly ScreechSoundEvent[];
}

function gbaSin(index: number, amplitude: number): number {
  return (amplitude * GBA_SINE_TABLE_256[index & 0xff]!) >> 8;
}

function sourceOffsetAtAge(age: number): number | null {
  if (age === 0) return 0;
  if (age >= 1 && age <= 3) return 3;
  if (age >= 4 && age <= 11) return 76;
  if (age >= 12 && age <= 29) return 32;
  if (age >= 30 && age <= 61) return 49;
  if (age === SCREECH_FIRST_INACTIVE_AGE) return 50;
  return null;
}

function ringAtAge(
  age: number,
  spawnIndex: number,
  attackerSide: ScreechSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): ScreechRingSprite | null {
  const spawnAge = SCREECH_RING_FIRST_AGE + spawnIndex * SCREECH_RING_SPAWN_PERIOD;
  const localAge = age - spawnAge;
  if (localAge < 0 || localAge > SCREECH_RING_DURATION) return null;
  const side = attackerSide === "player" ? 1 : -1;
  const x = attackerCenter.x + side * 16;
  const y = attackerCenter.y;
  const callbacks = localAge + 1;
  const affineScale = 32 + callbacks * 7;
  return {
    x,
    y,
    x2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(targetCenter.x - x, SCREECH_RING_DURATION),
      callbacks,
      SCREECH_RING_DURATION,
    ),
    y2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(targetCenter.y - y, SCREECH_RING_DURATION),
      callbacks,
      SCREECH_RING_DURATION,
    ),
    xScale: Math.trunc(0x10000 / affineScale),
    yScale: Math.trunc(0x10000 / affineScale),
    spawnIndex,
  };
}

/**
 * Pure port of MOVE_SCREECH's two literal ScreechRing calls,
 * AnimTask_ShakeMon2(ANIM_ATTACKER, 3, 0, 2, 1), and
 * AnimTask_SwayMon(0, 6, 2048, 2, ANIM_TARGET).
 *
 * Age zero is the first retained source-pointer row. The ring callback is
 * first observable at age four. The script scheduler has already consumed
 * ShakeMon2's positive initialization row by then, so the first retained
 * task row is its source-derived negative sequence tick.
 */
export function screechEffectAtAge(
  age: number,
  attackerSide: ScreechSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): ScreechEffect {
  const rings: ScreechRingSprite[] = [];
  for (let index = 0; index < SCREECH_RING_COUNT; index += 1) {
    const ring = ringAtAge(
      age,
      index,
      attackerSide,
      attackerCenter,
      targetCenter,
    );
    if (ring) rings.push(ring);
  }
  const shakeTaskActive = age >= 4 && age <= 5;
  const swayTaskActive = age >= SCREECH_SWAY_FIRST_AGE
    && age <= SCREECH_SWAY_LAST_AGE;
  const swayAmplitude = attackerSide === "player" ? 6 : -6;
  return {
    active: age >= 0 && age <= SCREECH_FIRST_INACTIVE_AGE,
    scriptActive: age >= 0 && age < SCREECH_FIRST_INACTIVE_AGE,
    sourceOffset: sourceOffsetAtAge(age),
    shakeTaskActive,
    swayTaskActive,
    targetOffsetOverwrite: age >= SCREECH_SWAY_FIRST_AGE,
    attackerOffset: shakeTaskActive
      ? shakeMon2OffsetAtTick(3, 0, 2, 1, age - 3)
      : { x2: 0, y2: 0 },
    displayedAttackerOffset: shakeMon2OffsetAtTick(
      3,
      0,
      2,
      1,
      age - SCREECH_SHAKE_SCANOUT_FIRST_AGE,
    ),
    targetOffset: swayTaskActive
      ? { x2: gbaSin((age - 29) * 8, swayAmplitude), y2: 0 }
      : { x2: 0, y2: 0 },
    rings,
    soundEvents: [4, 8].map((eventAge) => ({
      age: eventAge,
      song: "SE_M_SCREECH" as const,
      pan: attackerSide === "player" ? -62 : 63,
    })),
  };
}
