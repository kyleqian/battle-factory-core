import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export const WATER_GUN_PROJECTILE_DURATION = 40;
export const WATER_GUN_DROPLET_START_AGES = [42, 62, 82] as const;
export const WATER_GUN_DROPLET_DURATIONS = [55, 50, 45] as const;
export const WATER_GUN_DROPLET_OFFSETS = [
  { x: 0, y: -15, targetX: 0, targetY: 15 },
  { x: 15, y: -20, targetX: 0, targetY: 15 },
  { x: -15, y: -10, targetX: 0, targetY: 10 },
] as const;

export interface WaterGunSprite {
  readonly kind: "projectile" | "hitsplat" | "droplet";
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly xScale: number;
  readonly rotB: number;
  readonly rotC: number;
  readonly yScale: number;
  readonly spawnIndex: number;
}

export interface WaterGunEffect {
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly sprites: readonly WaterGunSprite[];
}

function inverseAffine(scaleX: number, scaleY: number, angle: number) {
  const sin = GBA_SINE_TABLE_256[angle & 0xff]!;
  const cos = GBA_SINE_TABLE_256[(angle + 64) & 0xff]!;
  return {
    xScale: Math.trunc((cos * 256) / scaleX),
    rotB: Math.trunc((-sin * 256) / scaleX),
    rotC: Math.trunc((sin * 256) / scaleY),
    yScale: Math.trunc((cos * 256) / scaleY),
  };
}

/**
 * Complete `Move_WATER_GUN` visual body relative to the projectile's
 * creation callback. Geometry is derived from the literal script arguments
 * and the source battler animation coordinates.
 */
export function waterGunEffectAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): WaterGunEffect {
  const sprites: WaterGunSprite[] = [];
  if (age >= 0 && age < WATER_GUN_PROJECTILE_DURATION) {
    const callbacks = age + 1;
    const startX = attackerCenter.x + (attackerSide === "player" ? 20 : -20);
    const startY = attackerCenter.y;
    const dx = targetCenter.x - startX;
    const dy = targetCenter.y - startY;
    const arcAngle = Math.trunc((Math.trunc(0x8000 / 40) * callbacks) / 256) & 0xff;
    sprites.push({
      kind: "projectile",
      x: startX + linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(dx, 40), callbacks, 40,
      ),
      y: startY + linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(dy, 40), callbacks, 40,
      ) + Math.trunc((GBA_SINE_TABLE_256[arcAngle]! * -25) / 256),
      frame: 0,
      ...inverseAffine(256, 256, 0),
      spawnIndex: 0,
    });
  }

  if (age >= 42 && age <= 50) {
    const scale = 256 + 0xd8;
    sprites.push({
      kind: "hitsplat",
      x: targetCenter.x,
      y: targetCenter.y,
      frame: 0,
      ...inverseAffine(scale, scale, 0),
      spawnIndex: 0,
    });
  }

  for (let index = 0; index < WATER_GUN_DROPLET_START_AGES.length; index += 1) {
    const local = age - WATER_GUN_DROPLET_START_AGES[index]!;
    const duration = WATER_GUN_DROPLET_DURATIONS[index]!;
    if (local < 0 || local >= duration) continue;
    const offset = WATER_GUN_DROPLET_OFFSETS[index]!;
    const callbacks = local + 1;
    const scalePhase = callbacks % 12;
    const scaleX = 256 + (scalePhase < 6 ? -16 * scalePhase : -16 * (12 - scalePhase));
    const scaleY = 256 + (scalePhase < 6 ? 16 * scalePhase : 16 * (12 - scalePhase));
    sprites.push({
      kind: "droplet",
      x: targetCenter.x + offset.x + linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(offset.targetX - offset.x, duration), callbacks, duration,
      ),
      y: targetCenter.y + offset.y + linearTranslationOffsetAfterCallbacks(
        linearTranslationDeltaQ8(offset.targetY - offset.y, duration), callbacks, duration,
      ),
      frame: 1,
      ...inverseAffine(scaleX, scaleY, 0),
      spawnIndex: index,
    });
  }

  return {
    targetOffset: shakeMon2OffsetAtTick(1, 0, 8, 1, age - 42),
    sprites,
  };
}
