/**
 * Source-owned completion edge between turn 1's confirmed ROCK_SLIDE and
 * the next action controller.  `HandleChooseActionAfterDma3` installs
 * `HandleInputChooseAction` one frame before this edge; its first execution
 * calls `DoBounceEffect`, makes the settled menu visible, and accepts input.
 *
 * The duration is scene-relative to the accepted move confirmation, not an
 * absolute trace tick and not a FIGHT-submenu lifecycle.  The renderer keeps
 * its move-local redraw tail; this seam owns the controller event that
 * publishes the next-command receipt.
 */
export const TURN1_CHOOSE_ACTION_RESET_AFTER_CONFIRM = 429;

/** Runtime scene elapsed at the first `HandleInputChooseAction` execution. */
export function turn1ChooseActionResetElapsed(confirmElapsed: number): number {
  if (!Number.isInteger(confirmElapsed) || confirmElapsed < 0) {
    throw new Error("turn-1 choose-action reset requires a non-negative confirmation elapsed");
  }
  return confirmElapsed + TURN1_CHOOSE_ACTION_RESET_AFTER_CONFIRM;
}

/** True exactly on the source-owned `DoBounceEffect` reset callback. */
export function isTurn1ChooseActionBounceReset(
  confirmElapsed: number | null,
  currentElapsed: number,
): boolean {
  return confirmElapsed !== null
    && currentElapsed === turn1ChooseActionResetElapsed(confirmElapsed);
}
