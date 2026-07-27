import {
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import {
  blendColorCycleObjYAtAge,
  type BlendColorCycleTiming,
} from "./blendColorCycle.ts";
import {
  healingBlueStarsAtAge,
} from "./recover.ts";

export const SYNTHESIS_BLEND_TIMING: Readonly<BlendColorCycleTiming> =
  Object.freeze({
    legs: Object.freeze([
      Object.freeze({ startY: 0, targetY: 16 }),
      Object.freeze({ startY: 16, targetY: 0 }),
    ]),
    deltaY: 2,
  });

export const SYNTHESIS_GRANTING_STAR_STARTS = [0, 8] as const;
export const SYNTHESIS_GRANTING_STAR_ARGS = Object.freeze([
  Object.freeze({ x: -15, y: 0 }),
  Object.freeze({ x: 12, y: -5 }),
] as const);
export const SYNTHESIS_GRANTING_STAR_DURATION = 60;
export const SYNTHESIS_HEALING_START_AGE = 70;

export interface SynthesisSprite {
  readonly kind: "grantingStar" | "star";
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly xScale: number;
  readonly yScale: number;
  readonly spawnIndex: number;
}

/** The eight literal seven-tick frames loop for the full 60-tick translation. */
export function grantingStarFrameAtLocalAge(age: number): number | null {
  if (age < 0 || age > SYNTHESIS_GRANTING_STAR_DURATION) return null;
  return Math.floor(age / 7) % 8;
}

/**
 * Complete source-owned `Move_SYNTHESIS` body, relative to the first
 * `gGrantingStarsSpriteTemplate` creation callback.
 */
export function synthesisEffectAtAge(
  age: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
): Readonly<{ attackerObjY: number; sprites: readonly SynthesisSprite[] }> {
  const sprites: SynthesisSprite[] = [];
  for (let index = 0; index < SYNTHESIS_GRANTING_STAR_STARTS.length; index++) {
    const local = age - SYNTHESIS_GRANTING_STAR_STARTS[index]!;
    const frame = grantingStarFrameAtLocalAge(local);
    if (frame === null) continue;
    const args = SYNTHESIS_GRANTING_STAR_ARGS[index]!;
    const orientedX = side === "player" ? args.x : -args.x;
    const callbacks = Math.min(local + 1, SYNTHESIS_GRANTING_STAR_DURATION);
    sprites.push({
      kind: "grantingStar",
      x: center.x + orientedX + linearTranslationOffsetAfterCallbacks(
        0, callbacks, SYNTHESIS_GRANTING_STAR_DURATION,
      ),
      y: center.y + args.y + linearTranslationOffsetAfterCallbacks(
        32, callbacks, SYNTHESIS_GRANTING_STAR_DURATION,
      ),
      frame,
      xScale: 256,
      yScale: 256,
      spawnIndex: index,
    });
  }

  sprites.push(...healingBlueStarsAtAge(
    age - SYNTHESIS_HEALING_START_AGE,
    side,
    center,
  ).map((sprite): SynthesisSprite => ({
    kind: "star",
    x: sprite.x,
    y: sprite.y,
    frame: sprite.frame,
    xScale: sprite.xScale,
    yScale: sprite.yScale,
    spawnIndex: sprite.spawnIndex,
  })));

  return {
    attackerObjY: blendColorCycleObjYAtAge(age, SYNTHESIS_BLEND_TIMING),
    sprites,
  };
}
