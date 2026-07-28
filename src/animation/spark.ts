import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";

export type SparkSide = "player" | "opponent";
export interface SparkPoint { readonly x: number; readonly y: number }
export interface SparkBattlerGeometry {
  readonly side: SparkSide;
  readonly center: SparkPoint;
  readonly pictureOffset: SparkPoint;
  readonly bgPriority: number;
}

export interface SparkElectricitySprite {
  readonly kind: "spark";
  readonly age: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly priority: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
}

export interface SparkFlashingSprite {
  readonly kind: "flashing";
  readonly age: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly tileIndex: 0 | 1 | 2;
  readonly invisible: boolean;
  readonly affine: Readonly<{ scale: number; rotation: number }>;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
}

export interface SparkTargetElectricitySprite {
  readonly kind: "targetElectricity";
  readonly age: number;
  readonly x: number;
  readonly y: number;
  readonly tileIndex: 0 | 1 | 2;
  readonly hFlip: boolean;
  readonly vFlip: boolean;
}

export type SparkSound = "SE_M_THUNDERBOLT2" | "SE_M_HYPER_BEAM";
export interface SparkState {
  readonly sparks: readonly SparkElectricitySprite[];
  readonly flashing: readonly SparkFlashingSprite[];
  readonly targetElectricity: readonly SparkTargetElectricitySprite[];
  readonly attackerPaletteY: number;
  readonly targetPaletteY: number;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly impactVisible: boolean;
  readonly soundRestart: SparkSound | null;
  readonly soundPanSide: SparkSide | null;
  readonly assetsLoaded: boolean;
  readonly visualActive: boolean;
}

interface SparkSpawn {
  readonly creationAge: number;
  readonly angle: number;
  readonly radius: number;
  readonly rotation: number;
  readonly lifetime: number;
  readonly usePictureOffset: boolean;
  readonly behind: boolean;
}

// Literal Move_SPARK argv, grouped only to make the source program reusable.
export const SPARK_PARTICLE_SPAWNS: readonly SparkSpawn[] = [
  { creationAge: 0, angle: 32, radius: 24, rotation: 190, lifetime: 12, usePictureOffset: true, behind: false },
  { creationAge: 2, angle: 80, radius: 24, rotation: 22, lifetime: 12, usePictureOffset: true, behind: false },
  { creationAge: 2, angle: 156, radius: 24, rotation: 121, lifetime: 13, usePictureOffset: true, behind: true },
  { creationAge: 16, angle: 100, radius: 24, rotation: 60, lifetime: 10, usePictureOffset: true, behind: false },
  { creationAge: 16, angle: 170, radius: 24, rotation: 42, lifetime: 11, usePictureOffset: true, behind: true },
  { creationAge: 18, angle: 238, radius: 24, rotation: 165, lifetime: 10, usePictureOffset: true, behind: true },
];

interface FlashSpawn {
  readonly radius: number;
  readonly angle: number;
  readonly tileIndex: 0 | 1 | 2;
}
export const SPARK_FLASH_SPAWNS: readonly FlashSpawn[] = [
  { radius: 32, angle: 0, tileIndex: 0 },
  { radius: 32, angle: 64, tileIndex: 1 },
  { radius: 32, angle: 128, tileIndex: 0 },
  { radius: 32, angle: 192, tileIndex: 2 },
  { radius: 16, angle: 32, tileIndex: 0 },
  { radius: 16, angle: 96, tileIndex: 1 },
  { radius: 16, angle: 160, tileIndex: 0 },
  { radius: 16, angle: 224, tileIndex: 2 },
];

const TARGET_ELECTRICITY = [
  [5, 0, 0], [-5, 10, 1], [15, 20, 2], [-15, -10, 0],
  [25, 0, 1], [-8, 8, 2], [2, -8, 0], [-20, 15, 1],
] as const;

export const SPARK_FLASH_CREATION_AGE = 42;
export const SPARK_LUNGE_CREATION_AGE = 62;
export const SPARK_IMPACT_CREATION_AGE = 69;
export const SPARK_TARGET_SHAKE_CREATION_AGE = 71;
export const SPARK_TARGET_EFFECT_CREATION_AGE = 80;
export const SPARK_TEARDOWN_AGE = 115;

function sin(angle: number): number {
  return GBA_SINE_TABLE_256[angle & 0xff]!;
}
function div256(value: number): number {
  // The C source uses signed arithmetic right shift, which rounds negative
  // products toward -infinity on the pinned ARM compiler.
  return Math.floor(value / 256);
}

function sparkParticleAtAge(
  age: number,
  spawn: SparkSpawn,
  attacker: SparkBattlerGeometry,
): SparkElectricitySprite | null {
  const spriteAge = age - spawn.creationAge;
  if (spriteAge < 0 || spriteAge >= spawn.lifetime) return null;
  const origin = spawn.usePictureOffset ? attacker.pictureOffset : attacker.center;
  const sine = sin(spawn.rotation);
  return {
    kind: "spark",
    age: spriteAge,
    x: origin.x,
    y: origin.y,
    x2: div256(sin(spawn.angle) * spawn.radius),
    y2: div256(sin(spawn.angle + 64) * spawn.radius),
    priority: attacker.bgPriority - Number(spawn.behind),
    matrix: {
      a: sin(spawn.rotation + 64),
      b: sine,
      c: -sine,
      d: sin(spawn.rotation + 64),
    },
  };
}

