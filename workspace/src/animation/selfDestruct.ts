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

/**
 * Shared source reducer for the literal `gExplosionSpriteTemplate`.
 * `relativeSide` is the side whose animation arguments were mirrored by the
 * battle-animation interpreter; `center` is the source-selected battler
 * coordinate (attacker or target, with or without picture Y offset).
 */
export function explosionSpriteAtAge(
  age: number,
  spawnIndex: number,
  relativeSide: SelfDestructSide,
  center: Readonly<{ x: number; y: number }>,
  interval = SELF_DESTRUCT_EXPLOSION_INTERVAL,
): SelfDestructExplosion | null {
  const localAge = age - spawnIndex * interval;
  if (localAge < 0 || localAge >= SELF_DESTRUCT_EXPLOSION_LIFETIME) return null;
  const offset = SELF_DESTRUCT_EXPLOSION_OFFSETS[spawnIndex]!;
  return {
    spawnIndex,
    age: localAge,
    // InitSpritePosToAnimAttacker mirrors script x offsets for the opponent.
    x: center.x + (relativeSide === "player" ? offset.x : -offset.x),
    y: center.y + offset.y,
    // StartSpriteAnim advances once on creation; the first cell therefore
    // has four displayed states and the remaining cells have five.
    frame: Math.min(3, Math.floor((localAge + 1) / 5)) as 0 | 1 | 2 | 3,
  };
}

/**
 * Source-shaped first `Move_SELF_DESTRUCT` animation body.
 *
 * Age zero is the first software-OAM `gExplosionSpriteTemplate` instance;
 * hardware OAM displays it one presentation frame later.
 * Damage, fainting, and the result/controller sequence are deliberately absent.
 */
export function selfDestructAtAge(
  age: number,
  attackerSide: SelfDestructSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
): SelfDestructState {
  const explosions = SELF_DESTRUCT_EXPLOSION_OFFSETS.map((_, index) =>
    explosionSpriteAtAge(age, index, attackerSide, attackerCenter),
  ).filter((sprite): sprite is SelfDestructExplosion => sprite !== null);

  // All four position tasks are created, but only the two visible singles
  // battlers survive initialization. ANIM_ATTACKER_FORCE duplicates the
  // attacker's identical task and therefore does not change this value.
  const battlerX2 = shakeMon2OffsetAtTick(6, 0, 38, 1, age + 1).x2;

  // The first delay-1 0->9 task is complete before the explosions finish.
  // waitforvisualfinish releases after the last sprite; the reverse 9->0 task
  // starts on the following interpreter/display handoff.
  const reverseFirstChange = 95;
  const attackerPaletteY = age < reverseFirstChange
    ? Math.min(9, Math.max(0, Math.floor(age / 2)))
    : Math.max(0, 9 - Math.floor((age - reverseFirstChange + 2) / 2));

  return { explosions, battlerX2, attackerPaletteY };
}
