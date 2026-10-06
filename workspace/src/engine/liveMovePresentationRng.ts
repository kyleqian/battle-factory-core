/**
 * Faithful-random live adapters (D3 option (a); docs/presentation-rng.md, docs/next-adapters-prep12-random2.md §1).
 *
 * A Random2 move body draws its words from the per-battle presentation host, never from gameplay RNG, capture rows or
 * fixture builders. `tick` activates the body on its activation frame (live age 0, which is the ROM's first anim-active
 * frame A for every move here: prep12 §0.2) with the move's source draw plan, exactly once per body key; render only
 * reads the recorded words (`presentationRngBodyWords`), so a repaint never draws.
 *
 * These ids are a bucket disjoint from LIVE_MOVE_ANIMATION_IDS (scoped exact): surrogate frames are faithful random,
 * never oracle-exact (docs/animation-integration-live-status.json faithfulRandomClaim).
 */

import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import type { BattleResolutionPresentationState } from "./battleResolutionPresentation.ts";
import {
  activatePresentationRngBody,
  presentationRngBodyWords,
  tickPresentationRngSession,
  type PresentationRngDrawStep,
  type PresentationRngHost,
  type PresentationRngSession,
  type PresentationRngWords,
} from "./presentationRngHost.ts";

/** Source draw plans: `ageOffset` from the activation frame, `count` Random2 calls (prep12 plans.json). */
export const LIVE_MOVE_RANDOM2_PLANS: Readonly<Record<number, readonly PresentationRngDrawStep[]>> = Object.freeze({
  // Move_DOUBLE_KICK (one body per hit): AnimFistOrFootRandomPos x, y, x sign, y sign
  // (battle_anim_fight.c:487-492; script arg2 = 1 skips the :478 draw).
  24: Object.freeze([Object.freeze({ ageOffset: 10, count: 4 })]),
  // Move_ASTONISH: AnimSprayWaterDroplet x2 in one frame, (& 0x1ff, & 0x7f) per droplet (battle_anim_flying.c:1106-1107).
  310: Object.freeze([Object.freeze({ ageOffset: 31, count: 4 })]),
});

/** Faithful-random live adapters (disjoint from LIVE_MOVE_ANIMATION_IDS). */
export const LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS: readonly number[] = Object.freeze(
  Object.keys(LIVE_MOVE_RANDOM2_PLANS).map(Number),
);

export function liveMoveRandom2Plan(request: Pick<BattleMoveAnimationRequest, "moveId">): readonly PresentationRngDrawStep[] | null {
  return LIVE_MOVE_RANDOM2_PLANS[request.moveId] ?? null;
}

/**
 * Body key: one per move-animation command of a battle (request, segment, command), so each Double Kick hit and each
 * Thrash lock-in turn is its own body with its own activation. The host is per battle, so keys need not cross battles.
 */
export function liveMovePresentationRngBodyKey(resolution: Readonly<{
  resolutionId: Readonly<{ requestId: number }>; segmentIndex: number; commandIndex: number;
}>): string {
  return `move:${resolution.resolutionId.requestId}:${resolution.segmentIndex}:${resolution.commandIndex}`;
}

/** Read-only render input: the battle's presentation host and the body's key. */
export type LiveMovePresentationRngInput = Readonly<{ host: PresentationRngHost | null; key: string }>;

/**
 * Activation (tick only, on the body's activation frame): computes the body's words from the host state and schedules
 * its draws into the stream, once per key. Moves without a Random2 plan leave the host unchanged.
 */
export function activateLiveMovePresentationRng(
  host: PresentationRngHost,
  request: Pick<BattleMoveAnimationRequest, "moveId">,
  key: string,
): PresentationRngHost {
  const plan = liveMoveRandom2Plan(request);
  return plan === null ? host : activatePresentationRngBody(host, key, plan).host;
}

/** Render lookup: the activated body's words, or null (no host / not activated: the live seam falls back). */
export function liveMovePresentationRngWords(input: LiveMovePresentationRngInput | undefined): PresentationRngWords | null {
  return input === undefined ? null : presentationRngBodyWords(input.host, input.key);
}

/**
 * The presentation seam's per-tick update (core.ts tick, after the logical frame): step the session for the presented
 * battle (`activeBattleCallStart` identity edge; null = no battle on screen), then, on the activation frame (live age
 * 0) of a presented move command with a Random2 plan, activate that body once. Reads only the presentation queue's
 * command identity and age, never gameplay RNG.
 */
export function tickLiveMovePresentationRngSession(
  session: PresentationRngSession,
  orchestrator: Readonly<{
    activeBattleCallStart?: number | null;
    battleResolutionPresentation?: BattleResolutionPresentationState | null;
  }> | null,
): PresentationRngSession {
  const stepped = tickPresentationRngSession(session, orchestrator?.activeBattleCallStart ?? null);
  const host = stepped.host;
  const resolution = orchestrator?.battleResolutionPresentation;
  if (!host || !resolution || resolution.lifecycle.phase !== "presenting" || resolution.lifecycle.phaseElapsed !== 0) {
    return stepped;
  }
  const command = resolution.segments[resolution.segmentIndex]?.commands[resolution.commandIndex];
  if (command?.type !== "move-animation" || !command.animation) return stepped;
  const activated = activateLiveMovePresentationRng(host, command.animation, liveMovePresentationRngBodyKey(resolution));
  return activated === host ? stepped : Object.freeze({ ...stepped, host: activated });
}
