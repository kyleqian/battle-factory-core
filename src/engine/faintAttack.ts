// Pure FAINT_ATTACK animation reducers, derived from Move_FAINT_ATTACK and
// the task lifetimes in docs/turn16-notes.md §6.2.  Every input is an age
// from the move-animation kickoff; there are no trace-tick lookups here.

import { GBA_SINE_TABLE_256 } from "./battleMenu.ts";

export const FAINT_ATTACK_BG_FADE_OUT_FIRST_VISIBLE_AGE = 5;
export const FAINT_ATTACK_BG_BLACK_AGE = 20;
export const FAINT_ATTACK_BG_SWAP_AGE = 24;
export const FAINT_ATTACK_BG_SETTLED_AGE = 39;
export const FAINT_ATTACK_LUNGE_FIRST_VISIBLE_AGE = 44;
export const FAINT_ATTACK_LUNGE_LAST_VISIBLE_AGE = 74;
export const FAINT_ATTACK_HITSPLAT_FIRST_VISIBLE_AGE = 87;
export const FAINT_ATTACK_HITSPLAT_TICKS = 10;
export const FAINT_ATTACK_SHAKE_LAST_VISIBLE_AGE = 102;
export const FAINT_ATTACK_FADE_IN_FIRST_VISIBLE_AGE = 147;
export const FAINT_ATTACK_ATTACKER_FULLY_VISIBLE_AGE = 177;
export const FAINT_ATTACK_RESTORE_FADE_FIRST_VISIBLE_AGE = 184;
export const FAINT_ATTACK_RESTORE_BLACK_AGE = 199;
export const FAINT_ATTACK_DEFAULT_BG_SWAP_AGE = 204;
export const FAINT_ATTACK_DONE_AGE = 219;
/**
 * `end` releases the script after the final restore write, but that write
 * remains the animation controller's displayed field for one more VBlank.
 * Both canonical occurrences therefore own ages 0..220 inclusive.
 */
export const FAINT_ATTACK_LAST_ANIMATION_OWNED_AGE = FAINT_ATTACK_DONE_AGE + 1;
export const FAINT_ATTACK_HIT_HEALTHBOX_WOBBLE_AGE = 226;
export const FAINT_ATTACK_HIT_TARGET_BLINK_AGE = 227;
export const FAINT_ATTACK_HP_DRAIN_AGE = 260;
/** Turn 16's 59-point hit; retained as the default occurrence constants. */
export const FAINT_ATTACK_HP_COMMIT_AGE = 321;
export const FAINT_ATTACK_SECONDARY_ROLL_AGE = 326;
export const FIRE_PUNCH_TARGET_HANDOFF_AGE = 333;
export const FIRE_PUNCH_CLEAR_CURRENT_MOVE_AGE = 334;
export const FIRE_PUNCH_OWNERSHIP_AGE = 335;
export const FIRE_PUNCH_ACCURACY_ROLL_AGE = 340;
export const FIRE_PUNCH_TEXT_AGE = 342;
/**
 * Both observed occurrences reach the next move's first renderer-owned
 * VBlank at this confirmation-relative age.  The shorter turn-17 HP drain
 * leaves a longer script/text lead-in; it does not move this boundary.
 */
export const FIRE_PUNCH_FIRST_ANIMATION_OWNED_AGE = 344;

const HIT_HEALTHBOX_WOBBLE_TICKS = 20;
const HIT_TARGET_BLINK_PERIOD = 8;
const HIT_TARGET_BLINK_CYCLES = 4;

export interface FaintAttackResolutionState {
  /** The healthbox display controller drains independently of battle HP RAM. */
  displayedHp: number;
  /** The atomic gBattleMons write, deliberately later than the displayed bar. */
  battleHp: number;
  targetInvisible: boolean;
  targetHealthboxY2: number;
  attacker: "MURKROW" | "MAGBY";
  target: "MAGBY" | "MURKROW";
  currentMove: "FAINT_ATTACK" | "FIRE_PUNCH" | null;
  faintAttackSecondaryRollConsumed: boolean;
  firePunchAccuracyRollConsumed: boolean;
  rngCallsConsumed: 0 | 1 | 2;
  message: "FAINT_ATTACK" | "FIRE_PUNCH";
}

