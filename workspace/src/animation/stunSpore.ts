import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type StunSporeSide = "player" | "opponent";
export interface StunSporePoint { readonly x: number; readonly y: number }

export interface StunSporeParticle {
  readonly index: number;
  readonly slot: number;
  /** Center coordinate before the callback's x2/y2 offsets. */
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data0: number;
  readonly data1: number;
  readonly data2: number;
  readonly data3: number;
  readonly data4: number;
  readonly data5: number;
  readonly animFrame: number;
  readonly priority: 2;
  readonly callback: "AnimMovePowderParticle_Step";
}

export interface StunSporeState {
  readonly active: boolean;
  readonly stunSporeLoaded: boolean;
  readonly scriptOffset: 0 | 3 | 68 | 146 | 224 | 300 | 301;
  readonly particles: readonly StunSporeParticle[];
  readonly sound: "SE_M_POISON_POWDER" | null;
  readonly soundPanSide: StunSporeSide | null;
  readonly soundLoopActive: boolean;
}

export const STUN_SPORE_FRAME_COUNT = 194;
export const STUN_SPORE_FIRST_INACTIVE_AGE = 193;

const SPAWNS = [
  { age: 4, x: -30, y: -22, yVelocity: 80, waveAmplitude: 5, waveSpeed: 1, slot: 3 },
  { age: 4, x: 10, y: -22, yVelocity: 80, waveAmplitude: -5, waveSpeed: 1, slot: 4 },
  { age: 4, x: -25, y: -22, yVelocity: 112, waveAmplitude: 5, waveSpeed: 3, slot: 5 },
  { age: 21, x: -5, y: -22, yVelocity: 80, waveAmplitude: -5, waveSpeed: 1, slot: 7 },
  { age: 21, x: 5, y: -22, yVelocity: 96, waveAmplitude: 5, waveSpeed: 1, slot: 9 },
  { age: 21, x: 0, y: -22, yVelocity: 69, waveAmplitude: -5, waveSpeed: 1, slot: 10 },
  { age: 21, x: -15, y: -22, yVelocity: 112, waveAmplitude: 5, waveSpeed: 2, slot: 11 },
  { age: 53, x: -15, y: -22, yVelocity: 112, waveAmplitude: 5, waveSpeed: 2, slot: 12 },
  { age: 53, x: 15, y: -22, yVelocity: 80, waveAmplitude: -5, waveSpeed: 1, slot: 13 },
  { age: 53, x: -10, y: -22, yVelocity: 96, waveAmplitude: 7, waveSpeed: 2, slot: 14 },
  { age: 53, x: -5, y: -22, yVelocity: 90, waveAmplitude: -8, waveSpeed: 0, slot: 15 },
  { age: 75, x: -10, y: -22, yVelocity: 80, waveAmplitude: -5, waveSpeed: 1, slot: 16 },
  { age: 75, x: 0, y: -22, yVelocity: 89, waveAmplitude: 5, waveSpeed: 2, slot: 17 },
  { age: 75, x: 20, y: -22, yVelocity: 112, waveAmplitude: -8, waveSpeed: 2, slot: 18 },
  { age: 75, x: 5, y: -22, yVelocity: 80, waveAmplitude: 5, waveSpeed: 1, slot: 19 },
] as const;

const OAM_SEED_ORDERS = [
  [3, 5, 4],
  [9, 7, 11, 10],
  [15, 14, 13, 12],
  [19, 18, 17, 16],
] as const;

