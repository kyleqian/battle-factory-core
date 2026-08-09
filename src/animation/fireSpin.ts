import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { shakeMonOffsetAtTick, type ShakeMonOffset } from "./shakeMon.ts";

/** One source row of `FireSpinEffect` (`battle_anim_scripts.s:1406-1417`). */
export interface FireSpinVortexRow {
  readonly xOffset: number;
  readonly yOffset: number;
  readonly velocityY: number;
  readonly duration: number;
  readonly angleStep: number;
  readonly amplitude: number;
}

/**
 * `gFireSpinSpriteTemplate` / `AnimParticleInVortex` source arguments.
 * This exact body is called by MOVE_FIRE_SPIN and DRAGON_CLAW.
 */
export const FIRE_SPIN_VORTEX_ROWS: readonly FireSpinVortexRow[] = [
  { xOffset: 0, yOffset: 28, velocityY: 528, duration: 30, angleStep: 13, amplitude: 50 },
  { xOffset: 0, yOffset: 32, velocityY: 480, duration: 20, angleStep: 16, amplitude: -46 },
  { xOffset: 0, yOffset: 33, velocityY: 576, duration: 20, angleStep: 8, amplitude: 42 },
  { xOffset: 0, yOffset: 31, velocityY: 400, duration: 25, angleStep: 11, amplitude: -42 },
  { xOffset: 0, yOffset: 28, velocityY: 512, duration: 25, angleStep: 16, amplitude: 46 },
  { xOffset: 0, yOffset: 33, velocityY: 464, duration: 30, angleStep: 15, amplitude: -50 },
] as const;

export interface FireSpinVortexSprite {
  readonly spawnAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly remaining: number;
  readonly angle: number;
  readonly animationFrame: number;
}

const sin = (angle: number, amplitude: number): number =>
  (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;

/**
 * Pure `AnimParticleInVortex` reducer. `effectStartAges` are the ages of
 * each `FireSpinEffect` call's first `createsprite`; the source `delay 2`
 * advances four frames between adjacent rows.
 */
export function fireSpinVortexSpritesAtAge(
  age: number,
  center: Readonly<{ x: number; y: number }>,
  effectStartAges: readonly number[],
): readonly FireSpinVortexSprite[] {
  return effectStartAges.flatMap((effectStartAge) =>
    FIRE_SPIN_VORTEX_ROWS.flatMap((row, index) => {
      const spawnAge = effectStartAge + index * 4;
      const callback = age - spawnAge + 1;
      if (callback <= 0 || callback > row.duration) return [];
      return [{
        spawnAge,
        x: center.x + row.xOffset,
        y: center.y + row.yOffset,
        x2: sin((callback - 1) * row.angleStep, row.amplitude),
        y2: -((callback * row.velocityY) >> 8),
        remaining: row.duration - callback,
        angle: (callback * row.angleStep) & 0xff,
        animationFrame: Math.floor(callback / 4) % 5,
      }];
    }));
}

/** `createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 2, 47, 1`. */
export const FIRE_SPIN_TARGET_SHAKE = {
  xOffset: 0,
  yOffset: 2,
  numTimes: 47,
  frameDelay: 1,
} as const;

/** Source age 4 is the first Fire Spin task/sprite callback frame. */
export const FIRE_SPIN_EFFECT_FIRST_AGE = 4;
export const FIRE_SPIN_EFFECT_START_AGES = [4, 28, 52] as const;
export const FIRE_SPIN_END_AGE = 102;

export interface FireSpinGeometry {
  /** `GetBattlerSpriteCoord(ANIM_TARGET, BATTLER_COORD_X/Y)`. */
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

export interface FireSpinSoundEvent {
  readonly age: number;
  readonly song: "SE_M_SACRED_FIRE2";
  readonly pan: number;
}

export interface FireSpinState {
  readonly fireSpin: readonly FireSpinVortexSprite[];
  readonly targetOffset: ShakeMonOffset;
  readonly displayedTargetOffset: ShakeMonOffset;
  readonly soundEvents: readonly FireSpinSoundEvent[];
}

export function fireSpinTargetOffsetAtAge(age: number): ShakeMonOffset {
  if (age < FIRE_SPIN_EFFECT_FIRST_AGE) return { x2: 0, y2: 0 };
  return shakeMonOffsetAtTick(
    FIRE_SPIN_TARGET_SHAKE.xOffset,
    FIRE_SPIN_TARGET_SHAKE.yOffset,
    FIRE_SPIN_TARGET_SHAKE.numTimes,
    FIRE_SPIN_TARGET_SHAKE.frameDelay,
    age - FIRE_SPIN_EFFECT_FIRST_AGE + 1,
  );
}

/**
 * `AnimTask_ShakeMon` writes its initial `{0, 2}` before its synchronous
 * step and the regular `RunTasks` step resets it in the same source frame.
 * That creation write alone survives to the next photographed OAM epoch;
 * later task writes use the normal two-frame display lag.
 */
export function fireSpinDisplayedTargetOffsetAtAge(age: number): ShakeMonOffset {
  if (age === FIRE_SPIN_EFFECT_FIRST_AGE + 1) return { x2: 0, y2: 2 };
  return fireSpinTargetOffsetAtAge(age - 2);
}

/**
 * `MOVE_FIRE_SPIN` from its first in-bounds script frame. The task
 * initializer invokes its step synchronously and `RunTasks` invokes it once
 * again on age 4, hence the shared task sequence's `+1` source offset.
 */
export function fireSpinAtAge(
  age: number,
  geometry: FireSpinGeometry,
  targetSide: "player" | "opponent",
): FireSpinState {
  const targetOffset = fireSpinTargetOffsetAtAge(age);
  return {
    fireSpin: fireSpinVortexSpritesAtAge(
      age,
      geometry.targetCenter,
      FIRE_SPIN_EFFECT_START_AGES,
    ),
    targetOffset,
    displayedTargetOffset: fireSpinDisplayedTargetOffsetAtAge(age),
    soundEvents: age === 1
      ? [{
          age,
          song: "SE_M_SACRED_FIRE2",
          pan: targetSide === "opponent" ? 63 : -63,
        }]
      : [],
  };
}
