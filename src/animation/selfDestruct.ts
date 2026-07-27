import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type SelfDestructSide = "player" | "opponent";

export interface SelfDestructExplosion {
  readonly spawnIndex: number;
  readonly age: number;
  readonly x: number;
  readonly y: number;
  readonly frame: 0 | 1 | 2 | 3;
}

export interface SelfDestructState {
  readonly explosions: readonly SelfDestructExplosion[];
  readonly battlerX2: number;
  readonly attackerPaletteY: number;
}

/** `delay 6` is six delay callbacks plus the command/display handoff. */
export const SELF_DESTRUCT_EXPLOSION_INTERVAL = 8;
export const SELF_DESTRUCT_EXPLOSION_LIFETIME = 20;
export const SELF_DESTRUCT_EXPLOSION_OFFSETS = [
  { x: 0, y: 0 },
  { x: 24, y: -24 },
  { x: -16, y: 16 },
  { x: -24, y: -12 },
  { x: 16, y: 16 },
  { x: 0, y: 0 },
  { x: 24, y: -24 },
  { x: -16, y: 16 },
  { x: -24, y: -12 },
  { x: 16, y: 16 },
] as const;

function explosionAtAge(
  age: number,
  spawnIndex: number,
  attackerSide: SelfDestructSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
): SelfDestructExplosion | null {
  const localAge = age - spawnIndex * SELF_DESTRUCT_EXPLOSION_INTERVAL;
  if (localAge < 0 || localAge >= SELF_DESTRUCT_EXPLOSION_LIFETIME) return null;
  const offset = SELF_DESTRUCT_EXPLOSION_OFFSETS[spawnIndex]!;
  return {
    spawnIndex,
    age: localAge,
    // InitSpritePosToAnimAttacker mirrors script x offsets for the opponent.
    x: attackerCenter.x + (attackerSide === "player" ? offset.x : -offset.x),
    y: attackerCenter.y + offset.y,
    frame: Math.floor(localAge / 5) as 0 | 1 | 2 | 3,
  };
}

/**
 * Source-shaped first `Move_SELF_DESTRUCT` animation body.
 *
 * Age zero is the first displayed `gExplosionSpriteTemplate` instance.
 * Damage, fainting, and the result/controller sequence are deliberately absent.
 */
export function selfDestructAtAge(
  age: number,
  attackerSide: SelfDestructSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
): SelfDestructState {
  const explosions = SELF_DESTRUCT_EXPLOSION_OFFSETS.map((_, index) =>
    explosionAtAge(age, index, attackerSide, attackerCenter),
  ).filter((sprite): sprite is SelfDestructExplosion => sprite !== null);

  // All four position tasks are created, but only the two visible singles
  // battlers survive initialization. ANIM_ATTACKER_FORCE duplicates the
  // attacker's identical task and therefore does not change this value.
  const battlerX2 = shakeMon2OffsetAtTick(6, 0, 38, 1, age + 1).x2;

  // The first delay-1 0->9 task is complete before the explosions finish.
  // waitforvisualfinish releases after the last sprite; the reverse 9->0 task
  // starts on the following interpreter/display handoff.
  const reverseStart = 92;
  const attackerPaletteY = age < reverseStart
    ? Math.min(9, Math.max(0, Math.floor((age + 2) / 2)))
    : Math.max(0, 9 - Math.floor((age - reverseStart + 2) / 2));

  return { explosions, battlerX2, attackerPaletteY };
}