function gbaSin(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function scriptOffsetAtAge(age: number): StunSporeState["scriptOffset"] {
  if (age <= 0) return 0;
  if (age <= 3) return 3;
  if (age < 21) return 68;
  if (age < 53) return 146;
  if (age < 75) return 224;
  if (age < STUN_SPORE_FIRST_INACTIVE_AGE) return 300;
  return 301;
}

function particleAtAge(
  age: number,
  index: number,
  targetCenter: StunSporePoint,
  waveSign: 1 | -1,
): StunSporeParticle | null {
  const spawn = SPAWNS[index]!;
  if (age < spawn.age || age > spawn.age + 116) return null;
  // AnimMovePowderParticle initializes the fixed-point fields, then the
  // installed callback runs once in the creation pass. Each later source
  // frame advances the same callback once more.
  const steps = age - spawn.age + 1;
  const angle = spawn.waveSpeed * (steps - 1);
  const waveAmplitude = spawn.waveAmplitude * waveSign;
  const data2 = spawn.yVelocity * steps;
  return {
    index,
    slot: spawn.slot,
    x: targetCenter.x + spawn.x,
    y: targetCenter.y + spawn.y,
    x2: gbaSin(angle, waveAmplitude),
    // The callback exposes data[2] after its increment, while OAM latches
    // y2 from the fixed-point value that preceded that increment.
    y2: (data2 - spawn.yVelocity) >> 8,
    data0: 117 - steps,
    data1: spawn.yVelocity,
    data2,
    data3: waveAmplitude,
    data4: spawn.waveSpeed,
    data5: (spawn.waveSpeed * steps) & 0xff,
    animFrame: Math.floor((steps - 1) / 5) % 8,
    priority: 2,
    callback: "AnimMovePowderParticle_Step",
  };
}

export function stunSporeParticlesAtAge(
  age: number,
  targetCenter: StunSporePoint,
  waveSign: 1 | -1 = 1,
): readonly StunSporeParticle[] {
  return SPAWNS
    .map((_, index) => particleAtAge(age, index, targetCenter, waveSign))
    .filter((value): value is StunSporeParticle => value !== null);
}

/**
 * Source-relative tie/order reducer for the latched powder OBJ list.
 *
 * The ROM keeps `sSpriteOrder` between frames and insertion-sorts equal
 * priority sprites by descending OAM Y. New particle groups enter with the
 * slot order observed before their first sort. The hardware list is emitted
 * in that order; the GBA's equal-priority OBJ compositing makes the software
 * draw order its reverse.
 */
export function stunSporeParticleDrawOrderAtAge(age: number): readonly number[] {
  if (age < 4 || age > 191) return [];
  const order: number[] = [];
  for (let sourceAge = 4; sourceAge <= age; sourceAge += 1) {
    if (sourceAge === 4) order.push(...OAM_SEED_ORDERS[0]);
    else if (sourceAge === 21) order.push(...OAM_SEED_ORDERS[1]);
    else if (sourceAge === 53) order.push(...OAM_SEED_ORDERS[2]);
    else if (sourceAge === 75) order.push(...OAM_SEED_ORDERS[3]);
    const active = new Set(
      stunSporeParticlesAtAge(sourceAge, { x: 0, y: 0 }).map(
        (particle) => particle.slot,
      ),
    );
    for (let index = order.length - 1; index >= 0; index -= 1) {
      if (!active.has(order[index]!)) order.splice(index, 1);
    }
    const yBySlot = new Map(
      stunSporeParticlesAtAge(sourceAge, { x: 0, y: 0 }).map(
        (particle) => [particle.slot, particle.y + particle.y2] as const,
      ),
    );
    for (let index = 1; index < order.length; index += 1) {
      let cursor = index;
      while (
        cursor > 0
        && yBySlot.get(order[cursor - 1]!)! < yBySlot.get(order[cursor]!)!
      ) {
        [order[cursor - 1], order[cursor]] = [order[cursor]!, order[cursor - 1]!];
        cursor -= 1;
      }
    }
  }
  return order.reverse();
}

/** Pure source-relative port of Move_STUN_SPORE's visual script body. */
export function stunSporeAtAge(
  age: number,
  targetSide: StunSporeSide,
  targetCenter: StunSporePoint,
): StunSporeState {
  const sound = age >= 4 && age <= 48 && (age - 4) % 11 === 0
    ? "SE_M_POISON_POWDER"
    : null;
  return {
    active: age >= 0 && age < STUN_SPORE_FIRST_INACTIVE_AGE,
    stunSporeLoaded: age >= 1 && age < STUN_SPORE_FIRST_INACTIVE_AGE,
    scriptOffset: scriptOffsetAtAge(age),
    particles: stunSporeParticlesAtAge(
      age,
      targetCenter,
      targetSide === "player" ? -1 : 1,
    ),
    sound,
    soundPanSide: sound ? targetSide : null,
    soundLoopActive: age >= 4 && age < 58,
  };
}
