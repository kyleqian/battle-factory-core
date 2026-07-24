export interface QuickAttackOffset {
  readonly x2: number;
  readonly y2: number;
}

export interface QuickAttackAfterimage extends QuickAttackOffset {
  readonly slot: 3 | 4;
}

export interface QuickAttackAnimationState {
  readonly attackerOffset: QuickAttackOffset;
  readonly afterimages: readonly QuickAttackAfterimage[];
  readonly targetShakeX2: number;
  /** Side-specific live battler x2 reset performed as the impact begins. */
  readonly targetBaseX2: number;
  readonly impactVisible: boolean;
}

/**
 * Scene-ON presentation ages are relative to the controller's gCurrentMove
 * installation (oracle frame 39 in the portable mechanicLab case). The task
 * script itself is source-relative: no battle number or absolute battle tick
 * participates.
 */
export const QUICK_ATTACK_FIRST_TRAVEL_AGE = 52;
export const QUICK_ATTACK_LAST_BODY_AGE = 69;
export const QUICK_ATTACK_IMPACT_FIRST_AGE = 58;
export const QUICK_ATTACK_IMPACT_LAST_AGE = 67;

/**
 * `Sin(angle, amplitude)` multiplies signed values and then performs an
 * arithmetic `>> 8`. The +24 player amplitude therefore produces 16 on the
 * positive half-wave but -17 on the negative half-wave; the opponent's -24
 * amplitude has the opposite asymmetry. These are not mirrorable tables.
 */
const PLAYER_TRAVEL: readonly QuickAttackOffset[] = Object.freeze([
  Object.freeze({ x2: 16, y2: 2 }),
  Object.freeze({ x2: 24, y2: 6 }),
  Object.freeze({ x2: 16, y2: 11 }),
  Object.freeze({ x2: 0, y2: 12 }),
  Object.freeze({ x2: -17, y2: 11 }),
  Object.freeze({ x2: -24, y2: 6 }),
]);

const OPPONENT_TRAVEL: readonly QuickAttackOffset[] = Object.freeze([
  Object.freeze({ x2: -17, y2: 2 }),
  Object.freeze({ x2: -24, y2: 6 }),
  Object.freeze({ x2: -17, y2: 11 }),
  Object.freeze({ x2: 0, y2: 12 }),
  Object.freeze({ x2: 16, y2: 11 }),
  Object.freeze({ x2: 24, y2: 6 }),
]);

function afterimageOffsetForSide(
  playerOffset: QuickAttackOffset,
  opponentOffset: QuickAttackOffset,
  attackerSide: "player" | "opponent",
): QuickAttackOffset {
  return attackerSide === "player" ? playerOffset : opponentOffset;
}

/** Source `AnimTask_TranslateMonEllipticalRespectSide(...,24,6,1,5)`. */
export function quickAttackTravelAtAge(
  age: number,
  attackerSide: "player" | "opponent",
): QuickAttackOffset {
  const entry = (
    attackerSide === "player" ? PLAYER_TRAVEL : OPPONENT_TRAVEL
  )[age - QUICK_ATTACK_FIRST_TRAVEL_AGE];
  return entry
    ? entry
    : { x2: 0, y2: 0 };
}

/**
 * Source `AnimTask_TraceMonBlended(0,4,7,3)`: four clones are created, but
 * the allocator reuses two slots across the two separated slot-3 lives.
 * The accepted player-side prefix currently ends before these BG/OBJ lives;
 * do not infer opposite-side clone acceptance from this opponent-side table.
 */
export function quickAttackAfterimagesAtAge(
  age: number,
  attackerSide: "player" | "opponent",
): readonly QuickAttackAfterimage[] {
  const images: QuickAttackAfterimage[] = [];
  if (age >= 53 && age <= 59) {
    images.push({
      slot: 3,
      ...afterimageOffsetForSide(
        { x2: 16, y2: 2 },
        { x2: -17, y2: 2 },
        attackerSide,
      ),
    });
  }
  if (age >= 63 && age <= 69) {
    images.push({
      slot: 3,
      ...afterimageOffsetForSide(
        { x2: 0, y2: 0 },
        { x2: 0, y2: 0 },
        attackerSide,
      ),
    });
  }
  if (age >= 58 && age <= 64) {
    images.push({
      slot: 4,
      ...afterimageOffsetForSide(
        { x2: -24, y2: 6 },
        { x2: 24, y2: 6 },
        attackerSide,
      ),
    });
  }
  return images;
}

/**
 * Source `AnimTask_ShakeMon(ANIM_TARGET,5,0,6,1)`, including the task's
 * creation/display latch. These five display ages are dense-oracle pinned.
 */
const TARGET_SHAKE_AGES: ReadonlySet<number> =
  new Set([58, 61, 62, 65, 66]);

export function quickAttackAnimationAtAge(
  age: number,
  attackerSide: "player" | "opponent",
): QuickAttackAnimationState {
  return {
    attackerOffset: quickAttackTravelAtAge(age, attackerSide),
    afterimages: quickAttackAfterimagesAtAge(age, attackerSide),
    targetShakeX2: TARGET_SHAKE_AGES.has(age) ? 5 : 0,
    targetBaseX2:
      attackerSide === "player" && age >= QUICK_ATTACK_IMPACT_FIRST_AGE
        ? -1
        : 0,
    impactVisible:
      age >= QUICK_ATTACK_IMPACT_FIRST_AGE
      && age <= QUICK_ATTACK_IMPACT_LAST_AGE,
  };
}
