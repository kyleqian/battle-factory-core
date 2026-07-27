import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import {
  blendColorCycleObjYAtAge,
  type BlendColorCycleTiming,
} from "./blendColorCycle.ts";

export const RECOVER_ORB_ARGS = Object.freeze([
  Object.freeze({ x: 40, y: -10 }),
  Object.freeze({ x: -35, y: -10 }),
  Object.freeze({ x: 15, y: -40 }),
  Object.freeze({ x: -10, y: -32 }),
  Object.freeze({ x: 25, y: -20 }),
  Object.freeze({ x: -40, y: -20 }),
  Object.freeze({ x: 5, y: -40 }),
] as const);

export const RECOVER_ORB_DURATION = 13;
export const RECOVER_ORB_SPAWN_PERIOD = 5;
export const RECOVER_ORB_WAVES = 3;
export const RECOVER_HEALING_START_AGE = 120;
export const RECOVER_STAR_SPAWN_PERIOD = 9;
export const RECOVER_STAR_FRAME_DURATIONS =
  // The sprite animation advances once on its creation tick: frame 0 is
  // therefore RAM-visible for one tick, while animEnded's destroy callback
  // leaves the terminal frame visible for one additional tick.
  Object.freeze([1, 2, 2, 3, 5, 3, 2, 3] as const);
export const RECOVER_STAR_FRAMES =
  Object.freeze([0, 1, 2, 3, 4, 5, 6, 0] as const);

export const RECOVER_BLEND_TIMING: Readonly<BlendColorCycleTiming> =
  Object.freeze({
    legs: Object.freeze([
      Object.freeze({ startY: 0, targetY: 11 }),
      Object.freeze({ startY: 11, targetY: 0 }),
      Object.freeze({ startY: 0, targetY: 11 }),
      Object.freeze({ startY: 11, targetY: 0 }),
      Object.freeze({ startY: 0, targetY: 11 }),
      Object.freeze({ startY: 11, targetY: 0 }),
    ]),
    deltaY: 2,
  });

export interface RecoverEffectSprite {
  readonly kind: "orb" | "star";
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly xScale: number;
  readonly yScale: number;
  readonly spawnIndex: number;
}

export function healingBlueStarFrameAtLocalAge(age: number): number | null {
  let offset = 0;
  for (let i = 0; i < RECOVER_STAR_FRAME_DURATIONS.length; i++) {
    offset += RECOVER_STAR_FRAME_DURATIONS[i]!;
    if (age < offset) return RECOVER_STAR_FRAMES[i]!;
  }
  return null;
}

export const HEALING_BLUE_STAR_OFFSETS = Object.freeze([
  Object.freeze({ x: 0, y: -5 }),
  Object.freeze({ x: -15, y: 10 }),
  Object.freeze({ x: -15, y: -15 }),
  Object.freeze({ x: 10, y: -5 }),
] as const);

/** Shared literal `HealingEffect`/`HealingEffect2` blue-star component. */
export function healingBlueStarsAtAge(
  age: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
): readonly RecoverEffectSprite[] {
  const sprites: RecoverEffectSprite[] = [];
  for (let index = 0; index < HEALING_BLUE_STAR_OFFSETS.length; index++) {
    const local = age - index * RECOVER_STAR_SPAWN_PERIOD;
    if (local < 0) continue;
    const frame = healingBlueStarFrameAtLocalAge(local);
    if (frame === null) continue;
    const offset = HEALING_BLUE_STAR_OFFSETS[index]!;
    sprites.push({
      kind: "star",
      x: center.x + (side === "player" ? offset.x : -offset.x),
      y: center.y + offset.y,
      frame,
      xScale: 256,
      yScale: 256,
      spawnIndex: index,
    });
  }
  return sprites;
}

/**
 * Source `Move_RECOVER` body, relative to the first orb's creation tick.
 * Geometry is the attacker's `BATTLER_COORD_X_2/Y_PIC_OFFSET`.
 */
export function recoverEffectAtAge(
  age: number,
  side: "player" | "opponent",
  center: Readonly<{ x: number; y: number }>,
): Readonly<{ attackerObjY: number; sprites: readonly RecoverEffectSprite[] }> {
  const sprites: RecoverEffectSprite[] = [];
  const totalOrbs = RECOVER_ORB_ARGS.length * RECOVER_ORB_WAVES;
  for (let index = 0; index < totalOrbs; index++) {
    const local = age - index * RECOVER_ORB_SPAWN_PERIOD;
    if (local < 0 || local > RECOVER_ORB_DURATION) continue;
    const args = RECOVER_ORB_ARGS[index % RECOVER_ORB_ARGS.length]!;
    const orientedX = side === "player" ? args.x : -args.x;
    const callbacks = Math.min(local + 1, RECOVER_ORB_DURATION);
    const x2 = linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(-orientedX, RECOVER_ORB_DURATION),
      callbacks,
      RECOVER_ORB_DURATION,
    );
    const y2 = linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(-args.y, RECOVER_ORB_DURATION),
      callbacks,
      RECOVER_ORB_DURATION,
    );
    // AFFINEANIMCMD_FRAME(-5,-5,0,1) runs once before the first visible
    // callback and once per tick thereafter, including the translation
    // callback's one-frame terminal hold.
    const affineScale = 246 - local * 5;
    const matrix = Math.trunc(0x10000 / affineScale);
    sprites.push({
      kind: "orb",
      x: center.x + orientedX + x2,
      y: center.y + args.y + y2,
      frame: 8,
      xScale: matrix,
      yScale: matrix,
      spawnIndex: index,
    });
  }

  sprites.push(...healingBlueStarsAtAge(
    age - RECOVER_HEALING_START_AGE,
    side,
    center,
  ));

  return {
    attackerObjY: blendColorCycleObjYAtAge(age, RECOVER_BLEND_TIMING),
    sprites,
  };
}
