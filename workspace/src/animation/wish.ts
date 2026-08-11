import { linearTranslationOffsetAfterCallbacks } from "./animLinearTranslation.ts";
import { grantingStarFrameAtLocalAge } from "./synthesis.ts";

export const WISH_FRAME_COUNT = 271;
export const WISH_STAR_START_AGE = 39;
export const WISH_STAR_LAST_AGE = 102;
export const WISH_MINI_STAR_STARTS = Object.freeze(
  Array.from({ length: 21 }, (_, index) => 41 + index * 3),
);
export const WISH_GRANTING_STAR_STARTS = [166, 176] as const;

export interface WishTwinkleVariant {
  /** Source `Random2() & 3`: zero selects tile +4, nonzero tile +5. */
  readonly tileOffset: 4 | 5;
  /** Source signed transform of `Random2() & 7`. */
  readonly yOffset: number;
}

export interface WishSprite {
  readonly kind: "wishStar" | "miniStar" | "grantingStar";
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly invisible: boolean;
}

export interface WishState {
  readonly active: boolean;
  readonly backgroundBlackCoeff: number;
  readonly simplePaletteBlendActive: boolean;
  readonly goldStarsLoaded: boolean;
  readonly sparkle2Loaded: boolean;
  readonly visualTaskCount: number;
  readonly audio: Readonly<{
    panAdjustActive: boolean;
    healBellLoopActive: boolean;
  }>;
  readonly sprites: readonly WishSprite[];
}

const MINI_STAR_OAM_SLOTS = [
  4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16,
  17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
] as const;
const GRANTING_ARGS = [
  { x: -15, y: 0 },
  { x: 12, y: -5 },
] as const;

function wishStarPosition(
  age: number,
  side: "player" | "opponent",
): { x: number; y: number } | null {
  if (age < WISH_STAR_START_AGE || age > WISH_STAR_LAST_AGE) return null;
  const callbacks = age - WISH_STAR_START_AGE + 1;
  const x2 = Math.floor(callbacks * 72 / 16);
  let y2 = 0;
  for (let callback = 1; callback <= callbacks; callback += 1) {
    y2 += Math.floor(callback * 16 / 256);
  }
  return {
    x: side === "player" ? 256 - x2 : -16 + x2,
    y: y2,
  };
}

function miniStarInvisible(callbacks: number): boolean {
  let invisible = false;
  let counter = 0;
  for (let callback = 1; callback <= callbacks; callback += 1) {
    if (callback < 30) {
      counter += 1;
      if (counter === 2) {
        invisible = !invisible;
        counter = 0;
      }
    } else {
      if (counter === 2) invisible = false;
      if (counter === 3) {
        invisible = true;
        counter = -1;
      }
      counter += 1;
    }
  }
  return invisible;
}

function paletteCoefficient(age: number): number {
  if (age < 11) return 0;
  if (age < 31) return 2 + 2 * Math.floor((age - 11) / 5);
  if (age < 242) return 10;
  if (age < 262) return 8 - 2 * Math.floor((age - 242) / 5);
  return 0;
}

/** Complete source-relative Move_WISH presentation body through cleanup. */
export function wishAtAge(
  age: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
  twinkles: readonly WishTwinkleVariant[],
): WishState {
  if (twinkles.length !== WISH_MINI_STAR_STARTS.length) {
    throw new Error("Wish requires all 21 source Random2-resolved twinkles");
  }
  if (age < 0 || age >= WISH_FRAME_COUNT - 1) {
    return {
      active: false,
      backgroundBlackCoeff: 0,
      simplePaletteBlendActive: false,
      goldStarsLoaded: age >= 0,
      sparkle2Loaded: age >= 0,
      visualTaskCount: 0,
      audio: { panAdjustActive: false, healBellLoopActive: false },
      sprites: [],
    };
  }

  const sprites: WishSprite[] = [];
  const big = wishStarPosition(age, side);
  if (big) {
    sprites.push({
      kind: "wishStar", spawnIndex: 0, oamSlot: 3,
      x: big.x, y: big.y, frame: 0, invisible: false,
    });
  }
  for (let index = 0; index < WISH_MINI_STAR_STARTS.length; index += 1) {
    const start = WISH_MINI_STAR_STARTS[index]!;
    const callbacks = age - start + 1;
    if (callbacks < 1 || callbacks > 60) continue;
    const spawnBig = wishStarPosition(start, side);
    if (!spawnBig) throw new Error("Wish twinkle lost its source star anchor");
    const variant = twinkles[index]!;
    sprites.push({
      kind: "miniStar", spawnIndex: index,
      oamSlot: MINI_STAR_OAM_SLOTS[index]!,
      x: spawnBig.x, y: spawnBig.y + variant.yOffset,
      frame: variant.tileOffset, invisible: miniStarInvisible(callbacks),
    });
  }
  for (let index = 0; index < WISH_GRANTING_STAR_STARTS.length; index += 1) {
    const local = age - WISH_GRANTING_STAR_STARTS[index]!;
    const frame = grantingStarFrameAtLocalAge(local);
    if (frame === null) continue;
    const args = GRANTING_ARGS[index]!;
    const callbacks = Math.min(local + 1, 60);
    sprites.push({
      kind: "grantingStar", spawnIndex: index, oamSlot: 3 + index,
      x: center.x + (side === "player" ? args.x : -args.x),
      y: center.y + args.y
        + linearTranslationOffsetAfterCallbacks(32, callbacks, 60),
      frame, invisible: false,
    });
  }

  const bigActive = age >= 39 && age <= 102;
  const firstGranting = age >= 166 && age <= 226;
  const secondGranting = age >= 176 && age <= 236;
  return {
    active: true,
    backgroundBlackCoeff: paletteCoefficient(age),
    simplePaletteBlendActive:
      (age >= 7 && age <= 37) || (age >= 238 && age <= 268),
    goldStarsLoaded: true,
    sparkle2Loaded: true,
    visualTaskCount: Number(bigActive)
      + Number(firstGranting) + Number(secondGranting)
      + Number((age >= 7 && age <= 37) || (age >= 238 && age <= 268)),
    audio: {
      panAdjustActive: age >= 39 && age <= 102,
      healBellLoopActive: age >= 166 && age <= 178,
    },
    sprites,
  };
}
