import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type FlailSide = "player" | "opponent";
export type FlailPower = 20 | 40 | 80 | 100 | 150 | 200;

export interface FlailVisualRandom {
  /** The first fixed-animation `Random2()` result, before `% 48 - 24`. */
  readonly x: number;
  /** The second fixed-animation `Random2()` result, before `% 24 - 12`. */
  readonly y: number;
}

export interface FlailMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

export interface FlailMovementTask {
  readonly phase: 0 | 1 | 2;
  readonly age: number;
  readonly rotation: number;
  readonly decayRemaining: number;
  readonly decayStep: 64;
  readonly amplitude: number;
}

export interface FlailHitsplat {
  readonly center: Readonly<{ x: number; y: number }>;
  readonly offset: Readonly<{ x2: number; y2: number }>;
  readonly animation: 3;
  readonly matrix: FlailMatrix;
}

export interface FlailState {
  readonly active: boolean;
  readonly monbgTarget: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly movementTask: FlailMovementTask | null;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly attackerMatrix: FlailMatrix;
  readonly hitsplat: FlailHitsplat | null;
  readonly targetShakeX2: number;
  readonly shakeAmplitude: number;
  readonly sound: "SE_M_HEADBUTT" | "SE_M_MEGA_KICK2" | null;
}

const IDENTITY: FlailMatrix = { a: 256, b: 0, c: 0, d: 256 };
export const FLAIL_FRAME_COUNT = 114;
export const FLAIL_MOVEMENT_FIRST_AGE = 7;
export const FLAIL_MOVEMENT_LAST_AGE = 47;
export const FLAIL_HITSPLAT_FIRST_AGE = 49;
export const FLAIL_HITSPLAT_LAST_AGE = 58;
export const FLAIL_SHAKE_LAST_AGE = 107;

function rotationMatrix(rotation: number): FlailMatrix {
  const index = (rotation >> 8) & 0xff;
  const sin = GBA_SINE_TABLE_256[index]!;
  const cos = GBA_SINE_TABLE_256[(index + 64) & 0xff]!;
  return { a: cos, b: sin === 0 ? 0 : -sin, c: sin, d: cos };
}

function truncDiv(numerator: number, denominator: number): number {
  return Math.trunc(numerator / denominator);
}

/** Direct port of `AnimTask_FlailMovement` and its callback. */
export function flailMovementAtAge(age: number): Readonly<{
  task: FlailMovementTask | null;
  offset: Readonly<{ x2: number; y2: number }>;
  matrix: FlailMatrix;
}> {
  if (age < FLAIL_MOVEMENT_FIRST_AGE || age > FLAIL_MOVEMENT_LAST_AGE) {
    return { task: null, offset: { x2: 0, y2: 0 }, matrix: IDENTITY };
  }
  let phase: 0 | 1 | 2 = 0;
  let taskAge = 0;
  let rotation = 0;
  let decayRemaining = 32;
  let amplitude = 0x800;
  for (let row = FLAIL_MOVEMENT_FIRST_AGE; row <= age; row += 1) {
    if (phase === 0) {
      rotation += 0x200;
      if (rotation >= amplitude) {
        const diff = amplitude - rotation;
        const div = truncDiv(diff, amplitude * 2);
        const mod = diff % (amplitude * 2);
        if ((div & 1) === 0) {
          rotation = amplitude - mod;
          phase = 1;
        } else {
          rotation = mod - amplitude;
        }
      }
    } else if (phase === 1) {
      rotation -= 0x200;
      if (rotation <= -amplitude) {
        const diff = amplitude - rotation;
        const div = truncDiv(diff, amplitude * 2);
        const mod = diff % (amplitude * 2);
        if ((div & 1) === 0) {
          rotation = mod - amplitude;
          phase = 0;
        } else {
          rotation = amplitude - mod;
        }
      }
    }
    taskAge += 1;
    if (taskAge > 8) {
      if (decayRemaining > 0) {
        decayRemaining -= 1;
        amplitude = Math.max(16, amplitude - 64);
      } else {
        phase = 2;
      }
    }
  }
  const matrix = phase === 2 ? IDENTITY : rotationMatrix(rotation);
  const displayedRotation = phase === 2 ? 0 : rotation;
  return {
    task: {
      phase,
      age: taskAge,
      rotation: displayedRotation,
      decayRemaining,
      decayStep: 64,
      amplitude,
    },
    offset: {
      x2: displayedRotation === 0 ? 0 : -((displayedRotation >= 0
        ? displayedRotation
        : displayedRotation + 63) >> 6),
      y2: Math.abs(matrix.c) >> 3,
    },
    matrix,
  };
}

export function flailShakeAmplitude(power: number): number {
  return Math.min(16, Math.max(1, Math.trunc(power / 12)));
}

/** Source software `x2`; the framebuffer transfer latch remains compositor-owned. */
export function flailTargetShakeAtAge(
  age: number,
  power: number,
  initialX2: number,
): number {
  if (age < 50) return initialX2;
  if (age > FLAIL_SHAKE_LAST_AGE) return 0;
  const amplitude = flailShakeAmplitude(power);
  return Math.floor((age - 50) / 2) % 2 === 0
    ? initialX2 + Math.ceil(amplitude / 2)
    : initialX2 - Math.floor(amplitude / 2);
}

/**
 * Pure pointer-relative `Move_FLAIL` reducer. Visual RNG is an immutable input
 * from `gRng2Value`; this function never touches gameplay RNG or ambient state.
 */
export function flailAtAge(
  age: number,
  geometry: Readonly<{
    attackerSide: FlailSide;
    targetCenter: Readonly<{ x: number; y: number }>;
    /** `x2` captured by the source shake task before it starts. */
    targetInitialX2: number;
    power: FlailPower;
    visualRandom: FlailVisualRandom;
  }>,
): FlailState {
  const movement = flailMovementAtAge(age);
  const hitsplat = age >= FLAIL_HITSPLAT_FIRST_AGE
    && age <= FLAIL_HITSPLAT_LAST_AGE
    ? {
        center: geometry.targetCenter,
        offset: {
          x2: (geometry.visualRandom.x % 48) - 24,
          y2: (geometry.visualRandom.y % 24) - 12,
        },
        animation: 3 as const,
        matrix: { a: 512, b: 0, c: 0, d: 512 },
      }
    : null;
  return {
    active: age >= 0 && age < FLAIL_FRAME_COUNT - 1,
    monbgTarget: age >= 4 && age <= 110,
    alpha: age >= 6 && age <= 112 ? { eva: 12, evb: 8 } : null,
    movementTask: movement.task,
    attackerOffset: movement.offset,
    attackerMatrix: movement.matrix,
    hitsplat,
    targetShakeX2: flailTargetShakeAtAge(
      age,
      geometry.power,
      geometry.targetInitialX2,
    ),
    shakeAmplitude: flailShakeAmplitude(geometry.power),
    sound: age === 7 ? "SE_M_HEADBUTT"
      : age === FLAIL_HITSPLAT_FIRST_AGE ? "SE_M_MEGA_KICK2" : null,
  };
}
