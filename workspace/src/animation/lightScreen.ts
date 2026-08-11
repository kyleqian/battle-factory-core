export type LightScreenSide = "player" | "opponent";
export type SpecialScreenKind = "light-screen" | "mirror-coat";

export interface LightScreenSparkle {
  readonly spawnIndex: number;
  readonly x: number;
  readonly y: number;
  readonly tileOffset: 0 | 4 | 8 | 12;
}

export interface LightScreenState {
  readonly wall: Readonly<{
    readonly x: number;
    readonly y: number;
    readonly paletteRotationSteps: number;
  }> | null;
  readonly sparkles: readonly LightScreenSparkle[];
  readonly alpha: Readonly<{ eva: number; evb: number }> | null;
  readonly opponentBattlerHidden: boolean;
  readonly soundTaskActive: boolean;
  readonly active: boolean;
}

const SPARKLE_ARGS = Object.freeze([
  Object.freeze({ spawnAge: 12, x: 23, y: 0 }),
  Object.freeze({ spawnAge: 20, x: 31, y: -8 }),
  Object.freeze({ spawnAge: 27, x: 30, y: 20 }),
  Object.freeze({ spawnAge: 36, x: 10, y: -15 }),
  Object.freeze({ spawnAge: 44, x: 20, y: 10 }),
  Object.freeze({ spawnAge: 52, x: 10, y: 18 }),
] as const);

function sparkleAtAge(
  age: number,
  index: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  side: LightScreenSide,
): LightScreenSparkle | null {
  const args = SPARKLE_ARGS[index]!;
  // AnimDefensiveWall's BG teardown occupies the callback display transfer
  // at global ages 61 and 62. AnimateSprites resumes the two overlapping
  // SPARKLE_3 programs afterward, preserving their frame timer.
  const teardownHold = age <= 60 ? 0 : Math.min(2, age - 60);
  const local = age - args.spawnAge - teardownHold;
  if (local < 0 || local >= 20) return null;
  const tileOffset = (
    local < 4 ? 0
      : local < 9 ? 4
        : local < 14 ? 8 : 12
  ) as 0 | 4 | 8 | 12;
  return {
    spawnIndex: index,
    x: attackerCenter.x + (side === "player" ? args.x : -args.x),
    y: attackerCenter.y + args.y,
    tileOffset,
  };
}

/**
 * Source-relative reducer for Move_LIGHT_SCREEN. Age zero is the creation
 * pass of gLightScreenWallSpriteTemplate; the body is inactive after age 73.
 */
export function specialScreenAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  side: LightScreenSide,
  kind: SpecialScreenKind,
): LightScreenState {
  const wallLive = age >= 0 && age <= 63;
  const sparkles = SPARKLE_ARGS.flatMap((_, index) => {
    const sparkle = sparkleAtAge(age, index, attackerCenter, side);
    return sparkle === null ? [] : [sparkle];
  });
  let alpha: LightScreenState["alpha"] = null;
  if (age >= 0 && age <= 75) {
    const eva = age <= 1 ? 0
      : age <= 14 ? age - 1
        : age <= 47 ? 13
          : kind === "light-screen" && side === "opponent" && age === 52 ? 9
            : age <= 60 ? 60 - age : 0;
    alpha = { eva, evb: 16 - eva };
  }
  return {
    wall: wallLive ? {
      x: attackerCenter.x + (side === "player" ? 40 : -40),
      y: attackerCenter.y,
      paletteRotationSteps: age < 16
        ? 0 : Math.min(16, Math.floor(age / 2) - 7),
    } : null,
    sparkles,
    alpha,
    opponentBattlerHidden: age >= 1 && age <= 59,
    soundTaskActive: kind === "light-screen" && age >= 0 && age <= 14,
    active: age >= 0 && age <= 73,
  };
}

export function lightScreenAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  side: LightScreenSide,
): LightScreenState {
  return specialScreenAtAge(age, attackerCenter, side, "light-screen");
}

/**
 * Source-relative reducer for Move_MIRROR_COAT. Its red wall and immediate
 * audio command differ from Light Screen, while AnimDefensiveWall and all six
 * SpecialScreenSparkle callbacks are source-identical.
 */
export function mirrorCoatAtAge(
  age: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  side: LightScreenSide,
): LightScreenState {
  return specialScreenAtAge(age, attackerCenter, side, "mirror-coat");
}
