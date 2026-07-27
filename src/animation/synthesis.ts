import {
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import {
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

// The script's literal `delay 8` spans ten rendered callback ticks: the
// interpreter consumes its own command ticks around the delay counter.
export const SYNTHESIS_GRANTING_STAR_STARTS = [0, 10] as const;
export const SYNTHESIS_GRANTING_STAR_ARGS = Object.freeze([
  Object.freeze({ x: -15, y: 0 }),
  Object.freeze({ x: 12, y: -5 }),
] as const);
export const SYNTHESIS_GRANTING_STAR_DURATION = 60;
// The second granting star's terminal callback, unload, literal delay 1,
// and compressed BLUE_STAR load leave the first HealingEffect star at 82.
export const SYNTHESIS_HEALING_START_AGE = 82;

export interface SynthesisSprite {
  readonly kind: "grantingStar" | "star";
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly xScale: number;
  readonly yScale: number;
  readonly spawnIndex: number;
}

/** Literal delay-2 OBJ-half coefficient, RAM-probed across the whole task. */
export function synthesisAttackerObjYAtAge(age: number): number {
  if (age < 4) return 0;
  if (age < 32) return 2 * Math.floor(age / 4);
  if (age < 42) return 16;
  if (age < 70) return 14 - 2 * Math.floor((age - 42) / 4);
  return 0;
}

export function synthesisBlendTaskActiveAtAge(age: number): boolean {
  return age >= 0 && age <= 74;
}

/** The eight literal seven-tick frames loop for the full 60-tick translation. */
export function grantingStarFrameAtLocalAge(age: number): number | null {
  if (age < 0 || age > SYNTHESIS_GRANTING_STAR_DURATION) return null;
  // AnimateSprites consumes one of the seven frame ticks on creation.
  return Math.floor((age + 1) / 7) % 8;
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
    attackerObjY: synthesisAttackerObjYAtAge(age),
    sprites,
  };
}
