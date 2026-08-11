import {
  STUN_SPORE_FIRST_INACTIVE_AGE,
  STUN_SPORE_FRAME_COUNT,
  stunSporeAtAge,
  stunSporeParticleDrawOrderAtAge,
  stunSporeParticlesAtAge,
  type StunSporeParticle,
  type StunSporePoint,
  type StunSporeSide,
} from "./stunSpore.ts";

export type SleepPowderSide = StunSporeSide;
export type SleepPowderPoint = StunSporePoint;
export type SleepPowderParticle = StunSporeParticle;

export interface SleepPowderState {
  readonly active: boolean;
  readonly sleepPowderLoaded: boolean;
  readonly scriptOffset: 0 | 3 | 68 | 146 | 224 | 300 | 301;
  readonly particles: readonly SleepPowderParticle[];
  readonly sound: "SE_M_POISON_POWDER" | null;
  readonly soundPanSide: SleepPowderSide | null;
  readonly soundLoopActive: boolean;
}

export const SLEEP_POWDER_FRAME_COUNT = STUN_SPORE_FRAME_COUNT;
export const SLEEP_POWDER_FIRST_INACTIVE_AGE = STUN_SPORE_FIRST_INACTIVE_AGE;

/**
 * Sleep Powder and Stun Spore are literal source-identical script bodies
 * after their distinct tag/template command. Reuse the callback reducer,
 * preserving Sleep Powder's own resource identity at this boundary.
 */
export function sleepPowderAtAge(
  age: number,
  targetSide: SleepPowderSide,
  targetCenter: SleepPowderPoint,
): SleepPowderState {
  const shared = stunSporeAtAge(age, targetSide, targetCenter);
  const { stunSporeLoaded, ...state } = shared;
  return { ...state, sleepPowderLoaded: stunSporeLoaded };
}

export const sleepPowderParticlesAtAge = stunSporeParticlesAtAge;
export const sleepPowderParticleDrawOrderAtAge =
  stunSporeParticleDrawOrderAtAge;
