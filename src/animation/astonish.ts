import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";

export const ASTONISH_LUNGE_START_AGE = 4;
export const ASTONISH_EFFECT_START_AGE = 31;
export const ASTONISH_CLEANUP_AGE = 62;
export const ASTONISH_FRAME_COUNT = ASTONISH_CLEANUP_AGE + 1;

export interface AstonishDropletRandom {
  /** Source `Random2() & 0x1ff`. */
  readonly v1: number;
  /** Source `Random2() & 0x7f`. */
  readonly v2: number;
}

export interface AstonishDroplet {
  readonly index: 0 | 1;
  readonly slot: 3 | 4;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly hFlip: boolean;
  readonly callbackCount: number;
  readonly velocityX: number;
  readonly velocityY: number;
}

export interface AstonishTargetTransform {
  readonly x2: number;
  readonly y2: number;
  readonly matrix: Readonly<{ a: number; b: 0; c: 0; d: number }>;
  readonly shakeActive: boolean;
  readonly stretchActive: boolean;
}

export interface AstonishState {
  readonly sweatBeadLoaded: boolean;
  readonly attackerX2: number;
  readonly target: AstonishTargetTransform;
  readonly droplets: readonly AstonishDroplet[];
  readonly sound:
    | Readonly<{ id: "SE_M_ENCORE" | "SE_M_SKETCH"; pan: number }>
    | null;
  readonly active: boolean;
}

function cDiv(numerator: number, denominator: number): number {
  return Math.trunc(numerator / denominator);
}

function targetTransformAtLocalAge(
  localAge: number,
  targetPictureYOffset: number,
): AstonishTargetTransform {
  if (localAge < 0 || localAge > 19) {
    return {
      x2: 0,
      y2: 0,
      matrix: { a: 256, b: 0, c: 0, d: 256 },
      shakeActive: false,
      stretchActive: false,
    };
  }

  // The script creates ShakeMon2 first (task slot 0) and StretchTargetUp
  // second (slot 1). Both initializers run synchronously, then RunTasks
  // visits them in slot order on the same displayed frame. They write the
  // same battler x2, so reproduce that source ordering instead of adding two
  // independently reduced offsets.
  let x2 = 4;
  let shakeRemaining = 5;
  let shakeDelay = 0; // initializer called ShakeMon2_Step once: 1 -> 0
  let shakeActive = true;
  let resultX2 = 0;
  for (let frame = 0; frame <= localAge; frame += 1) {
    if (shakeActive) {
      if (shakeDelay === 0) {
        x2 = x2 === 4 ? -4 : 4;
        shakeDelay = 1;
        shakeRemaining -= 1;
        if (shakeRemaining === 0) {
          x2 = 0;
          shakeActive = false;
        }
      } else {
        shakeDelay -= 1;
      }
    }
    x2 = x2 === 0 ? 0 : -x2;
    resultX2 = x2;
  }

  const affineStep = localAge < 10 ? localAge + 1 : 19 - localAge;
  const a = 256 + 10 * affineStep;
  const d = 256 - 13 * affineStep;
  const sourceHeight = 64 - targetPictureYOffset * 2;
  const inverseHeight = Math.min(128, cDiv(sourceHeight << 8, d));
  return {
    x2: resultX2,
    y2: cDiv(sourceHeight - inverseHeight, 2),
    matrix: { a, b: 0, c: 0, d },
    shakeActive: localAge <= 7,
    stretchActive: true,
  };
}

function dropletAtLocalAge(
  localAge: number,
  index: 0 | 1,
  origin: Readonly<{ x: number; y: number }>,
  random: AstonishDropletRandom,
): AstonishDroplet | null {
  if (localAge < 0 || localAge >= 30) return null;
  const velocityX = random.v1 % 2 === 1
    ? 736 + random.v1
    : 736 - random.v1;
  const velocityY = random.v2 % 2 === 1
    ? 896 + random.v2
    : 896 - random.v2;
  const callbackCount = localAge + 1;
  let y2 = 0;
  for (let callback = 0; callback < callbackCount; callback += 1) {
    y2 -= (velocityY - callback * 32) >> 8;
  }
  return {
    index,
    slot: index === 0 ? 3 : 4,
    x: origin.x,
    y: origin.y,
    x2: (index === 0 ? 1 : -1) * (velocityX >> 8) * callbackCount,
    y2,
    hFlip: index === 1,
    callbackCount,
    velocityX,
    velocityY,
  };
}

/**
 * Complete source-relative `Move_ASTONISH` reducer.
 *
 * Age zero is the displayed `loadspritegfx ANIM_TAG_SWEAT_BEAD` command.
 * Droplet random values are explicit outputs of the battle animation RNG
 * scheduler; this reducer neither owns nor advances battle RNG.
 */
export function astonishAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  targetCenter: Readonly<{ x: number; y: number }>,
  targetPictureYOffset: number,
  dropletRandom: readonly [
    AstonishDropletRandom,
    AstonishDropletRandom,
  ],
): AstonishState {
  const effectLocalAge = age - ASTONISH_EFFECT_START_AGE;
  const droplets = dropletRandom.map((random, index) =>
    dropletAtLocalAge(
      effectLocalAge,
      index as 0 | 1,
      { x: targetCenter.x, y: targetCenter.y + 30 },
      random,
    )
  ).filter((droplet): droplet is AstonishDroplet => droplet !== null);
  return {
    sweatBeadLoaded: age >= 0 && age <= ASTONISH_CLEANUP_AGE,
    attackerX2: horizontalLungeX2AtTick(
      4,
      6,
      attackerSide,
      age - ASTONISH_LUNGE_START_AGE + 1,
    ),
    target: targetTransformAtLocalAge(
      effectLocalAge,
      targetPictureYOffset,
    ),
    droplets,
    sound: age === 3
      ? {
          id: "SE_M_ENCORE",
          pan: attackerSide === "player" ? -64 : 63,
        }
      : age === ASTONISH_EFFECT_START_AGE
        ? {
            id: "SE_M_SKETCH",
            pan: attackerSide === "player" ? 63 : -63,
          }
        : null,
    active: age >= 0 && age <= ASTONISH_CLEANUP_AGE,
  };
}
