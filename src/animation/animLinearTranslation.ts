/**
 * Generic port of the Q8.8 linear-translation accumulator shared by
 * `StartAnimLinearTranslation` / `InitAnimLinearTranslation` /
 * `AnimTranslateLinear` (`reference/pokeemerald/src/battle_anim_mons.c:
 * 1065-1139`) and the callers that feed it (e.g. `AnimTravelDiagonally`,
 * `TranslateAnimSpriteToTargetMonLocation`, both in the same file).
 *
 * `InitAnimLinearTranslation` computes the per-callback delta as an
 * unsigned Q8.8 magnitude with the direction folded into bit 0 (forced
 * odd for a negative distance, forced even for a non-negative one) BEFORE
 * the accumulator ever runs; `AnimTranslateLinear` accumulates that raw
 * value every callback and only applies the sign (checking the delta's
 * own bit 0) when converting the accumulator to a displayed pixel offset.
 * Folding the sign into the returned delta up front (as this port and the
 * two hand-fits it replaces both do) is provably equivalent: negating a
 * truncated-toward-zero division equals truncating the negated dividend
 * (`trunc(-a/b) === -trunc(a/b)` for non-negative `a`), so the closed-form
 * `offsetAfterCallbacks` below reproduces the tick-by-tick accumulator
 * exactly, including the 1/256px bias the bit-forcing introduces.
 */

/** `InitAnimLinearTranslation`: the signed per-callback Q8.8 delta. */
export function linearTranslationDeltaQ8(
  distance: number,
  durationTicks: number,
): number {
  const magnitude = Math.trunc((Math.abs(distance) * 256) / durationTicks);
  return distance < 0 ? -(magnitude | 1) : magnitude & ~1;
}

/**
 * `AnimTranslateLinear`, run for `callbacks` ticks: the accumulated pixel
 * offset. A `StartAnimLinearTranslation`-driven sprite invokes its own
 * step callback once immediately at creation, so a caller's first
 * displayed tick is usually `callbacks=1`; some callers instead treat
 * their own first displayed tick as pre-callback (`callbacks=0`) when the
 * sprite is visible for one tick before its own creation-time callback
 * fires. Freezes at `durationTicks` callbacks, matching the real
 * accumulator's `data[0]` (the remaining-ticks counter) reaching zero.
 */
export function linearTranslationOffsetAfterCallbacks(
  deltaQ8: number,
  callbacks: number,
  durationTicks: number,
): number {
  const effectiveCallbacks = Math.max(0, Math.min(callbacks, durationTicks));
  return Math.trunc((deltaQ8 * effectiveCallbacks) / 256);
}