export interface FaintAttackResolutionHp {
  startHp: number;
  endHp: number;
}

const TURN16_MAGBY_HP: FaintAttackResolutionHp = { startHp: 138, endHp: 79 };

export interface FaintAttackResolutionTiming {
  hpCommitAge: number;
  secondaryRollAge: number;
  targetHandoffAge: number;
  clearCurrentMoveAge: number;
  firePunchOwnershipAge: number;
  firePunchAccuracyRollAge: number;
  firePunchTextAge: number;
}

/**
 * `healthbarupdate` runs for the actual displayed HP delta.  The commands
 * after it have fixed source/RAM-confirmed spacing, so their ages must move
 * with damage rather than inheriting turn 16's 59-point literal.
 */
export function faintAttackResolutionTiming(
  hp: FaintAttackResolutionHp = TURN16_MAGBY_HP,
): FaintAttackResolutionTiming {
  const hpDelta = Math.max(0, hp.startHp - hp.endHp);
  const hpCommitAge = FAINT_ATTACK_HP_DRAIN_AGE + hpDelta + 2;
  return {
    hpCommitAge,
    secondaryRollAge: hpCommitAge + 5,
    targetHandoffAge: hpCommitAge + 12,
    clearCurrentMoveAge: hpCommitAge + 13,
    firePunchOwnershipAge: hpCommitAge + 14,
    firePunchAccuracyRollAge: hpCommitAge + 19,
    firePunchTextAge: hpCommitAge + 21,
  };
}

export interface FaintAttackBgState {
  background: "default" | "dark";
  bldy: number;
}

export function faintAttackOwnsAnimationRender(age: number): boolean {
  return age >= 0 && age <= FAINT_ATTACK_LAST_ANIMATION_OWNED_AGE;
}

/** Hardware `Task_FadeToBg`: BG3-only darken, source bg swap at full black. */
export function faintAttackBgState(age: number): FaintAttackBgState {
  if (age < FAINT_ATTACK_BG_FADE_OUT_FIRST_VISIBLE_AGE) return { background: "default", bldy: 0 };
  if (age < FAINT_ATTACK_BG_SWAP_AGE) {
    return { background: "default", bldy: Math.min(16, age - FAINT_ATTACK_BG_FADE_OUT_FIRST_VISIBLE_AGE + 1) };
  }
  if (age < FAINT_ATTACK_BG_SETTLED_AGE) {
    return { background: "dark", bldy: Math.max(0, 15 - (age - FAINT_ATTACK_BG_SWAP_AGE)) };
  }
  if (age < FAINT_ATTACK_RESTORE_FADE_FIRST_VISIBLE_AGE) return { background: "dark", bldy: 0 };
  if (age < FAINT_ATTACK_DEFAULT_BG_SWAP_AGE) {
    return { background: "dark", bldy: Math.min(16, age - FAINT_ATTACK_RESTORE_FADE_FIRST_VISIBLE_AGE + 1) };
  }
  return {
    background: "default",
    bldy: Math.max(0, 15 - (age - FAINT_ATTACK_DEFAULT_BG_SWAP_AGE)),
  };
}

function sin(index: number, amplitude: number): number {
  const value = GBA_SINE_TABLE_256[((index % 256) + 256) % 256]!;
  return Math.floor((amplitude * value) / 256);
}

/** `AnimTask_TranslateMonEllipticalRespectSide(ANIM_ATTACKER,18,6,1,3)`. */
export function faintAttackAttackerOffset(age: number): { x2: number; y2: number } {
  if (age < FAINT_ATTACK_LUNGE_FIRST_VISIBLE_AGE || age > FAINT_ATTACK_LUNGE_LAST_VISIBLE_AGE) {
    return { x2: 0, y2: 0 };
  }
  if (age === FAINT_ATTACK_LUNGE_LAST_VISIBLE_AGE) return { x2: 0, y2: 0 };
  // The displayed first task step has angle 8: creation's immediate angle-0
  // write remains behind the VBlank transfer.
  const angle = 8 * (age - FAINT_ATTACK_LUNGE_FIRST_VISIBLE_AGE + 1);
  return { x2: sin(angle, -18), y2: -sin(angle + 64, 6) + 6 };
}

