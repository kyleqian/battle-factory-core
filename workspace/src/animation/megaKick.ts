import {
  MEGA_KICK_PROFILE,
  MEGA_PUNCH_FIST_FIRST_AGE,
  MEGA_PUNCH_FRAME_COUNT,
  MEGA_PUNCH_IMPACT_FIRST_AGE,
  megaPunchKickAtAge,
  type MegaPunchKickState,
  type MegaPunchSide,
} from "./megaPunch.ts";

export type MegaKickState = MegaPunchKickState;
export const MEGA_KICK_FRAME_COUNT = MEGA_PUNCH_FRAME_COUNT;
export const MEGA_KICK_FIST_FIRST_AGE = MEGA_PUNCH_FIST_FIRST_AGE;
export const MEGA_KICK_IMPACT_FIRST_AGE = MEGA_PUNCH_IMPACT_FIRST_AGE;

/**
 * Pointer-isolated `Move_MEGA_KICK` reducer. This is deliberately a profile
 * over the shared Mega Punch/Kick source body: only the fresh Kick facts
 * (wide-foot anim, alpha edge, and early second cue) diverge.
 */
export function megaKickAtAge(
  age: number,
  targetSide: MegaPunchSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): MegaKickState {
  return megaPunchKickAtAge(age, targetSide, targetCenter, MEGA_KICK_PROFILE);
}
