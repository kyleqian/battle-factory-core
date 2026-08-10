/** Pure source-relative reducer for the complete `Move_FLAME_WHEEL` body. */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";
import {
  slideMonToOffsetAtTick,
  slideMonToOriginalPosAtTick,
  type SlideMonBattlerSide,
} from "./slideMon.ts";
import {
  createOrderedSprite,
  createSpriteOrderState,
  destroyOrderedSprite,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  updateOrderedSprite,
  type SpriteOrderState,
} from "./spriteOrder.ts";

export const FLAME_WHEEL_FIRST_AGE = 0;
export const FLAME_WHEEL_LAST_AGE = 169;
export const FLAME_WHEEL_SPREAD_FIRST_AGE = 119;

export interface FlameWheelSprite {
  readonly kind: "spiral" | "fireSpread";
  readonly index: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly sheetFrame: 0 | 1 | 2 | 3 | 4;
  readonly slot: number;
  readonly subpriority: number;
}

export interface FlameWheelState {
  readonly age: number;
  readonly targetOnMonBg: boolean;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetRedCoefficient: number;
  /** Back-to-front source OAM painter order. */
  readonly sprites: readonly FlameWheelSprite[];
  readonly smallEmberTagLoaded: boolean;
  readonly splitBgPriority: boolean;
  readonly active: boolean;
}

const SPIRAL_SPAWN_AGES = [7, 11, 15, 19, 23, 27, 31] as const;
const SPIRAL_DELAYS = [0, 4, 8, 12, 16, 20, 24] as const;
const SPIRAL_SLOTS = [3, 4, 5, 7, 9, 10, 11] as const;
const SPREAD_SLOTS = [4, 5, 7, 9, 10, 11, 12] as const;
const ORDER_SLOTS = [3, 4, 5, 7, 9, 10, 11, 12] as const;
const ORDER_SEED = [4, 3, 5, 12, 11, 10, 9, 7] as const;
const SPREAD_VELOCITIES = [
  [192, 176], [-192, 240], [192, -160], [-192, -112],
  [160, 48], [-224, -32], [112, -128],
] as const;

