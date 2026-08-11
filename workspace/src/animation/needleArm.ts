import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type NeedleArmSide = "player" | "opponent";

export interface NeedleArmSpike {
  readonly wave: "inward" | "outward";
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
  readonly remaining: number;
}

export interface NeedleArmState {
  readonly active: boolean;
  readonly greenSpikeLoaded: boolean;
  readonly impactLoaded: boolean;
  readonly handsAndFeetLoaded: boolean;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly hitsplatVisible: boolean;
  readonly fistVisible: boolean;
  readonly spikes: readonly NeedleArmSpike[];
}

export const NEEDLE_ARM_FRAME_COUNT = 108;

const INWARD = [
  { x: 0, y: -32, slot: 3 },
  { x: 22, y: -22, slot: 4 },
  { x: 30, y: 0, slot: 5 },
  { x: 20, y: 20, slot: 7 },
  { x: 0, y: 28, slot: 9 },
  { x: -19, y: 19, slot: 3 },
  { x: -27, y: 0, slot: 4 },
  { x: -18, y: -18, slot: 5 },
  { x: 0, y: -25, slot: 7 },
  { x: 17, y: -17, slot: 9 },
  { x: 23, y: 0, slot: 3 },
  { x: 16, y: 16, slot: 4 },
] as const;

const OUTWARD = [
  { x: 0, y: -24, slot: 5 },
  { x: 17, y: -17, slot: 7 },
  { x: 24, y: 0, slot: 9 },
  { x: 17, y: 17, slot: 10 },
  { x: 0, y: 24, slot: 11 },
  { x: -17, y: 17, slot: 12 },
  { x: -24, y: 0, slot: 13 },
  { x: -17, y: -17, slot: 14 },
] as const;

function truncDiv(numerator: number, denominator: number): number {
  return Math.trunc(numerator / denominator);
}

function matrixForVector(
  x: number,
  y: number,
): Readonly<{ a: number; b: number; c: number; d: number }> {
  if (x === 0) {
    return y > 0
      ? { a: 0, b: 256, c: -256, d: 0 }
      : { a: 0, b: -256, c: 256, d: 0 };
  }
  if (y === 0) {
    return x > 0
      ? { a: 256, b: 0, c: 0, d: 256 }
      : { a: -256, b: 0, c: 0, d: -256 };
  }
  if (x > 0 && y > 0) return { a: 181, b: 181, c: -181, d: 181 };
  if (x > 0) return { a: 181, b: -181, c: 181, d: 181 };
  if (y > 0) return { a: -181, b: 181, c: -181, d: -181 };
  return { a: -181, b: -181, c: 181, d: -181 };
}

function translate(
  center: Readonly<{ x: number; y: number }>,
  offset: Readonly<{ x: number; y: number; slot: number }>,
  wave: "inward" | "outward",
  spawnIndex: number,
  localAge: number,
  duration: number,
): NeedleArmSpike {
  const startX = center.x + (wave === "inward" ? offset.x : 0);
  const startY = center.y + (wave === "inward" ? offset.y : 0);
  const endX = center.x + (wave === "outward" ? offset.x : 0);
  const endY = center.y + (wave === "outward" ? offset.y : 0);
  const stepX = truncDiv((endX - startX) * 16, duration);
  const stepY = truncDiv((endY - startY) * 16, duration);
  const callbacks = localAge + 1;
  return {
    wave,
    spawnIndex,
    oamSlot: offset.slot,
    x: (startX * 16 + stepX * callbacks) >> 4,
    y: (startY * 16 + stepY * callbacks) >> 4,
    matrix: matrixForVector(endX - startX, endY - startY),
    remaining: duration - callbacks,
  };
}

/** Age zero is Move_NEEDLE_ARM's first GREEN_SPIKE load display. */
export function needleArmAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): NeedleArmState {
  const spikes: NeedleArmSpike[] = [];
  for (const [index, offset] of INWARD.entries()) {
    const localAge = age - (10 + index * 4);
    if (localAge >= 0 && localAge < 16) {
      spikes.push(translate(targetCenter, offset, "inward", index, localAge, 16));
    }
  }
  for (const [index, offset] of OUTWARD.entries()) {
    // The interpreter's final same-frame create is deferred by its command
    // budget. Seven sprites therefore exist in initialized software state
    // for one tick; the eighth joins when all eight take their first step.
    if (age === 71 && index < 7) {
      spikes.push({
        wave: "outward",
        spawnIndex: index,
        oamSlot: offset.slot,
        x: targetCenter.x,
        y: targetCenter.y,
        matrix: matrixForVector(offset.x, offset.y),
        remaining: 10,
      });
      continue;
    }
    const localAge = age - 72;
    if (localAge >= 0 && localAge < 10) {
      spikes.push(translate(targetCenter, offset, "outward", index, localAge, 10));
    }
  }
  return {
    active: age >= 0 && age < 107,
    greenSpikeLoaded: age >= 1 && age < 107,
    impactLoaded: age >= 4 && age < 107,
    handsAndFeetLoaded: age >= 7 && age < 107,
    targetOffset: age >= 71 && age <= 105
      ? shakeMon2OffsetAtTick(4, 0, 18, 1, age - 71)
      : { x2: 0, y2: 0 },
    hitsplatVisible: age >= 71 && age <= 81,
    fistVisible: age >= 71 && age <= 80,
    spikes,
  };
}
