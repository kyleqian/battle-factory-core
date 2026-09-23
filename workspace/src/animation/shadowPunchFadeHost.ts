/**
 * Source callback clock for Shadow Punch's two hardware palette fades.
 *
 * `BattleMainCB2` calls `UpdatePaletteFade` before `RunTasks`.  Consequently
 * the restore fade cannot take its first 16 -> 15 step until the callback
 * after `Task_FadeToBg` starts it.  A display interval in which the previous
 * callback has not completed defers both the task start and every following
 * restore step; that is a source scheduling input, not an attacker-side
 * property.
 *
 * The ordinary live host currently supplies the uninterrupted callback
 * clock.  `restoreTaskStartCallbackDeferrals` is retained as the narrow typed
 * seam a future audio/CPU scheduler must supply.  It is deliberately not
 * inferred from side, species, battle tick, or an oracle frame identity.
 */
export interface ShadowPunchFadeHostInput {
  readonly restoreTaskStartCallbackDeferrals: number;
}

export const SHADOW_PUNCH_STEADY_FADE_HOST: ShadowPunchFadeHostInput =
  Object.freeze({ restoreTaskStartCallbackDeferrals: 0 });

function assertHost(input: ShadowPunchFadeHostInput): void {
  if (!Number.isInteger(input.restoreTaskStartCallbackDeferrals)
      || input.restoreTaskStartCallbackDeferrals < 0) {
    throw new RangeError("Shadow Punch fade deferrals must be a nonnegative integer");
  }
}

/** Hardware BLDY displayed by the source fade clock at source-relative age. */
export function shadowPunchLiveBackgroundBldy(
  age: number,
  input: ShadowPunchFadeHostInput = SHADOW_PUNCH_STEADY_FADE_HOST,
): number {
  assertHost(input);
  if (age < 0) return 0;

  // Initial fadetobg: 0 -> 16, five displayed full-black rows, 16 -> 0.
  if (age <= 16) return age;
  if (age <= 20) return 16;
  if (age <= 36) return 36 - age;

  // restorebg setup: task creation, default-BG load, then fade begin.  With
  // uninterrupted callbacks its first visible 16 -> 15 step is age 83.
  if (age < 62) return 0;
  if (age <= 64) return 1;
  if (age <= 79) return age - 63;
  const firstDecreaseAge = 83 + input.restoreTaskStartCallbackDeferrals;
  if (age < firstDecreaseAge) return 16;
  return Math.max(0, 15 - (age - firstDecreaseAge));
}
