/**
 * Source-faithful reducer for `gHorizontalLungeSpriteTemplate`.
 *
 * `DoHorizontalLunge` initializes an invisible helper sprite on its creation
 * callback. Subsequent `TranslateSpriteLinearById` callbacks move the attacker
 * for `duration` ticks, pause for the callback handoff, then move it back for
 * the same duration. Opponent-side attackers negate the source x delta.
 */
export function horizontalLungeX2AtTick(
  duration: number,
  xDelta: number,
  attackerSide: "player" | "opponent",
  ticksSinceCreation: number,
): number {
  if (ticksSinceCreation <= 0 || duration <= 0) return 0;
  const signedDelta = attackerSide === "player" ? xDelta : -xDelta;
  if (ticksSinceCreation <= duration) {
    return signedDelta * ticksSinceCreation;
  }
  // One callback switches Translate -> Reverse, then Reverse initializes the
  // second pass on its own next callback. Both ticks retain the peak offset.
  if (ticksSinceCreation <= duration + 2) {
    return signedDelta * duration;
  }
  const reverseSteps = Math.min(
    duration,
    ticksSinceCreation - duration - 2,
  );
  const remainingSteps = duration - reverseSteps;
  return remainingSteps === 0 ? 0 : signedDelta * remainingSteps;
}

/** First tick on which the invisible helper has run DestroyAnimSprite. */
export function horizontalLungeDestroyTick(duration: number): number {
  return duration * 2 + 4;
}
