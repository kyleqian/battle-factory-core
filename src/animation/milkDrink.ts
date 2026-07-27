import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  healingBlueStarsAtAge,
  type RecoverEffectSprite,
} from "./recover.ts";

export const MILK_DRINK_BOTTLE_LAST_AGE = 102;
export const MILK_DRINK_RING_START_AGE = 104;
export const MILK_DRINK_RING_LAST_AGE = 134;
export const MILK_DRINK_HEALING_START_AGE = 136;

export interface MilkDrinkBottleSprite {
  readonly kind: "bottle";
  readonly x: number;
  readonly y: number;
  readonly xScale: number;
  readonly rotB: number;
  readonly rotC: number;
  readonly yScale: number;
  readonly eva: number;
  readonly evb: number;
  readonly invisible: boolean;
}

export interface MilkDrinkRingSprite {
  readonly kind: "ring";
  readonly x: number;
  readonly y: number;
  readonly xScale: number;
  readonly yScale: number;
}

export type MilkDrinkEffectSprite =
  | MilkDrinkBottleSprite
  | MilkDrinkRingSprite
  | RecoverEffectSprite;

function milkBottleRotationAtAge(age: number): number {
  if (age < 40) return 0;
  const tick = (age - 40) % 60;
  if (tick < 12) return (tick + 1) * 2;
  if (tick < 18) return 24;
  if (tick < 42) return 24 - (tick - 17) * 2;
  if (tick < 48) return -24;
  return -24 + (tick - 47) * 2;
}

function milkBottleWobble(age: number): Readonly<{ x2: number; y2: number }> {
  if (age < 41) return { x2: 0, y2: 0 };
  let phase = 0;
  let offset = 0;
  for (let callbackAge = 41; callbackAge <= age; callbackAge += 1) {
    if (phase <= 11) offset += 2;
    if (phase >= 18 && phase <= 41) offset -= 2;
    if (phase > 47) offset += 2;
    phase = phase === 59 ? 0 : phase + 1;
  }
  return {
    x2: Math.trunc(offset / 9),
    y2: Math.abs(Math.trunc(offset / 14)),
  };
}

function milkBottleAlphaAtAge(age: number): Readonly<{ eva: number; evb: number }> {
  if (age <= 31) {
    return {
      eva: Math.floor((age + 2) / 2),
      evb: 16 - Math.floor((age + 1) / 2),
    };
  }
  if (age < 70) return { eva: 16, evb: 0 };
  const steps = Math.min(age - 69, 32);
  return {
    eva: 16 - Math.floor(steps / 2),
    evb: Math.ceil(steps / 2),
  };
}

/**
 * Complete `Move_MILK_DRINK` visual body relative to
 * `gMilkBottleSpriteTemplate`'s creation callback.
 */
export function milkDrinkEffectAtAge(
  age: number,
  side: "player" | "opponent",
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly MilkDrinkEffectSprite[] {
  if (age >= 0 && age <= MILK_DRINK_BOTTLE_LAST_AGE) {
    const angle = milkBottleRotationAtAge(age) & 0xff;
    const sin = GBA_SINE_TABLE_256[angle]!;
    const cos = GBA_SINE_TABLE_256[(angle + 64) & 0xff]!;
    const wobble = milkBottleWobble(age);
    const fall = age < 41 ? 0 : Math.floor((age - 40) / 3);
    const alpha = milkBottleAlphaAtAge(age);
    return [{
      kind: "bottle",
      x: targetCenter.x + wobble.x2,
      y: targetCenter.y - 24 + fall + wobble.y2,
      xScale: cos,
      rotB: sin === 0 ? 0 : -sin,
      rotC: sin,
      yScale: cos,
      ...alpha,
      invisible: age === MILK_DRINK_BOTTLE_LAST_AGE,
    }];
  }

  if (age >= MILK_DRINK_RING_START_AGE && age <= MILK_DRINK_RING_LAST_AGE) {
    const local = age - MILK_DRINK_RING_START_AGE;
    const scale = 32 + local * 16;
    const matrix = Math.trunc(0x10000 / scale);
    return [{
      kind: "ring",
      x: targetCenter.x,
      y: targetCenter.y,
      xScale: matrix,
      yScale: matrix,
    }];
  }

  if (age >= MILK_DRINK_HEALING_START_AGE) {
    return healingBlueStarsAtAge(
      age - MILK_DRINK_HEALING_START_AGE,
      side,
      targetCenter,
    );
  }
  return [];
}
