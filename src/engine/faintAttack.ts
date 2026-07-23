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

export interface FaintAttackBgState {
  background: "default" | "dark";
  bldy: number;
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
