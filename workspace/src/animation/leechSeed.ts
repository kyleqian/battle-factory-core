import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  absorbAtAge,
  absorptionOrbAtCallbacks,
  type AbsorbSound,
  type AbsorbSprite,
} from "./absorb.ts";

export type LeechSeedSide = "player" | "opponent";
export type LeechSeedBody = "main" | "residual";

export interface LeechSeedProjectile {
  readonly spawnIndex: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly visible: boolean;
  readonly frameOffset: 0 | 4 | 8;
  readonly callback: "arc" | "hidden-wait" | "sprout" | "destroy";
}

export type LeechSeedSound = AbsorbSound
  | "SE_M_POISON_POWDER"
  | "SE_M_TAIL_WHIP";

export interface LeechSeedState {
  readonly body: LeechSeedBody;
  readonly sprites: readonly (LeechSeedProjectile | AbsorbSprite)[];
  readonly targetX2: number;
  readonly targetY2: number;
  readonly targetOnMonBg: boolean;
  readonly targetMonBgCleanup: boolean;
  readonly splitBgPriorityFoes: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly bgPaletteBlendY: number;
  readonly bgPaletteBlendColor: 0x33ed;
  readonly paletteControllerActive: boolean;
  readonly soundRestart: LeechSeedSound | null;
  readonly soundLoopActive: boolean;
  readonly loadedTags: readonly (
    | "ANIM_TAG_SEED"
    | "ANIM_TAG_ORBS"
    | "ANIM_TAG_BLUE_STAR"
    | "ANIM_TAG_IMPACT"
  )[];
  readonly sourceOwner:
    | "Move_LEECH_SEED"
    | "General_LeechSeedDrain"
    | "Move_ABSORB"
    | "AbsorbEffect"
    | "HealingEffect";
  readonly active: boolean;
}

export const LEECH_SEED_PROJECTILES = Object.freeze([
  Object.freeze({ spawnAge: 4, targetX: 0, targetY: 24, duration: 35, waveAmplitude: -32 }),
  Object.freeze({ spawnAge: 14, targetX: -16, targetY: 24, duration: 35, waveAmplitude: -40 }),
  Object.freeze({ spawnAge: 24, targetX: 16, targetY: 24, duration: 35, waveAmplitude: -37 }),
] as const);

function gbaSin(index: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[index & 0xff]! * amplitude) >> 8;
}

function signedLinearOffset(
  distance: number,
  callbacks: number,
  duration: number,
): number {
  let delta = Math.trunc((Math.abs(distance) * 256) / duration);
  delta = distance < 0 ? delta | 1 : delta & ~1;
  const magnitude = Math.floor(delta * Math.min(callbacks, duration) / 256);
  return distance < 0 ? -magnitude : magnitude;
}

function projectileAtAge(
  age: number,
  index: number,
  attackerSide: LeechSeedSide,
  launchCenter: Readonly<{ x: number; y: number }>,
  targetBase: Readonly<{ x: number; y: number }>,
): LeechSeedProjectile | null {
  const args = LEECH_SEED_PROJECTILES[index]!;
  const local = age - args.spawnAge;
  if (local < 0 || local > 108) return null;
  const direction = attackerSide === "player" ? 1 : -1;
  const x = launchCenter.x + direction * 15;
  const y = launchCenter.y;
  const endX = targetBase.x + direction * args.targetX;
  const endY = targetBase.y + args.targetY;
  const callbacks = Math.min(local + 1, args.duration);
  const phase = Math.floor(
    Math.trunc(0x8000 / args.duration) * callbacks / 256,
  );
  const arcEnds = args.duration;
  const firstSprout = arcEnds + 12;
  const destroy = firstSprout + 61;
  const sproutLocal = Math.max(0, local - firstSprout);
  return {
    spawnIndex: index,
    x,
    y,
    x2: signedLinearOffset(endX - x, callbacks, args.duration),
    y2: signedLinearOffset(endY - y, callbacks, args.duration)
      + gbaSin(phase, args.waveAmplitude),
    visible: local < arcEnds || (local >= firstSprout && local <= destroy),
    frameOffset: local < firstSprout ? 0
      : sproutLocal % 14 < 7 ? 4 : 8,
    callback: local < arcEnds ? "arc"
      : local < firstSprout ? "hidden-wait"
        : local < destroy ? "sprout" : "destroy",
  };
}

