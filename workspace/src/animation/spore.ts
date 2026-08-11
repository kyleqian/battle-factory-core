import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type SporeSide = "player" | "opponent";
export interface SporePoint { readonly x: number; readonly y: number }

export interface SporeParticle {
  readonly index: number;
  readonly slot: 3 | 4 | 5 | 7 | 9 | 10;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data0: number;
  readonly data1: number;
  readonly data2: number;
  readonly priority: 2 | 3;
  readonly blend: boolean;
  readonly callback: "AnimSporeParticle_Step";
}

export interface SporeState {
  readonly active: boolean;
  readonly sporeLoaded: boolean;
  readonly targetMonBg: boolean;
  readonly alpha: null | { readonly eva: 12; readonly evb: 8 };
  readonly scriptOffset: 0 | 3 | 5 | 36 | 39 | 42 | 62 | 81 | 100;
  readonly particles: readonly SporeParticle[];
  readonly sound: "SE_M_POISON_POWDER" | null;
  readonly soundPanSide: SporeSide | null;
  readonly soundLoopActive: boolean;
}

export const SPORE_FRAME_COUNT = 207;
export const SPORE_FIRST_INACTIVE_AGE = 206;
export const SPORE_PARTICLE_FIRST_AGE = 7;
export const SPORE_PARTICLE_LAST_AGE = 197;

const SPAWNS = [
  { age: 7, wave: 85, y: -20, slot: 3 },
  { age: 21, wave: 170, y: -10, slot: 4 },
  { age: 35, wave: 0, y: -15, slot: 5 },
  { age: 49, wave: 85, y: -20, slot: 7 },
  { age: 63, wave: 170, y: -10, slot: 9 },
  { age: 77, wave: 0, y: -15, slot: 10 },
  { age: 91, wave: 85, y: -20, slot: 3 },
  { age: 105, wave: 170, y: -10, slot: 4 },
  { age: 119, wave: 0, y: -15, slot: 5 },
] as const;
const SOUND_AGES = new Set([7, 23, 40, 57, 74, 91, 108, 125, 142, 159, 176]);

function gbaSin(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function gbaCos(angle: number, amplitude: number): number {
  return gbaSin(angle + 64, amplitude);
}

function scriptOffsetAtAge(age: number): SporeState["scriptOffset"] {
  if (age <= 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 5;
  for (const spawn of SPAWNS) {
    if (age >= spawn.age && age < spawn.age + 14) {
      const withinGroup = SPAWNS.indexOf(spawn) % 3;
      return ([62, 81, 100] as const)[withinGroup]!;
    }
  }
  if (age <= 198) return 36;
  if (age <= 201) return 39;
  return 42;
}

function particleAtAge(
  age: number,
  index: number,
  targetCenter: SporePoint,
  blend: boolean,
): SporeParticle | null {
  const spawn = SPAWNS[index]!;
  if (age < spawn.age || age > spawn.age + 78) return null;
  // `create_spore_particle_sprite` calls the initializer immediately, then
  // RunTasks advances the installed callback once more in the creation pass.
  const steps = age - spawn.age + 2;
  const angle = (spawn.wave + 2 * (steps - 1)) & 0xff;
  const data1 = (angle + 2) & 0xff;
  const data2 = 24 * steps;
  return {
    index,
    slot: spawn.slot,
    x: targetCenter.x,
    y: targetCenter.y + spawn.y,
    x2: gbaSin(angle, 32),
    y2: gbaCos(angle, -3) + (data2 >> 8),
    data0: 80 - steps,
    data1,
    data2,
    priority: angle >= 64 && angle < 192 ? 2 : 3,
    blend,
    callback: "AnimSporeParticle_Step",
  };
}

/** Shared source port of `AnimSporeParticle`; move scripts own blend/timing. */
export function sporeParticlesAtAge(
  age: number,
  targetCenter: SporePoint,
  blend: boolean,
): readonly SporeParticle[] {
  return SPAWNS
    .map((_, index) => particleAtAge(age, index, targetCenter, blend))
    .filter((value): value is SporeParticle => value !== null);
}

/**
 * Pure source-relative port of the complete `Move_SPORE` presentation body.
 * Sleep state and gameplay RNG remain outside this reducer.
 */
export function sporeAtAge(
  age: number,
  targetSide: SporeSide,
  targetCenter: SporePoint,
): SporeState {
  const sound = SOUND_AGES.has(age) ? "SE_M_POISON_POWDER" : null;
  return {
    active: age >= 0 && age < SPORE_FIRST_INACTIVE_AGE,
    sporeLoaded: age >= 1 && age < SPORE_FIRST_INACTIVE_AGE,
    targetMonBg: age >= 4 && age < 205,
    alpha: age >= 7 && age < 202 ? { eva: 12, evb: 8 } : null,
    scriptOffset: scriptOffsetAtAge(age),
    particles: sporeParticlesAtAge(age, targetCenter, true),
    sound,
    soundPanSide: sound ? targetSide : null,
    soundLoopActive: age >= 7 && age < 176,
  };
}
