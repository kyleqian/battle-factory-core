// Post-KO lend replay through the PRODUCTION live hosts (docs/postko-consumer-audit.md §4): a fixture's recorded semantic event
// history (turns of BattleKernelSemanticEvent payloads: bodies, hits, stat/status/general animations, faint, next-mon summary,
// send-out) is fed to liveSpriteOrderHost.ts exactly as the orchestrator feeds it (beginLiveSpriteOrderTurn per action prompt,
// advanceLiveSpriteOrderHost in event order) and the allocator host follows the orchestrator's seam (prepareLiveMoveSpriteAllocator per
// body; summary / send-out / status animations invalidate; reseedLiveSpriteAllocatorAfterSendOut after the send-out). The lend at the
// final body's activation edge is lendLiveSpriteOrder(host): never a value copied from the ROM state.
import type { BattleKernelSemanticEvent } from "../../src/engine/battleDecisionBoundary.ts";
import { battleMoveAnimationRequest, type BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import {
  prepareLiveMoveSpriteAllocator, type LiveMoveSpriteAllocatorInput, type LiveMoveSpriteOrderInput,
} from "../../src/engine/liveMoveSpriteAllocator.ts";
import { invalidateLiveSpriteAllocatorHost, type LiveSpriteAllocatorHost } from "../../src/engine/liveSpriteAllocator.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, lendLiveSpriteOrder,
  openLiveSpriteOrderHostPartyMenu, reseedLiveSpriteAllocatorAfterSendOut, returnLiveSpriteOrderHostFromPartyMenu,
  type LiveSpriteOrderHost,
} from "../../src/engine/liveSpriteOrderHost.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";

/** One semantic payload of the recorded history (the `payload` of a BattleKernelSemanticEvent). */
export type PostKoSemanticPayload = Readonly<Record<string, unknown> & { kind: string }>;
/** One action-prompt cycle: the prompt is shown and committed, then its resolution's events in order. */
export type PostKoTurn = Readonly<{ events: readonly PostKoSemanticPayload[] }>;

export interface PostKoHostLend {
  readonly spriteOrderInput: LiveMoveSpriteOrderInput | undefined;
  readonly spriteAllocatorInput: LiveMoveSpriteAllocatorInput | undefined;
  readonly host: LiveSpriteOrderHost;
  readonly allocator: LiveSpriteAllocatorHost;
}

const requestOf = (payload: PostKoSemanticPayload): BattleMoveAnimationRequest =>
  battleMoveAnimationRequest(payload.battler as 0 | 1, payload.target as number, payload.arguments as string[]);
const isBody = (payload: PostKoSemanticPayload) => payload.kind === "animation" && payload.animationId === "MOVE_ANIMATION";

/**
 * Replay `turns` (the last turn ends with the body under test) through the production hosts and return the lends at the final
 * body's activation edge. `route` = the known entry the scenario starts from. Orchestrator markers the kernel stream does not
 * carry:
 *   `{ kind: "forced-party-menu", battlers }` (playerfaintLendHistory.ts: the forced party handoff after a player faint) is
 *   replayed as the orchestrator's forced path does: party-menu reset + reshow (openLiveSpriteOrderHostPartyMenu +
 *   returnLiveSpriteOrderHostFromPartyMenu), the allocator host invalidated, and re-seeded after the forced switch-in;
 *   `{ kind: "voluntary-party-menu", outcome }` (voluntaryLendHistory.ts; first event of its turn): the menu opened from the
 *   action prompt (openLiveSpriteOrderHostPartyMenu, allocator invalidated); `cancel` then returns as the orchestrator's
 *   returnOrderHostFromPartyMenu does (reshow + allocator re-seed) before the turn's prompt cycle, `switch` begins the turn
 *   from the party menu (beginLiveSpriteOrderTurn fromPartyMenu: reshow, no prompt cycle).
 * A payload's `provenanceOpcodeName` (the voluntary recall's B_SCR_OP_RETURNATKTOBALL) is restored as the event provenance.
 */
export function replayPostKoTurnsThroughHost(
  turns: readonly PostKoTurn[], route: "ordinary-factory" | "battle-lab-ordinary-singles" = "battle-lab-ordinary-singles",
): PostKoHostLend {
  let host = createLiveSpriteOrderHost(knownEntrySpriteOrderState(route));
  let allocator = createKnownEntrySpriteAllocatorProvider(route).firstMove;
  let sequence = 0;
  for (const [turnIndex, turn] of turns.entries()) {
    const requestId = turnIndex + 1;
    const events = turn.events.map(payload => Object.freeze({ sequence: sequence++, payload,
      provenance: typeof payload.provenanceOpcodeName === "string" ? { opcodeName: payload.provenanceOpcodeName } : undefined,
    }) as unknown as BattleKernelSemanticEvent);
    const isMarker = (event: BattleKernelSemanticEvent) =>
      ["forced-party-menu", "voluntary-party-menu"].includes((event.payload as unknown as PostKoSemanticPayload).kind);
    const resolution = { resolutionId: { requestId }, segmentIndex: 0, segments: [{ events: events.filter(event => !isMarker(event)) }] };
    const menu = turn.events[0]?.kind === "voluntary-party-menu" ? turn.events[0].outcome as "cancel" | "switch" : null;
    if (menu !== null) {
      host = openLiveSpriteOrderHostPartyMenu(host);
      allocator = invalidateLiveSpriteAllocatorHost(allocator);
    }
    if (menu === "cancel") {
      host = returnLiveSpriteOrderHostFromPartyMenu(host, { player: true, opponent: true });
      allocator = reseedLiveSpriteAllocatorAfterSendOut(allocator, host, route);
    }
    host = beginLiveSpriteOrderTurn(host, requestId, true, menu === "switch");
    const last = turnIndex === turns.length - 1;
    for (const [index, event] of events.entries()) {
      const payload = event.payload as unknown as PostKoSemanticPayload;
      if (payload.kind === "voluntary-party-menu") continue;
      if (isMarker(event)) {
        host = returnLiveSpriteOrderHostFromPartyMenu(openLiveSpriteOrderHostPartyMenu(host), payload.battlers as { player: boolean; opponent: boolean });
        allocator = invalidateLiveSpriteAllocatorHost(allocator);
        continue;
      }
      if (last && index === events.length - 1) {
        if (!isBody(payload)) throw new Error("the last recorded event must be the body under test");
        host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, true);
        return Object.freeze({
          spriteOrderInput: lendLiveSpriteOrder(host, requestOf(payload).moveId),
          spriteAllocatorInput: prepareLiveMoveSpriteAllocator(allocator, requestOf(payload)).input,
          host, allocator,
        });
      }
      if (isBody(payload)) allocator = prepareLiveMoveSpriteAllocator(allocator, requestOf(payload)).next;
      else if (payload.kind === "draw-party-status-summary" || payload.kind === "switch-in-animation"
        || payload.kind === "status-animation" || payload.provenanceOpcodeName !== undefined) {
        allocator = invalidateLiveSpriteAllocatorHost(allocator);
      }
      host = advanceLiveSpriteOrderHost(host, resolution, event.sequence);
      if (payload.kind === "switch-in-animation") allocator = reseedLiveSpriteAllocatorAfterSendOut(allocator, host, route);
    }
  }
  throw new Error("no body under test");
}