export function leechSeedMainAtAge(
  age: number,
  attackerSide: LeechSeedSide,
  launchCenter: Readonly<{ x: number; y: number }>,
  targetBase: Readonly<{ x: number; y: number }>,
  targetRestOffset: Readonly<{ x2: number; y2: number }> = { x2: 0, y2: 0 },
): LeechSeedState {
  const sprites = LEECH_SEED_PROJECTILES.map((_, index) =>
    projectileAtAge(age, index, attackerSide, launchCenter, targetBase)
  ).filter((sprite): sprite is LeechSeedProjectile => sprite !== null);
  const launch = age === 1 || age === 11 || age === 21;
  const tailWhip = age >= 38 && age <= 108 && (age - 38) % 10 === 0;
  return {
    body: "main",
    sprites,
    targetX2: targetRestOffset.x2,
    targetY2: targetRestOffset.y2,
    targetOnMonBg: false,
    targetMonBgCleanup: false,
    splitBgPriorityFoes: false,
    alpha: null,
    bgPaletteBlendY: 0,
    bgPaletteBlendColor: 0x33ed,
    paletteControllerActive: false,
    soundRestart: launch ? "SE_M_POISON_POWDER"
      : tailWhip ? "SE_M_TAIL_WHIP" : null,
    soundLoopActive: age >= 38 && age <= 113,
    loadedTags: age >= 0 && age <= 139 ? ["ANIM_TAG_SEED"] : [],
    sourceOwner: "Move_LEECH_SEED",
    active: age >= 0 && age <= 139,
  };
}

function residualOwner(age: number): LeechSeedState["sourceOwner"] {
  if (age <= 1) return "General_LeechSeedDrain";
  if (age <= 44) return "Move_ABSORB";
  if (age <= 92) return "AbsorbEffect";
  if (age <= 139) return "Move_ABSORB";
  if (age <= 175) return "HealingEffect";
  return "Move_ABSORB";
}

/** Natural `General_LeechSeedDrain` body at its own first retained age. */
export function leechSeedResidualAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
  absorptionCenter: Readonly<{ x: number; y: number }>,
  attackerSide: LeechSeedSide,
  targetRestOffset: Readonly<{ x2: number; y2: number }> = { x2: 0, y2: 0 },
): LeechSeedState {
  const nested = absorbAtAge(
    age - 12,
    targetCenter,
    absorptionCenter,
    attackerSide,
    absorptionCenter,
  );
  const sprites: Array<LeechSeedProjectile | AbsorbSprite> = [...nested.sprites];
  if (age === 27) {
    const hit = absorbAtAge(
      16, targetCenter, absorptionCenter, attackerSide, absorptionCenter,
    ).sprites.find((sprite) => sprite.kind === "hitsplat");
    if (hit) sprites.push(hit);
  }
  if (age >= 45 && age <= 87 && (age - 45) % 6 === 0) {
    const index = (age - 45) / 6;
    const orb = absorptionOrbAtCallbacks(
      index, 0, targetCenter, absorptionCenter, attackerSide,
    );
    if (orb) sprites.push(orb);
  }
  if (age >= 140 && age <= 167 && (age - 140) % 9 === 0) {
    const index = (age - 140) / 9;
    const star = absorbAtAge(
      age - 11,
      targetCenter,
      absorptionCenter,
      attackerSide,
      absorptionCenter,
    ).sprites.find((sprite) =>
      sprite.kind === "star" && sprite.spawnIndex === index
    );
    if (star) sprites.push(star);
  }
  const targetY2 = age === 31 || (age >= 34 && age <= 35)
      || (age >= 38 && age <= 39) ? 5 : 0;
  const targetX2 = age < 31 ? targetRestOffset.x2 : 0;
  const orbRestart = age >= 45 && age <= 87 && (age - 45) % 6 === 0;
  return {
    body: "residual",
    sprites,
    targetX2,
    targetY2,
    targetOnMonBg: age >= 11 && age <= 201,
    targetMonBgCleanup: age >= 202 && age <= 205,
    splitBgPriorityFoes: age >= 11 && age <= 201,
    alpha: age >= 14 && age <= 201 ? { eva: 12, evb: 8 } : null,
    bgPaletteBlendY: age < 17 || age >= 195 ? 0
      : age < 20 || age >= 192 ? 2 : 4,
    bgPaletteBlendColor: 0x33ed,
    paletteControllerActive: (age >= 14 && age <= 26)
      || (age >= 189 && age <= 201),
    soundRestart: age === 27 ? "SE_M_ABSORB"
      : orbRestart ? "SE_M_CRABHAMMER"
        : age === 140 ? "SE_M_ABSORB_2" : null,
    soundLoopActive: false,
    loadedTags: age >= 2 && age <= 205
      ? ["ANIM_TAG_ORBS", "ANIM_TAG_BLUE_STAR", "ANIM_TAG_IMPACT"] : [],
    sourceOwner: residualOwner(age),
    active: age >= 0 && age <= 205,
  };
}

export function leechSeedAtAge(
  body: LeechSeedBody,
  age: number,
  attackerSide: LeechSeedSide,
  launchOrAbsorptionCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
  targetBase: Readonly<{ x: number; y: number }>,
  targetRestOffset: Readonly<{ x2: number; y2: number }> = { x2: 0, y2: 0 },
): LeechSeedState {
  return body === "main"
    ? leechSeedMainAtAge(
      age, attackerSide, launchOrAbsorptionCenter, targetBase, targetRestOffset,
    )
    : leechSeedResidualAtAge(
      age, targetCenter, launchOrAbsorptionCenter, attackerSide, targetRestOffset,
    );
}
