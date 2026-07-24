/**
 * Source-relative presentation reducer for `Move_FLAMETHROWER`.
 *
 * The script creates 22 `gFlamethrowerFlameSpriteTemplate` sprites at a
 * four-display cadence. Each follows `AnimToTargetInSinWave` for the same
 * 30-step fixed-point translation while `AnimTask_StartSinAnimTimer`
 * advances the creation phase by three per task tick.
 */

import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";
import {
  createOrderedSprite,
  createSpriteOrderState,
  destroyOrderedSprite,
  sortSpriteOrder,
  spriteOwnersBackToFront,
  spriteSlotForOwner,
  updateOrderedSprite,
  type SpriteOrderState,
} from "./spriteOrder.ts";

export interface FlamethrowerGeometry {
  readonly attackerCenter: Readonly<{ x: number; y: number }>;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  readonly attackerSide: "player" | "opponent";
  readonly flameSubpriority: number;
  /** Lowest-free source slots available to this 22-sprite burst. */
  readonly flameSpriteSlots: readonly number[];
  /**
   * Those slots' live relative `sSpriteOrder` immediately before the first
   * flame allocation. Equal-priority/equal-y ties inherit this order.
   */
  readonly spriteOrderSeed: readonly number[];
}

export interface FlamethrowerFlame {
  readonly spawnIndex: number;
  readonly age: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly sheetFrame: 1 | 2 | 3;
  readonly subpriority: number;
  readonly slot: number;
}

export interface FlamethrowerBattlerEffect {
  readonly attackerY2: number;
  readonly targetX2: number;
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
}

export const FLAMETHROWER_FLAME_COUNT = 22;
export const FLAMETHROWER_FLAME_INTERVAL = 4;
export const FLAMETHROWER_FLAME_LIFETIME = 29;
export const FLAMETHROWER_MONBG_FIRST_AGE = -11;
export const FLAMETHROWER_TEARDOWN_AGE = 114;

function signedLinearOffset(
  start: number,
  end: number,
  duration: number,
  steps: number,
): number {
  let delta = Math.floor((Math.abs(end - start) << 8) / duration);
  if (end < start) delta |= 1;
  else delta &= ~1;
  const magnitude = (delta * steps) >> 8;
  return end < start ? -magnitude : magnitude;
}

function sineOffset(spawnIndex: number, callbackIndex: number): number {
  let phase = (spawnIndex * 12) & 0xff;
  let amplitude = 16;
  if (phase > 127) {
    phase -= 127;
    amplitude = -amplitude;
  }
  const phaseStep = Math.floor(0xd200 / 30);
  let result = 0;
  for (let call = 0; call <= callbackIndex; call += 1) {
    result = (GBA_SINE_TABLE_256[phase & 0xff]! * amplitude) >> 8;
    if (((phase * 256 + phaseStep) >> 8) > 127) {
      phase = 0;
      amplitude = -amplitude;
    } else {
      phase = (phase * 256 + phaseStep) >> 8;
    }
  }
  return result;
}

export function flamethrowerFlamesAtAge(
  animationAge: number,
  geometry: Readonly<FlamethrowerGeometry>,
): readonly FlamethrowerFlame[] {
  if (animationAge < 0) return [];
  let scheduler: SpriteOrderState = createSpriteOrderState(
    geometry.flameSpriteSlots,
    geometry.spriteOrderSeed,
  );
  let current: FlamethrowerFlame[] = [];
  let priorOwners = new Set<number>();
  for (let tickAge = 0; tickAge <= animationAge; tickAge += 1) {
    const flames: Omit<FlamethrowerFlame, "slot">[] = [];
    for (
      let spawnIndex = 0;
      spawnIndex < FLAMETHROWER_FLAME_COUNT;
      spawnIndex += 1
    ) {
      const age = tickAge - spawnIndex * FLAMETHROWER_FLAME_INTERVAL;
      if (age < 0 || age >= FLAMETHROWER_FLAME_LIFETIME) continue;
      const steps = age + 2;
      flames.push({
        spawnIndex,
        age,
        centerX:
          geometry.attackerCenter.x
          + (geometry.attackerSide === "player" ? 10 : -10)
          + signedLinearOffset(
            geometry.attackerCenter.x
              + (geometry.attackerSide === "player" ? 10 : -10),
            geometry.targetCenter.x,
            30,
            steps,
          ),
        centerY:
          geometry.attackerCenter.y
          + 10
          + signedLinearOffset(
            geometry.attackerCenter.y + 10,
            geometry.targetCenter.y,
            30,
            steps,
          )
          + sineOffset(spawnIndex, age + 1),
        sheetFrame: ((Math.floor((age + 1) / 2) % 3) + 1) as 1 | 2 | 3,
        subpriority: geometry.flameSubpriority,
      });
    }
    const owners = new Set(flames.map((flame) => flame.spawnIndex));
    for (const owner of priorOwners) {
      if (!owners.has(owner)) scheduler = destroyOrderedSprite(scheduler, owner);
    }
    for (const flame of flames) {
      const key = {
        priority: 2,
        subpriority: flame.subpriority,
        oamY: flame.centerY - 16,
      };
      scheduler =
        spriteSlotForOwner(scheduler, flame.spawnIndex) === null
          ? createOrderedSprite(scheduler, flame.spawnIndex, key)
          : updateOrderedSprite(scheduler, flame.spawnIndex, key);
    }
    scheduler = sortSpriteOrder(scheduler);
    priorOwners = owners;
    if (tickAge === animationAge) {
      const byOwner = new Map(flames.map((flame) => [flame.spawnIndex, flame]));
      current = spriteOwnersBackToFront(scheduler).map((owner) => ({
        ...byOwner.get(owner)!,
        slot: spriteSlotForOwner(scheduler, owner)!,
      }));
    }
  }
  return current;
}

export function flamethrowerBattlerEffectAtAge(
  animationAge: number,
): FlamethrowerBattlerEffect {
  const attackerStep = animationAge + 6;
  const targetStep = animationAge - 26;
  return {
    attackerY2:
      attackerStep >= 0 && attackerStep < 88
        ? Math.floor(attackerStep / 2) % 2 === 0 ? 2 : 0
        : 0,
    targetX2:
      targetStep >= 0 && targetStep < 84
        ? Math.floor(targetStep / 2) % 2 === 0 ? 3 : 0
        : 0,
    targetOnMonBg:
      animationAge >= FLAMETHROWER_MONBG_FIRST_AGE
      && animationAge < FLAMETHROWER_TEARDOWN_AGE,
    alpha:
      animationAge >= -8 && animationAge < FLAMETHROWER_TEARDOWN_AGE
        ? { eva: 12, evb: 8 }
        : null,
  };
}

/** Task-write/OAM-build display epoch observed in both Scene ON orientations. */
export function flamethrowerDisplayedBattlerOffsetsAtAge(
  animationAge: number,
): Readonly<{ attackerY2: number; targetX2: number }> {
  return {
    attackerY2:
      animationAge >= -7
      && animationAge < 82
      && Math.floor((animationAge + 8) / 2) % 2 === 0
        ? 2
        : 0,
    targetX2:
      animationAge >= 27
      && animationAge < 109
      && Math.floor((animationAge - 25) / 2) % 2 === 1
        ? 3
        : 0,
  };
}
