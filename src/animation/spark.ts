import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";

export type SparkSide = "player" | "opponent";
export interface SparkPoint { readonly x: number; readonly y: number }
export interface SparkBattlerGeometry {
  readonly side: SparkSide;
  readonly center: SparkPoint;
  readonly pictureOffset: SparkPoint;
  readonly bgPriority: number;
  /** Source position used by the lunge controller and basic impact helper. */
  readonly impactPosition?: Readonly<SparkPoint>;
  /**
   * Number of scheduler callbacks already applied on the creation display.
   * This is explicit fixture/runtime state: the opponent-front fixture's
   * animation script task runs after sprite slots 3/4, so those two sprites
   * receive one extra callback. It is not a MINUN or side rule.
   */
  readonly flashingInitialCallbackAdvances?: readonly number[];
  /** Initial affine-command advances for the allocated matrix slots. */
  readonly flashingInitialAffineAdvances?: readonly number[];
}

export interface SparkElectricitySprite {
  readonly kind: "spark";
  readonly identity: string;
  readonly creationOrder: number;
  readonly slot: number;
  readonly subpriority: number;
  readonly tileNum: number;
  readonly matrixNum: number;
  readonly affineMode: "normal";
  readonly objMode: "normal";
  readonly shape: "square";
  readonly size: 1;
  readonly hidden: false;
  readonly hFlip: false;
  readonly vFlip: false;
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
  readonly identity: string;
  readonly creationOrder: number;
  readonly slot: number;
  readonly subpriority: number;
  readonly priority: 2;
  readonly tileNum: number;
  readonly matrixNum: number;
  readonly affineMode: "normal";
  readonly objMode: "normal";
  readonly shape: "square";
  readonly size: 1;
  readonly hidden: boolean;
  readonly hFlip: false;
  readonly vFlip: false;
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
  readonly identity: string;
  readonly creationOrder: number;
  readonly slot: 3 | 4;
  readonly subpriority: number;
  readonly priority: 2;
  readonly tileNum: number;
  readonly matrixNum: 0 | 8 | 16;
  readonly affineMode: "off";
  readonly objMode: "normal";
  readonly shape: "square";
  readonly size: 1;
  readonly hidden: false;
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
  readonly lungeController: Readonly<{
    readonly identity: "horizontal-lunge";
    readonly creationOrder: 14;
    readonly slot: 3;
    readonly subpriority: number;
    readonly hidden: true;
    readonly x: number;
    readonly y: number;
  }> | null;
  readonly impact: Readonly<{
    readonly identity: "impact";
    readonly creationOrder: 15;
    readonly slot: 4;
    readonly subpriority: number;
    readonly priority: 2;
    readonly tileNum: 305;
    readonly matrixNum: 0;
    readonly affineMode: "normal";
    readonly objMode: "blend";
    readonly shape: "square";
    readonly size: 2;
    readonly hidden: false;
    readonly hFlip: false;
    readonly vFlip: false;
    readonly x: number;
    readonly y: number;
    readonly matrix: Readonly<{ a: 372; b: 0; c: 0; d: 372 }>;
  }> | null;
  readonly attackerPaletteY: number;
  readonly backgroundPaletteY: number;
  readonly targetPaletteY: number;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly impactVisible: boolean;
  readonly soundRestart: SparkSound | null;
  readonly soundPanSide: SparkSide | null;
  readonly soundState: Readonly<{
    readonly song: SparkSound;
    readonly panSide: SparkSide;
    readonly restart: boolean;
    readonly channelFlags: 0 | 128 | 131;
  }> | null;
  readonly assetsLoaded: boolean;
  readonly visualActive: boolean;
}

