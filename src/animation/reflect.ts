export type ReflectSide = "player" | "opponent";

export interface ReflectSparkle {
  readonly spawnIndex: number;
  readonly x: number;
  readonly y: number;
  readonly tileOffset: 0 | 16 | 32 | 48 | 64;
}

export interface ReflectState {
  readonly wall: Readonly<{
    readonly x: number;
    readonly y: number;
    readonly paletteRotationSteps: number;
  }> | null;
  readonly sparkles: readonly ReflectSparkle[];
  readonly alpha: Readonly<{ eva: number; evb: number }> | null;
  readonly opponentBattlerHidden: boolean;
  readonly soundTaskActive: boolean;
  readonly active: boolean;
}

const SPARKLE_ARGS = Object.freeze([
  Object.freeze({ spawnAge: 22, x: 30, y: 0 }),
  Object.freeze({ spawnAge: 31, x: 19, y: -12 }),
  Object.freeze({ spawnAge: 40, x: 10, y: 20 }),
] as const);

function sparkleAtAge(
  age: number,
  index: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  side: ReflectSide,
): ReflectSparkle | null {
  const args = SPARKLE_ARGS[index]!;
  const local = age - args.spawnAge;
  if (local < 0 || local >= 15) return null;
  const tileOffset = Math.min(64, Math.floor((local + 1) / 3) * 16) as
    0 | 16 | 32 | 48 | 64;
  return {
    spawnIndex: index,
    x: attackerCenter.x + (side === "player" ? args.x : -args.x),
    y: attackerCenter.y + args.y,
    tileOffset,
  };
}

/**
 * Source-relative reducer for Move_REFLECT. Age zero is the creation pass of
 * gReflectWallSpriteTemplate; negative ages are the script's load/alpha/audio
 * lead-in and ages after 67 are the post-blendoff clear tail.
 */
export function reflectAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  side: ReflectSide,
): ReflectState {
  const wallLive = age >= 0 && age <= 63;
  const sparkles = SPARKLE_ARGS.flatMap((_, index) => {
    const sparkle = sparkleAtAge(age, index, attackerCenter, side);
    return sparkle === null ? [] : [sparkle];
  });
  let alpha: ReflectState["alpha"] = null;
  if (age >= 0 && age <= 67) {
    const eva = age <= 1 ? 0
      : age <= 14 ? age - 1
        : age <= 47 ? 13
          : age <= 60 ? 60 - age : 0;
    alpha = { eva, evb: 16 - eva };
  }
  return {
    wall: wallLive ? {
      x: attackerCenter.x + (side === "player" ? 40 : -40),
      y: attackerCenter.y,
      paletteRotationSteps: age < 16 ? 0 : Math.min(16, Math.floor(age / 2) - 7),
    } : null,
    sparkles,
    alpha,
    opponentBattlerHidden: age >= 1 && age <= 59,
    soundTaskActive: age >= 0 && age <= 14,
    active: age >= 0 && age <= 67,
  };
}