/** Attacker BG-copy alpha (`BLDALPHA`), including invisible hold. */
export function faintAttackAttackerEva(age: number): number {
  if (age < FAINT_ATTACK_LUNGE_FIRST_VISIBLE_AGE) return 16;
  if (age <= FAINT_ATTACK_LUNGE_LAST_VISIBLE_AGE + 1) {
    return Math.max(0, 16 - Math.ceil((age - FAINT_ATTACK_LUNGE_FIRST_VISIBLE_AGE) / 2));
  }
  if (age < FAINT_ATTACK_FADE_IN_FIRST_VISIBLE_AGE) return 0;
  if (age < FAINT_ATTACK_ATTACKER_FULLY_VISIBLE_AGE) {
    return Math.min(15, 1 + Math.floor((age - FAINT_ATTACK_FADE_IN_FIRST_VISIBLE_AGE) / 2));
  }
  return 16;
}

/** `AnimTask_ShakeMon2(ANIM_TARGET,2,0,9,1)`, displayed RAM+1. */
export function faintAttackTargetShakeX2(age: number): number {
  if (age < FAINT_ATTACK_HITSPLAT_FIRST_VISIBLE_AGE || age > FAINT_ATTACK_SHAKE_LAST_VISIBLE_AGE) return 0;
  return Math.floor((age - FAINT_ATTACK_HITSPLAT_FIRST_VISIBLE_AGE) / 2) % 2 === 0 ? -2 : 2;
}

export function faintAttackHitsplatVisible(age: number): boolean {
  return age >= FAINT_ATTACK_HITSPLAT_FIRST_VISIBLE_AGE
    && age < FAINT_ATTACK_HITSPLAT_FIRST_VISIBLE_AGE + FAINT_ATTACK_HITSPLAT_TICKS;
}

/**
 * Post-animation hit/resolution controller. These are ages from the same
 * Move_FAINT_ATTACK kickoff used above, so delaying the player confirmation
 * moves the entire tail without any battle-tick lookup.
 */
export function faintAttackResolutionState(
  age: number,
  hp: FaintAttackResolutionHp = TURN16_MAGBY_HP,
): FaintAttackResolutionState {
  const timing = faintAttackResolutionTiming(hp);
  const wobbleAge = age - FAINT_ATTACK_HIT_HEALTHBOX_WOBBLE_AGE;
  const blinkAge = age - FAINT_ATTACK_HIT_TARGET_BLINK_AGE;
  const drained = Math.max(0, age - FAINT_ATTACK_HP_DRAIN_AGE);
  const firePunchOwned = age >= timing.firePunchOwnershipAge;
  const secondaryRollConsumed = age >= timing.secondaryRollAge;
  const accuracyRollConsumed = age >= timing.firePunchAccuracyRollAge;

  return {
    displayedHp: Math.max(hp.endHp, hp.startHp - drained),
    battleHp: age >= timing.hpCommitAge ? hp.endHp : hp.startHp,
    targetInvisible:
      blinkAge >= 0
      && blinkAge < HIT_TARGET_BLINK_PERIOD * HIT_TARGET_BLINK_CYCLES
      && blinkAge % HIT_TARGET_BLINK_PERIOD < 4,
    targetHealthboxY2:
      wobbleAge >= 0 && wobbleAge < HIT_HEALTHBOX_WOBBLE_TICKS
        ? (wobbleAge % 2 === 0 ? 1 : -1)
        : 0,
    attacker: firePunchOwned ? "MAGBY" : "MURKROW",
    target: age >= timing.targetHandoffAge ? "MURKROW" : "MAGBY",
    currentMove:
      age >= timing.firePunchOwnershipAge
        ? "FIRE_PUNCH"
        : age >= timing.clearCurrentMoveAge
          ? null
          : "FAINT_ATTACK",
    faintAttackSecondaryRollConsumed: secondaryRollConsumed,
    firePunchAccuracyRollConsumed: accuracyRollConsumed,
    rngCallsConsumed: accuracyRollConsumed ? 2 : secondaryRollConsumed ? 1 : 0,
    message: age >= timing.firePunchTextAge ? "FIRE_PUNCH" : "FAINT_ATTACK",
  };
}
