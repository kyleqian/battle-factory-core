/**
 * Source-shaped, presentation-only primitives for Move_WATER_SPOUT.
 *
 * The live scene supplies HP, battler geometry, allocator slots, and the
 * animation-local seed.  This module does not read battle recordings and
 * does not own damage, HP mutation, or the battle RNG.
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type WaterSpoutSide = "player" | "opponent";
export type WaterSpoutPowerTier = 0 | 1 | 2 | 3;

export const WATER_SPOUT_GLOWY_BLUE_ORB_TAG = 10268;
export const WATER_SPOUT_WATER_IMPACT_TAG = 10148;
export const WATER_SPOUT_IMPACT_AFFINE_ANIM = 3;
export const WATER_SPOUT_HORIZONTAL_SHAKE = { target: "ANIM_TARGET", amplitude: 0, duration: 12 } as const;

export interface WaterSpoutLiveInputs {
  readonly attackerSide: WaterSpoutSide;
  readonly attackerHp: number;
  readonly attackerMaxHp: number;
  readonly attackerEffectCenter: Readonly<{ x: number; y: number }>;
  readonly attackerSubpriority: number;
  readonly launchTaskSlot: number;
  readonly launchSpriteSlots: readonly number[];
  readonly animationRng: number;
}

export interface WaterSpoutLaunchOrbSeed {
  readonly index: number;
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly subpriority: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly immediateCallback: boolean;
  readonly data: readonly [0 | 1, number, number, number, number, number, number, 2];
}

export interface WaterSpoutRainAttempt {
  readonly index: number;
  /** Age in executions of AnimTask_WaterSpoutRain_Step, not a battle tick. */
  readonly taskCallbackAge: number;
  readonly x: number;
  readonly impactY: number;
  readonly sineIndex: number;
  readonly nextX: number;
  readonly fallCallbacks: number;
  readonly impactCallbacks: 24;
}

function assertU16(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) throw new Error(`invalid ${label}`);
}

function sine(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function cosine(angle: number, amplitude: number): number {
  return sine(angle + 64, amplitude);
}

/** Exact GetWaterSpoutPowerForAnim quarter test, including u16 / 4 truncation. */
export function waterSpoutPowerTier(hp: number, maxHp: number): WaterSpoutPowerTier {
  assertU16(hp, "Water Spout HP");
  assertU16(maxHp, "Water Spout max HP");
  if (maxHp === 0 || hp > maxHp) throw new Error("invalid Water Spout live HP pair");
  const quarter = Math.trunc(maxHp / 4);
  for (let tier = 0; tier < 3; tier += 1) {
    if (hp < quarter * (tier + 1)) return tier as WaterSpoutPowerTier;
  }
  return 3;
}

export function waterSpoutLaunchOrbCount(tier: WaterSpoutPowerTier): number {
  const increment = 4 - tier;
  return Math.ceil(20 / increment);
}

/** CreateWaterSpoutLaunchDroplets plus the alternating immediate callback. */
export function waterSpoutLaunchOrbSeeds(
  inputs: Readonly<WaterSpoutLiveInputs>,
): readonly WaterSpoutLaunchOrbSeed[] {
  const tier = waterSpoutPowerTier(inputs.attackerHp, inputs.attackerMaxHp);
  const increment = 4 - tier;
  const count = waterSpoutLaunchOrbCount(tier);
  if (!Number.isInteger(inputs.launchTaskSlot) || inputs.launchTaskSlot < 0
    || inputs.launchSpriteSlots.length < count
    || !Number.isInteger(inputs.attackerSubpriority)) throw new Error("invalid Water Spout launch profile");
  const result: WaterSpoutLaunchOrbSeed[] = [];
  let trigIndex = 172;
  let creationOrder = 0;
  for (let i = 0; i < 20; i += increment) {
    const immediateCallback = (creationOrder & 1) !== 0;
    let velocityX = cosine(trigIndex, 64);
    let velocityY = sine(trigIndex, 64);
    // AnimSmallWaterOrb applies these once, on its first callback. The task
    // calls only alternating new sprites immediately; the rest retain the
    // unadjusted seed until the next scheduler pass.
    if (immediateCallback) {
      velocityX += (i % 6) * 3;
      velocityY += (i % 3) * 3;
    }
    let fixedX = inputs.attackerEffectCenter.x * 16;
    let fixedY = inputs.attackerEffectCenter.y * 16;
    if (immediateCallback) { fixedX += velocityX; fixedY += velocityY; }
    result.push({
      index: i,
      slot: inputs.launchSpriteSlots[creationOrder]!,
      x: fixedX >> 4,
      y: fixedY >> 4,
      subpriority: inputs.attackerSubpriority - 1,
      velocityX,
      velocityY,
      immediateCallback,
      data: [immediateCallback ? 1 : 0, i, fixedX, fixedY, velocityX, velocityY, inputs.launchTaskSlot, 2],
    });
    creationOrder += 1;
    trigIndex = (trigIndex + increment * 2) & 0xff;
  }
  return result;
}

export function waterSpoutRainAttemptCount(tier: WaterSpoutPowerTier): number {
  return tier * 5 + 5;
}

/** Signed low 32-bit ISO_RANDOMIZE2 used by the source before its modulo. */
export function waterSpoutIsoRandomize2(value: number): number {
  return (Math.imul(1103515245, value) + 12345) | 0;
}

/** CreateWaterSpoutRainDroplet for every tier-owned attempt. */
export function waterSpoutRainAttempts(
  side: WaterSpoutSide,
  tier: WaterSpoutPowerTier,
): readonly WaterSpoutRainAttempt[] {
  const minX = side === "player" ? 136 : 16;
  const baseY = side === "player" ? 40 : 80;
  const width = 98;
  const result: WaterSpoutRainAttempt[] = [];
  let x = minX + 49;
  let sineIndex = 0;
  for (let index = 0; index < waterSpoutRainAttemptCount(tier); index += 1) {
    const impactY = ((GBA_SINE_TABLE_256[sineIndex]! + 3) >> 4) + baseY;
    const nextX = (waterSpoutIsoRandomize2(x) % width) + minX;
    result.push({
      index, taskCallbackAge: (index + 1) * 3, x, impactY, sineIndex, nextX,
      fallCallbacks: Math.ceil(impactY / 8), impactCallbacks: 24,
    });
    sineIndex = (sineIndex + 39) & 0xff;
    x = nextX;
  }
  return result;
}

export function waterSpoutComponentPlan(inputs: Readonly<WaterSpoutLiveInputs>) {
  const tier = waterSpoutPowerTier(inputs.attackerHp, inputs.attackerMaxHp);
  return {
    tier,
    launch: waterSpoutLaunchOrbSeeds(inputs),
    rain: waterSpoutRainAttempts(inputs.attackerSide, tier),
    impact: { affineAnim: WATER_SPOUT_IMPACT_AFFINE_ANIM, blinkCallbacks: 24 },
    shake: WATER_SPOUT_HORIZONTAL_SHAKE,
    resources: {
      glowyBlueOrb: WATER_SPOUT_GLOWY_BLUE_ORB_TAG,
      waterImpact: WATER_SPOUT_WATER_IMPACT_TAG,
    },
    animationRng: inputs.animationRng,
  } as const;
}