function sin(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function spiralAtAge(
  age: number,
  index: number,
  center: Readonly<{ x: number; y: number }>,
  attackerSubpriority: number,
): FlameWheelSprite | null {
  const spawnAge = SPIRAL_SPAWN_AGES[index]!;
  const visibleAge = spawnAge + SPIRAL_DELAYS[index]! + 1;
  const local = age - visibleAge;
  if (local < 0 || local >= 56) return null;
  const amplitude = (0xd0 * local) >> 8;
  return {
    kind: "spiral",
    index,
    centerX: center.x + sin(local * 10, amplitude),
    centerY: center.y + sin(local * 10 + 64, amplitude),
    sheetFrame: (Math.floor((age - spawnAge + 1) / 4) % 5) as 0 | 1 | 2 | 3 | 4,
    slot: SPIRAL_SLOTS[index]!,
    subpriority: attackerSubpriority - 3,
  };
}

function fireSpreadAtAge(
  age: number,
  center: Readonly<{ x: number; y: number }>,
  targetSubpriority: number,
): readonly FlameWheelSprite[] {
  const local = age - FLAME_WHEEL_SPREAD_FIRST_AGE;
  if (local < 0 || local > 40) return [];
  const steps = Math.min(local + 1, 40);
  return SPREAD_VELOCITIES.map(([vx, vy], index) => ({
    kind: "fireSpread" as const,
    index,
    centerX: center.x + ((vx * steps) >> 8),
    centerY: center.y + 10 + ((vy * steps) >> 8),
    sheetFrame: (1 + (Math.floor((local + 1) / 4) % 3)) as 1 | 2 | 3,
    slot: SPREAD_SLOTS[index]!,
    subpriority: targetSubpriority - 1,
  }));
}

function sourcePainterOrderAtAge(
  age: number,
  attackerSubpriority: number,
  targetSubpriority: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly number[] {
  let order: SpriteOrderState = createSpriteOrderState(ORDER_SLOTS, ORDER_SEED);
  const live = new Set<number>();
  const create = (owner: number, priority: number, subpriority: number, oamY: number) => {
    order = createOrderedSprite(order, owner, { priority, subpriority, oamY });
    live.add(owner);
  };
  const destroy = (owner: number) => {
    if (!live.has(owner)) return;
    order = destroyOrderedSprite(order, owner);
    live.delete(owner);
  };
  for (let tick = 0; tick <= age; tick += 1) {
    for (let index = 0; index < SPIRAL_SPAWN_AGES.length; index += 1) {
      if (tick === SPIRAL_SPAWN_AGES[index]) {
        create(index, 2, attackerSubpriority, attackerCenter.y - 16);
      }
      const visibleAge = SPIRAL_SPAWN_AGES[index]! + SPIRAL_DELAYS[index]! + 1;
      if (tick === visibleAge + 56) destroy(index);
      if (live.has(index)) {
        const sprite = spiralAtAge(tick, index, attackerCenter, attackerSubpriority);
        order = updateOrderedSprite(order, index, {
          priority: 2,
          subpriority: attackerSubpriority,
          oamY: (sprite?.centerY ?? attackerCenter.y) - 16,
        });
      }
    }
    if (tick === 113) create(20, 3, attackerSubpriority + 1, targetCenter.y);
    if (tick === 127) destroy(20);
    if (tick === 128) create(21, 3, attackerSubpriority + 1, targetCenter.y);
    if (tick === 137) destroy(21);
    if (tick === FLAME_WHEEL_SPREAD_FIRST_AGE) {
      for (let index = 0; index < SPREAD_SLOTS.length; index += 1) {
        const sprite = fireSpreadAtAge(tick, targetCenter, targetSubpriority)[index]!;
        create(10 + index, 2, targetSubpriority - 1, sprite.centerY - 16);
      }
    }
    if (tick === 160) {
      for (let index = 0; index < SPREAD_SLOTS.length; index += 1) destroy(10 + index);
    }
    if (tick >= FLAME_WHEEL_SPREAD_FIRST_AGE && tick < 160) {
      const spreads = fireSpreadAtAge(tick, targetCenter, targetSubpriority);
      for (let index = 0; index < spreads.length; index += 1) {
        order = updateOrderedSprite(order, 10 + index, {
          priority: 2,
          subpriority: targetSubpriority - 1,
          oamY: spreads[index]!.centerY - 16,
        });
      }
    }
    order = sortSpriteOrder(order);
  }
  return spriteOwnersBackToFront(order);
}

export function flameWheelAtAge(
  age: number,
  attackerSide: SlideMonBattlerSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): FlameWheelState {
  const attackerSubpriority = attackerSide === "player" ? 30 : 40;
  const targetSubpriority = attackerSide === "player" ? 40 : 30;
  let attackerOffset = { x2: 0, y2: 0 };
  if (age >= 113 && age < 128) {
    attackerOffset = slideMonToOffsetAtTick({
      battlerSide: attackerSide, targetXOffset: 24, targetYOffset: 0,
      mirrorVertical: false, durationTicks: 6,
    }, age - 113);
  } else if (age >= 128 && age <= 136) {
    attackerOffset = slideMonToOriginalPosAtTick({
      currentX2: attackerSide === "player" ? 24 : -24,
      currentY2: 0, axisSnapMode: 0, durationTicks: 9,
    }, age - 128);
  }
  const targetOffset = age < 119
    ? { x2: 0, y2: 0 }
    : shakeMonOffsetAtTick(5, 0, 8, 1, age - 119 + 1);
  const targetRedCoefficient = age < 119 || age > 141
    ? 0
    : age <= 130 ? age - 118 : 142 - age;
  const unorderedSprites = [
    ...SPIRAL_SPAWN_AGES.map((_, index) =>
      spiralAtAge(age, index, attackerCenter, attackerSubpriority)),
    ...fireSpreadAtAge(age, targetCenter, targetSubpriority),
  ].filter((sprite): sprite is FlameWheelSprite => sprite !== null);
  const spriteByOwner = new Map(unorderedSprites.map((sprite) => [
    sprite.kind === "spiral" ? sprite.index : 10 + sprite.index,
    sprite,
  ]));
  const sprites = sourcePainterOrderAtAge(
    age, attackerSubpriority - 3, targetSubpriority,
    attackerCenter, targetCenter,
  ).map((owner) => spriteByOwner.get(owner))
    .filter((sprite): sprite is FlameWheelSprite => sprite !== undefined);
  return {
    age,
    targetOnMonBg: age >= 4 && age <= 160,
    attackerOffset,
    targetOffset,
    targetRedCoefficient,
    sprites,
    smallEmberTagLoaded: age >= 1 && age <= 168,
    splitBgPriority: age >= 4 && age <= 160,
    active: age >= 0 && age <= FLAME_WHEEL_LAST_AGE,
  };
}
