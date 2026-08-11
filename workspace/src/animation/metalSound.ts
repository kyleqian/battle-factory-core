import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type MetalSoundSide = "player" | "opponent";

export const METAL_SOUND_WAVE_COUNT = 4;
export const METAL_SOUND_WAVE_SPAWN_PERIOD = 4;
export const METAL_SOUND_WAVE_FIRST_AGE = 7;
export const METAL_SOUND_WAVE_DURATION = 30;
export const METAL_SOUND_WAVE_LAST_AGE =
  METAL_SOUND_WAVE_FIRST_AGE
  + (METAL_SOUND_WAVE_COUNT - 1) * METAL_SOUND_WAVE_SPAWN_PERIOD
  + METAL_SOUND_WAVE_DURATION;

export interface MetalSoundWaveSprite {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly xScale: number;
  readonly yScale: number;
  readonly spawnIndex: number;
}

export interface MetalSoundSoundEvent {
  readonly age: number;
  readonly song: "SE_M_SCREECH";
  readonly pan: number;
}

export interface MetalSoundEffect {
  readonly attackerSide: MetalSoundSide;
  readonly active: boolean;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetMonbg: boolean;
  readonly shakeTaskActive: boolean;
  readonly waves: readonly MetalSoundWaveSprite[];
  readonly soundEvents: readonly MetalSoundSoundEvent[];
}

function waveAtAge(
  age: number,
  spawnAge: number,
  spawnIndex: number,
  attackerSide: MetalSoundSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): MetalSoundWaveSprite | null {
  const localAge = age - spawnAge;
  if (localAge < 0 || localAge > METAL_SOUND_WAVE_DURATION) return null;
  const side = attackerSide === "player" ? 1 : -1;
  const x = attackerCenter.x + side * 16;
  const y = attackerCenter.y;
  const callbacks = Math.min(localAge + 1, METAL_SOUND_WAVE_DURATION);
  const affineScale = 32 + (localAge + 1) * 7;
  return {
    x,
    y,
    x2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(targetCenter.x - x, METAL_SOUND_WAVE_DURATION),
      callbacks,
      METAL_SOUND_WAVE_DURATION,
    ),
    y2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(targetCenter.y - y, METAL_SOUND_WAVE_DURATION),
      callbacks,
      METAL_SOUND_WAVE_DURATION,
    ),
    xScale: Math.trunc(0x10000 / affineScale),
    yScale: Math.trunc(0x10000 / affineScale),
    spawnIndex,
  };
}

/**
 * Complete source-relative `Move_METAL_SOUND` presentation body.
 *
 * The wave callback's first display is the age-zero wave callback. The
 * move-owned short `AnimTask_ShakeMon2` begins at the same creation anchor,
 * so its displayed task tick is wave age + 1; this is intentionally local to
 * Metal Sound and does not inherit the longer-schedule RAM+2 rule.
 */
export function metalSoundEffectAtAge(
  age: number,
  attackerSide: MetalSoundSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): MetalSoundEffect {
  const waves: MetalSoundWaveSprite[] = [];
  for (let index = 0; index < METAL_SOUND_WAVE_COUNT; index += 1) {
    const wave = waveAtAge(
      age,
      METAL_SOUND_WAVE_FIRST_AGE + index * METAL_SOUND_WAVE_SPAWN_PERIOD,
      index,
      attackerSide,
      attackerCenter,
      targetCenter,
    );
    if (wave) waves.push(wave);
  }

  const waveAge = age - METAL_SOUND_WAVE_FIRST_AGE;
  const shakeTick = waveAge >= 0 ? waveAge + 1 : -1;
  const shakeTaskActive = shakeTick >= 1 && shakeTick < 15;
  return {
    attackerSide,
    active: age >= 0 && age <= METAL_SOUND_WAVE_LAST_AGE + 1,
    attackerOffset: shakeTaskActive
      ? shakeMon2OffsetAtTick(2, 0, 8, 1, shakeTick)
      : { x2: 0, y2: 0 },
    targetMonbg: age >= 5 && age <= METAL_SOUND_WAVE_LAST_AGE + 20,
    shakeTaskActive,
    waves,
    soundEvents: [7, 11, 15, 19].map((eventAge) => ({
      age: eventAge,
      song: "SE_M_SCREECH" as const,
      pan: attackerSide === "player" ? -62 : 63,
    })),
  };
}
