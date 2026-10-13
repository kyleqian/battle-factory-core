/**
 * Words-dependent sprite-order units (S10A prep46; docs/next-adapters-prep46.md): Sand-Attack 28, Mud-Slap 189, Rain Dance 240 and the
 * RAIN_CONTINUES general animation (General_Rain) leave a free order that depends on their own Random2 words. The order host records a
 * word-free deferred-lend marker for them that ANY later consumer may take; the render seam resolves it (liveWordsUnitPostFree, liveMoveAnimation.ts). A
 * command whose lend resolved through such a marker is a faithful-random claim for that command (ANIMATION_VERIFICATION.md D3).
 */
import type { SpriteOrderDeferredLend } from "./spriteOrderEventTransform.ts";

/**
 * Move bodies whose post-body free order depends on their own words. land68 (prep65): Dive 291, setup and unleash (order key 10291):
 * its droplet / bubble destroy groups follow its own words (prep61). ice72: Ice Ball 301 (its shards' SortSprites y-sort,
 * liveIceBallInputs(...).postBodyFree at the body's words, rollout counter and displayed species; docs/ice72-ice-ball-words-unit.md).
 * flat84: Flatter 260 (its 38 confetti die together, FLATTER_K burst 65 .. end 97; their slots keep the SortSprites y-order of their last frame, which
 * follows their own words: liveFlatterInputs' carried order at the last row, liveFlatterWordsPostFree; docs/next-adapters-flat84.md).
 * ord149: Astonish 310 (its two droplets die together in the SortSprites order of their rises, which follow their own v2 words:
 * liveAstonishWordsPostFree; docs/ord149-astonish-extrasensory.md). The 310:opponent table row keeps that side known (the marker drops).
 */
export const WORDS_ORDER_UNIT_MOVE_IDS: readonly number[] = Object.freeze([28, 189, 240, 260, 291, 301, 310]);
/** The general animation whose order unit is words-dependent (General_Rain); its marker is keyed per event. */
export const WORDS_ORDER_GENERAL_ANIMATION = "RAIN_CONTINUES";

/** Presentation-RNG key of one general-animation event (request, segment, event sequence); the order marker and the tick seam share it. */
export function generalAnimationPresentationRngKey(requestId: number, segmentIndex: number, sequence: number): string {
  return `general:${requestId}:${segmentIndex}:${sequence}`;
}

/** Whether a deferred marker is a words-dependent order unit (its lend goes to any consumer; resolved at the render seam). */
export function isWordsOrderDeferredUnit(deferred: Pick<SpriteOrderDeferredLend, "moveId" | "generalAnimation">): boolean {
  return deferred.generalAnimation === WORDS_ORDER_GENERAL_ANIMATION
    || (deferred.generalAnimation === undefined && WORDS_ORDER_UNIT_MOVE_IDS.includes(deferred.moveId));
}
