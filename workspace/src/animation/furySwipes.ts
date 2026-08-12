import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import {
  shakeMon2DisplayedOffsetAtAge,
  shakeMon2OffsetAtTick,
} from "./shakeMon2.ts";

/** Source-relative Move_FURY_SWIPES visual state. */
export interface FurySwipesSwipe {
  readonly spawnAge: number;
  readonly x: number;
  readonly y: number;
  readonly animation: 0 | 1;
  readonly animationFrame: 0 | 1 | 2 | 3;
}

export interface FurySwipesState {
  readonly attackerX2: number;
  readonly targetX2: number;
  readonly swipes: readonly FurySwipesSwipe[];
  readonly sound: "SE_M_SCRATCH" | null;
  readonly active: boolean;
}

export interface FurySwipesGeometry {
  readonly attackerSide: "player" | "opponent";
  readonly targetSide: "player" | "opponent";
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

/** The first callback ages are relative to the script's first active row. */
export const FURY_SWIPES_FIRST_LUNGE_AGE = 4;
export const FURY_SWIPES_FIRST_SWIPE_AGE = 10;
export const FURY_SWIPES_SECOND_LUNGE_AGE = 22;
export const FURY_SWIPES_SECOND_SWIPE_AGE = 28;
export const FURY_SWIPES_LAST_BODY_AGE = 47;

function swipeFrameAtAge(age: number, spawnAge: number): number {
  const local = age - spawnAge;
  if (local < 0 || local > 15) return -1;
  // AnimFurySwipes starts the source program on its creation callback. The
  // first sampled row is therefore animation tick one, while the final cell
  // remains visible for the END callback's teardown row.
  return Math.min(3, Math.floor((local + 1) / 4));
}

function swipeAtAge(
  age: number,
  spawnAge: number,
  x: number,
  animation: 0 | 1,
  targetCenter: Readonly<{ x: number; y: number }>,
): FurySwipesSwipe | null {
  const frame = swipeFrameAtAge(age, spawnAge);
  if (frame < 0) return null;
  return {
    spawnAge,
    x: targetCenter.x + x,
    y: targetCenter.y,
    animation,
    animationFrame: frame as 0 | 1 | 2 | 3,
  };
}

/** Direct port of the two source `gFurySwipesSpriteTemplate` lifecycles. */
export function furySwipesSwipesAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly FurySwipesSwipe[] {
  return [
    swipeAtAge(age, FURY_SWIPES_FIRST_SWIPE_AGE, 16, 1, targetCenter),
    swipeAtAge(age, FURY_SWIPES_SECOND_SWIPE_AGE, -16, 0, targetCenter),
  ].filter((swipe): swipe is FurySwipesSwipe => swipe !== null);
}

/**
 * Ports the script only: no multihit count, damage, accuracy, RNG, or turn
 * state is represented here. HorizontalLunge always moves the attacker in
 * the stock callback even when its script coordinate argument is TARGET.
 */
export function furySwipesAtAge(
  age: number,
  geometry: FurySwipesGeometry,
): FurySwipesState {
  const firstLunge = horizontalLungeX2AtTick(
    5,
    5,
    geometry.attackerSide,
    age - FURY_SWIPES_FIRST_LUNGE_AGE + 1,
  );
  const secondLunge = horizontalLungeX2AtTick(
    5,
    5,
    geometry.attackerSide,
    age - FURY_SWIPES_SECOND_LUNGE_AGE + 1,
  );
  const firstShake = age < FURY_SWIPES_FIRST_SWIPE_AGE
    ? { x2: 0, y2: 0 }
    : shakeMon2OffsetAtTick(3, 0, 5, 1, age - FURY_SWIPES_FIRST_SWIPE_AGE + 1);
  const secondShake = age < FURY_SWIPES_SECOND_SWIPE_AGE
    ? { x2: 0, y2: 0 }
    : shakeMon2OffsetAtTick(4, 0, 7, 1, age - FURY_SWIPES_SECOND_SWIPE_AGE + 1);
  return {
    attackerX2: firstLunge + secondLunge,
    targetX2: firstShake.x2 + secondShake.x2,
    swipes: furySwipesSwipesAtAge(age, geometry.targetCenter),
    sound: age === FURY_SWIPES_FIRST_SWIPE_AGE
      || age === FURY_SWIPES_SECOND_SWIPE_AGE
      ? "SE_M_SCRATCH"
      : null,
    active: age >= 0 && age <= FURY_SWIPES_LAST_BODY_AGE,
  };
}

/**
 * Scene-ON target displacement after the BuildOamBuffer display latch.
 *
 * The source task's sprite `x2` is intentionally not reused here: the stock
 * task initializes and immediately advances its software state, while the
 * framebuffer sees the prior OAM row. The generic source-derived display
 * helper preserves the creation row, both short schedules' bodies, terminal
 * zero, and teardown without baking a capture timeline into this move.
 */
export function furySwipesDisplayedTargetX2AtAge(
  age: number,
  targetIdleX2: number,
): number {
  const first = shakeMon2DisplayedOffsetAtAge(
    3,
    0,
    5,
    1,
    age,
    FURY_SWIPES_FIRST_SWIPE_AGE,
  );
  const second = shakeMon2DisplayedOffsetAtAge(
    4,
    0,
    7,
    1,
    age,
    FURY_SWIPES_SECOND_SWIPE_AGE,
  );
  if (age <= FURY_SWIPES_FIRST_SWIPE_AGE) return targetIdleX2;
  return first.x2 + second.x2;
}
