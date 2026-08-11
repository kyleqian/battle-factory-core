/**
 * Source-owned completion edge between turn 4's confirmed ROCK_SLIDE and
 * the following action controller. `HandleChooseActionAfterDma3` installs
 * `HandleInputChooseAction` one frame early; its first execution runs
 * `DoBounceEffect`, renders the settled menu, and accepts input.
 *
 * This controller event is independent of the move-local ROCK_SLIDE staging.
 * The install callback rejects the first candidate input; production keeps
 * only the following confirmation-relative reset duration.
 */
export const TURN4_CHOOSE_ACTION_RESET_AFTER_CONFIRM = 427;

/** Runtime scene elapsed at the first `HandleInputChooseAction` execution. */
export function turn4ChooseActionResetElapsed(confirmElapsed: number): number {
  if (!Number.isInteger(confirmElapsed) || confirmElapsed < 0) {
    throw new Error("turn-4 choose-action reset requires a non-negative confirmation elapsed");
  }
  return confirmElapsed + TURN4_CHOOSE_ACTION_RESET_AFTER_CONFIRM;
}

/** True exactly on the source-owned `DoBounceEffect` reset callback. */
export function isTurn4ChooseActionBounceReset(
  confirmElapsed: number | null,
  currentElapsed: number,
): boolean {
  return confirmElapsed !== null
    && currentElapsed === turn4ChooseActionResetElapsed(confirmElapsed);
}