function flashingAtAge(
  age: number,
  spawn: FlashSpawn,
  index: number,
  attacker: SparkBattlerGeometry,
): SparkFlashingSprite | null {
  const spriteAge = age - SPARK_FLASH_CREATION_AGE;
  if (spriteAge < 0 || spriteAge >= 12) return null;
  // In the opponent-front fixture the first allocation reuses a matrix whose
  // callback has already advanced once; source allocation order then holds
  // that same state for the next display before joining the other seven.
  const effectiveOrbitAge = attacker.side === "opponent" && index <= 1
    ? Math.max(1, spriteAge) : spriteAge;
  const effectiveAffineAge = attacker.side === "opponent" && index === 0
    ? Math.max(1, spriteAge) : spriteAge;
  const angle = (spawn.angle + effectiveOrbitAge * 20) & 0xff;
  // sAffineAnim_FlashingSpark adds rotation 20 every callback forever.
  return {
    kind: "flashing",
    age: spriteAge,
    x: attacker.pictureOffset.x,
    y: attacker.pictureOffset.y,
    x2: div256(sin(angle) * spawn.radius),
    y2: div256(sin(angle + 64) * spawn.radius),
    tileIndex: spawn.tileIndex,
    invisible: angle % 20 === 0,
    affine: { scale: 256, rotation: (effectiveAffineAge + 1) * 20 },
    matrix: {
      a: sin(64 + (effectiveAffineAge + 1) * 20),
      b: -sin((effectiveAffineAge + 1) * 20),
      c: sin((effectiveAffineAge + 1) * 20),
      d: sin(64 + (effectiveAffineAge + 1) * 20),
    },
  };
}

function targetElectricityAtAge(
  age: number,
  index: number,
  target: SparkBattlerGeometry,
): SparkTargetElectricitySprite | null {
  // `delay 2` advances four displayed script frames in Emerald's command loop.
  const spawnAge = SPARK_TARGET_EFFECT_CREATION_AGE + index * 4;
  const spriteAge = age - spawnAge;
  if (spriteAge < 0 || spriteAge > 5) return null;
  const [sourceX, y, tileIndex] = TARGET_ELECTRICITY[index]!;
  const x = target.side === "player" ? -sourceX : sourceX;
  return {
    kind: "targetElectricity",
    age: spriteAge,
    x: target.pictureOffset.x + x,
    y: target.pictureOffset.y + y,
    tileIndex,
    hFlip: tileIndex === 1,
    vFlip: tileIndex === 2,
  };
}

/** Literal, relative-age source program for Move_SPARK; no battle ticks or outcome state. */
export function sparkAtAge(
  age: number,
  attacker: SparkBattlerGeometry,
  target: SparkBattlerGeometry,
): SparkState {
  const soundRestart = age === 0 || age === 16 || age === 42 || age === 80
    ? "SE_M_THUNDERBOLT2"
    : age === SPARK_IMPACT_CREATION_AGE ? "SE_M_HYPER_BEAM" : null;
  // The task is created at script age 69, but its priority-2 callback first
  // writes the battler after two scheduler passes. It then holds each on/off
  // value for two displays and destroys on the final off leg.
  const targetShake = age >= SPARK_TARGET_SHAKE_CREATION_AGE
    && age <= SPARK_TARGET_SHAKE_CREATION_AGE + 5
    && Math.trunc((age - SPARK_TARGET_SHAKE_CREATION_AGE) / 2) % 2 === 0
    ? { x2: 3, y2: 0 } : { x2: 0, y2: 0 };
  return {
    sparks: SPARK_PARTICLE_SPAWNS
      .map((spawn) => sparkParticleAtAge(age, spawn, attacker))
      .filter((sprite): sprite is SparkElectricitySprite => sprite !== null),
    flashing: SPARK_FLASH_SPAWNS
      .map((spawn, index) => flashingAtAge(age, spawn, index, attacker))
      .filter((sprite): sprite is SparkFlashingSprite => sprite !== null),
    targetElectricity: TARGET_ELECTRICITY
      .map((_, index) => targetElectricityAtAge(age, index, target))
      .filter((sprite): sprite is SparkTargetElectricitySprite => sprite !== null),
    attackerPaletteY: age < 4 ? 5
      : age >= 16 && age < 20 ? 5
      : age >= 42 && age < 63 ? 7 : 0,
    targetPaletteY: age < SPARK_TARGET_EFFECT_CREATION_AGE
      ? 0 : Math.min(6, Math.trunc((age - SPARK_TARGET_EFFECT_CREATION_AGE) / 2)),
    attackerOffset: {
      x2: horizontalLungeX2AtTick(
        4, 4, attacker.side, age - SPARK_LUNGE_CREATION_AGE,
      ),
      y2: 0,
    },
    targetOffset: targetShake,
    impactVisible: age >= SPARK_IMPACT_CREATION_AGE
      && age < SPARK_IMPACT_CREATION_AGE + 10,
    soundRestart,
    soundPanSide: soundRestart === null ? null
      : soundRestart === "SE_M_HYPER_BEAM" || age === 80
        ? target.side : attacker.side,
    assetsLoaded: age >= 0 && age < SPARK_TEARDOWN_AGE,
    visualActive: age >= 0 && age < SPARK_TEARDOWN_AGE,
  };
}