interface SparkSpawn {
  readonly identity: string;
  readonly creationOrder: number;
  readonly slot: number;
  readonly matrixNum: number;
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
  { identity: "spark-0", creationOrder: 0, slot: 3, matrixNum: 0, creationAge: 0, angle: 32, radius: 24, rotation: 190, lifetime: 12, usePictureOffset: true, behind: false },
  { identity: "spark-1", creationOrder: 1, slot: 4, matrixNum: 3, creationAge: 2, angle: 80, radius: 24, rotation: 22, lifetime: 12, usePictureOffset: true, behind: false },
  { identity: "spark-2", creationOrder: 2, slot: 5, matrixNum: 4, creationAge: 2, angle: 156, radius: 24, rotation: 121, lifetime: 13, usePictureOffset: true, behind: true },
  { identity: "spark-3", creationOrder: 3, slot: 3, matrixNum: 0, creationAge: 16, angle: 100, radius: 24, rotation: 60, lifetime: 10, usePictureOffset: true, behind: false },
  { identity: "spark-4", creationOrder: 4, slot: 4, matrixNum: 3, creationAge: 16, angle: 170, radius: 24, rotation: 42, lifetime: 11, usePictureOffset: true, behind: true },
  { identity: "spark-5", creationOrder: 5, slot: 5, matrixNum: 4, creationAge: 18, angle: 238, radius: 24, rotation: 165, lifetime: 10, usePictureOffset: true, behind: true },
];

