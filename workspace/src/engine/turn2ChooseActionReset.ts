/**
 * Source-owned completion edge between turn 2's confirmed DRAGON_BREATH and
 * the following action controller. `HandleChooseActionAfterDma3` installs
 * `HandleInputChooseAction` one frame early; its first execution runs
 * `DoBounceEffect`, renders the settled menu, and accepts input.
 *
 * This is a controller event, independent of the move-local renderer's
 * timing helpers. The canonical OFF trace establishes install at absolute
 * 3236 (rejected A) and reset at 3237 (accepted A).
 */
export const TURN2_CHOOSE_ACTION_RESET_AFTER_CONFIRM = 292;

/** Runtime scene elapsed at the first `HandleInputChooseAction` execution. */
export function turn2ChooseActionResetElapsed(confirmElapsed: number): number {
  if (!Number.isInteger(confirmElapsed) || confirmElapsed < 0) {
    throw new Error("turn-2 choose-action reset requires a non-negative confirmation elapsed");
  }
  return confirmElapsed + TURN2_CHOOSE_ACTION_RESET_AFTER_CONFIRM;
}

/** True exactly on the source-owned `DoBounceEffect` reset callback. */
export function isTurn2ChooseActionBounceReset(
  confirmElapsed: number | null,
  currentElapsed: number,
): boolean {
  return confirmElapsed !== null
    && currentElapsed === turn2ChooseActionResetElapsed(confirmElapsed);
}