interface FlashSpawn {
  readonly identity: string;
  readonly creationOrder: number;
  readonly slot: number;
  readonly matrixNum: number;
  readonly radius: number;
  readonly angle: number;
  readonly tileIndex: 0 | 1 | 2;
}
export const SPARK_FLASH_SPAWNS: readonly FlashSpawn[] = [
  { identity: "flash-0", creationOrder: 6, slot: 3, matrixNum: 0, radius: 32, angle: 0, tileIndex: 0 },
  { identity: "flash-1", creationOrder: 7, slot: 4, matrixNum: 3, radius: 32, angle: 64, tileIndex: 1 },
  { identity: "flash-2", creationOrder: 8, slot: 5, matrixNum: 4, radius: 32, angle: 128, tileIndex: 0 },
  { identity: "flash-3", creationOrder: 9, slot: 7, matrixNum: 5, radius: 32, angle: 192, tileIndex: 2 },
  { identity: "flash-4", creationOrder: 10, slot: 9, matrixNum: 6, radius: 16, angle: 32, tileIndex: 0 },
  { identity: "flash-5", creationOrder: 11, slot: 10, matrixNum: 7, radius: 16, angle: 96, tileIndex: 1 },
  { identity: "flash-6", creationOrder: 12, slot: 11, matrixNum: 8, radius: 16, angle: 160, tileIndex: 0 },
  { identity: "flash-7", creationOrder: 13, slot: 12, matrixNum: 9, radius: 16, angle: 224, tileIndex: 2 },
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
export const SPARK_ASSET_CLEANUP_AGE = 116;

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
    identity: spawn.identity,
    creationOrder: spawn.creationOrder,
    slot: spawn.slot,
    subpriority: attacker.side === "player" ? 30 : 40,
    tileNum: 321,
    matrixNum: spawn.matrixNum,
    affineMode: "normal",
    objMode: "normal",
    shape: "square",
    size: 1,
    hidden: false,
    hFlip: false,
    vFlip: false,
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
  const initialAdvance = attacker.flashingInitialCallbackAdvances?.[index] ?? 0;
  const effectiveOrbitAge = Math.max(spriteAge, initialAdvance);
  // The affine animation runs once per scheduler callback, including the
  // callback performed by CreateSprite itself.
  const effectiveAffineAge = Math.max(
    spriteAge,
    attacker.flashingInitialAffineAdvances?.[index] ?? 0,
  );
  const angle = (spawn.angle + effectiveOrbitAge * 20) & 0xff;
  // sAffineAnim_FlashingSpark adds rotation 20 every callback forever.
  return {
    kind: "flashing",
    identity: spawn.identity,
    creationOrder: spawn.creationOrder,
    slot: spawn.slot,
    subpriority: attacker.side === "player" ? 26 : 36,
    priority: 2,
    tileNum: 321 + spawn.tileIndex * 4,
    matrixNum: spawn.matrixNum,
    affineMode: "normal",
    objMode: "normal",
    shape: "square",
    size: 1,
    hidden: (effectiveOrbitAge + 1) % 2 === 1,
    hFlip: false,
    vFlip: false,
    age: spriteAge,
    x: attacker.pictureOffset.x,
    y: attacker.pictureOffset.y,
    x2: div256(sin(angle) * spawn.radius),
    y2: div256(sin(angle + 64) * spawn.radius),
    tileIndex: spawn.tileIndex,
    invisible: (effectiveOrbitAge + 1) % 2 === 1,
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
    identity: `target-${index}`,
    creationOrder: 16 + index,
    slot: index % 2 === 0 ? 3 : 4,
    subpriority: target.side === "player" ? 28 : 38,
    priority: 2,
    tileNum: 321 + tileIndex * 4,
    matrixNum: tileIndex === 1 ? 8 : tileIndex === 2 ? 16 : 0,
    affineMode: "off",
    objMode: "normal",
    shape: "square",
    size: 1,
    hidden: false,
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
  const soundState = age < 0 ? null : age < 69
    ? {
      song: "SE_M_THUNDERBOLT2" as const,
      panSide: attacker.side,
      restart: soundRestart !== null,
      channelFlags: (soundRestart !== null ? 131 : 128) as 128 | 131,
    }
    : age < 80
      ? {
        song: "SE_M_HYPER_BEAM" as const,
        panSide: target.side,
        restart: age === 69,
        channelFlags: (age === 69 ? 131 : 128) as 128 | 131,
      }
      : age < 114
        ? {
          song: "SE_M_THUNDERBOLT2" as const,
          panSide: target.side,
          restart: age === 80,
          channelFlags: (age === 80 ? 131 : 128) as 128 | 131,
        }
        : age === 114
          ? {
            song: "SE_M_THUNDERBOLT2" as const,
            panSide: target.side,
            restart: false,
            channelFlags: 0 as const,
          }
          : null;
  // The task is created at script age 69, but its priority-2 callback first
  // writes the battler after two scheduler passes. It then holds each on/off
  // value for two displays and destroys on the final off leg.
  const targetShake = age >= SPARK_TARGET_SHAKE_CREATION_AGE
    && age <= SPARK_TARGET_SHAKE_CREATION_AGE + 5
    && Math.trunc((age - SPARK_TARGET_SHAKE_CREATION_AGE) / 2) % 2 === 0
    ? { x2: 3, y2: 0 } : { x2: 0, y2: 0 };
  const attackerPaletteY = age < 2 ? 0
    : age < 10 ? Math.trunc(age / 2)
    : age < 16 ? 5
    : age < 18 ? 0
    : age < 26 ? Math.trunc((age - 16) / 2)
    : age < 43 ? 5
    : age < 45 ? 0
    : age < 57 ? Math.trunc((age - 43) / 2)
    : age < 63 ? 7 : 0;
  const backgroundPaletteY = age < 1 ? 0
    : age < 9 ? Math.trunc((age + 1) / 2)
    : age < 16 ? 5
    : age < 17 ? 0
    : age < 25 ? Math.trunc((age - 15) / 2)
    : age < 42 ? 5
    : age < 44 ? 0
    : age < 56 ? Math.trunc((age - 42) / 2)
    : age < 63 ? 7 : 0;
  const targetPaletteY = age < 82 ? 0
    : age < 92 ? Math.trunc((age - 80) / 2)
    : age < 100 ? 6
    : age < 110 ? 6 - Math.trunc((age - 98) / 2)
    : 0;
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
    lungeController: age >= 63 && age < 74 ? {
      identity: "horizontal-lunge",
      creationOrder: 14,
      slot: 3,
      subpriority: attacker.side === "player" ? 28 : 38,
      hidden: true,
      x: target.impactPosition?.x ?? target.center.x,
      y: target.impactPosition?.y ?? target.center.y,
    } : null,
    impact: age >= SPARK_IMPACT_CREATION_AGE
      && age < SPARK_IMPACT_CREATION_AGE + 10 ? {
        identity: "impact",
        creationOrder: 15,
        slot: 4,
        subpriority: target.side === "player" ? 28 : 38,
        priority: 2,
        tileNum: 305,
        matrixNum: 0,
        affineMode: "normal",
        objMode: "blend",
        shape: "square",
        size: 2,
        hidden: false,
        hFlip: false,
        vFlip: false,
        x: target.impactPosition?.x ?? target.center.x,
        y: target.impactPosition?.y ?? target.center.y,
        matrix: { a: 372, b: 0, c: 0, d: 372 },
      } : null,
    attackerPaletteY,
    backgroundPaletteY,
    targetPaletteY,
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
    soundState,
    assetsLoaded: age >= 0 && age < SPARK_ASSET_CLEANUP_AGE,
    visualActive: age >= 0 && age < SPARK_TEARDOWN_AGE,
  };
}
