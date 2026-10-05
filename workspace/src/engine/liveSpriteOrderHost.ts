/**
 * Live free-slot `sSpriteOrder` host for the Factory orchestrator (presentation-only; reads battle events, never
 * writes rules, RNG or facility state). Maps the resolution's semantic events and the command prompt lifecycle onto
 * the pure transform of spriteOrderEventTransform.ts, in event-sequence order, each event exactly once:
 *
 *   player command submitted from the action menu   action-prompt + actions-committed (bounce pair)
 *   animation MOVE_ANIMATION                         move-animation (moveId, attacker side)
 *   animation HIT_ANIMATION                          hit-animation (target visibility from the toggles below)
 *   animation STATS_CHANGE                           stat-animation (B_ANIM_STATS_CHANGE argument)
 *   any other animation id                           general-animation (HELD_ITEM_EFFECT / SUN_CONTINUES / ...)
 *   status-animation                                 status-animation (InitAndLaunchChosenStatusAnimation name)
 *   set-battler-sprite-visibility                    hiding (semi-invulnerable) or a return-to-ball receipt invalidates
 *   faint, switch, switch-in, party summary, trainer slide, outcome   invalidate
 *   other events (messages, HP, status data, PP, ...) no allocation: no-op
 *
 * The orchestrator additionally invalidates on the party menu, the switch-in presentation phase, a locked player
 * action (no prompt), a retained locked-action continuation, and any resolution whose events were not all applied.
 */
import type { BattleKernelSemanticEvent } from "./battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import type { LiveMoveSpriteOrderInput } from "./liveMoveSpriteAllocator.ts";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, invalidateSpriteOrderTracker,
  spriteOrderStatusAnimationName, spriteOrderTrackerLend, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "./spriteOrderEventTransform.ts";
import type { SpriteOrderState } from "./spriteOrderProvider.ts";

export interface LiveSpriteOrderHost {
  readonly tracker: SpriteOrderTracker;
  /** Request whose prompt cycle has been applied; a resolution of any other request invalidates. */
  readonly promptRequestId: number | null;
  /** Next unapplied semantic event of the presented resolution; `drained` once its last segment is applied. */
  readonly cursor: Readonly<{ requestId: number; segmentIndex: number; nextEventIndex: number; drained: boolean }> | null;
  /** Battler sprites hidden by the semi-invulnerable `moveend`/`makevisible` toggles. */
  readonly hidden: readonly [boolean, boolean];
}

const RECALL_OPCODES: ReadonlySet<string> = new Set(["B_SCR_OP_VARIOUS", "B_SCR_OP_RETURNATKTOBALL", "B_SCR_OP_RETURNTOBALL"]);
const INVALIDATING_EVENTS: ReadonlySet<string> = new Set([
  "faint-animation", "switch", "switch-in-animation", "draw-party-status-summary", "hide-party-status-summary",
  "trainer-slide-in", "trainer-slide-out", "outcome",
]);

export function createLiveSpriteOrderHost(order: SpriteOrderState): LiveSpriteOrderHost {
  const hidden: readonly [boolean, boolean] = Object.freeze([false, false] as const);
  return Object.freeze({ tracker: createSpriteOrderTracker(order), promptRequestId: null, cursor: null, hidden });
}

export function invalidateLiveSpriteOrderHost(host: LiveSpriteOrderHost, reason: string): LiveSpriteOrderHost {
  if (!host.tracker.cursor.order.known) return host;
  return Object.freeze({ ...host, tracker: invalidateSpriteOrderTracker(host.tracker, reason) });
}

export function liveSpriteOrderHostOrder(host: LiveSpriteOrderHost): SpriteOrderState {
  return host.tracker.cursor.order;
}

/**
 * The player submitted request `requestId` from the action menu: the bounce pair was created at the prompt and is
 * destroyed at commit, before the turn's first body. `promptShown` false (a locked action, a retained locked-action
 * continuation) invalidates. A previous resolution whose events were not all applied invalidates.
 */
export function beginLiveSpriteOrderTurn(
  host: LiveSpriteOrderHost, requestId: number, promptShown: boolean,
): LiveSpriteOrderHost {
  let next = host;
  if (next.cursor !== null && !next.cursor.drained) next = invalidateLiveSpriteOrderHost(next, "previous resolution not fully applied");
  if (!promptShown) next = invalidateLiveSpriteOrderHost(next, "command resolution without an action prompt");
  let tracker = applySpriteOrderPresentationEvent(next.tracker, { kind: "action-prompt" });
  tracker = applySpriteOrderPresentationEvent(tracker, { kind: "actions-committed" });
  return Object.freeze({ ...next, tracker, promptRequestId: requestId });
}

function orderEventOf(
  event: BattleKernelSemanticEvent, hidden: readonly [boolean, boolean],
): { event?: SpriteOrderPresentationEvent; hidden?: readonly [boolean, boolean] } {
  const payload = event.payload;
  if (payload.kind === "animation") {
    const battler = payload.battler;
    if (battler !== 0 && battler !== 1) return { event: { kind: "invalidate", reason: `animation ${payload.animationId} battler ${battler}` } };
    switch (payload.animationId) {
      case "MOVE_ANIMATION": {
        const request = battleMoveAnimationRequest(battler, payload.target, payload.arguments);
        return { event: { kind: "move-animation", moveId: request.moveId, attackerSide: battler === 0 ? "player" : "opponent" } };
      }
      case "HIT_ANIMATION":
        return { event: { kind: "hit-animation", targetVisible: !hidden[battler] } };
      case "STATS_CHANGE": {
        const argument = Number(payload.arguments[0]);
        return { event: Number.isInteger(argument) ? { kind: "stat-animation", argument }
          : { kind: "invalidate", reason: "stat animation without an argument" } };
      }
      case "SCENE_OFF_ATTACK_PAUSE":
        return { event: { kind: "invalidate", reason: "scene-off attack pause" } };
      default:
        return { event: { kind: "general-animation", animation: payload.animationId } };
    }
  }
  if (payload.kind === "status-animation") {
    const name = spriteOrderStatusAnimationName(payload.isStatus2 !== 0, payload.status);
    return name === null ? {} : { event: { kind: "status-animation", status: name } };
  }
  if (payload.kind === "set-battler-sprite-visibility") {
    if (RECALL_OPCODES.has(event.provenance?.opcodeName ?? "")) return { event: { kind: "invalidate", reason: "return to ball" } };
    if (payload.battler !== 0 && payload.battler !== 1) return { event: { kind: "invalidate", reason: "visibility battler" } };
    const next: [boolean, boolean] = [hidden[0], hidden[1]];
    next[payload.battler] = payload.invisible;
    // Cmd_playanimation skips most table animations for a STATUS3_SEMI_INVULNERABLE battler and the hidden-target
    // blip skip is unobserved on real routes (docs/sprite-order-real-route.md §4.6): hiding a battler invalidates.
    return { hidden: Object.freeze(next) as readonly [boolean, boolean],
      ...(payload.invisible ? { event: { kind: "invalidate", reason: "semi-invulnerable battler hidden" } as const } : {}) };
  }
  if (INVALIDATING_EVENTS.has(payload.kind)) return { event: { kind: "invalidate", reason: payload.kind } };
  return {};
}

interface ResolutionView {
  readonly resolutionId: Readonly<{ requestId: number }>;
  readonly segmentIndex: number;
  readonly segments: readonly Readonly<{ events: readonly BattleKernelSemanticEvent[] }>[];
}

/**
 * Apply the presented resolution's events up to `throughSequence` (inclusive; strictly before it when `before`).
 * Earlier segments are completed first. `drained` is set once the final segment's events are all applied.
 */
export function advanceLiveSpriteOrderHost(
  host: LiveSpriteOrderHost, resolution: ResolutionView, throughSequence: number, before = false,
): LiveSpriteOrderHost {
  const requestId = resolution.resolutionId.requestId;
  let tracker = host.tracker;
  let hidden = host.hidden;
  let cursor = host.cursor;
  if (cursor?.requestId !== requestId) {
    if (cursor !== null && !cursor.drained) tracker = invalidateSpriteOrderTracker(tracker, "previous resolution not fully applied");
    if (host.promptRequestId !== requestId) tracker = invalidateSpriteOrderTracker(tracker, "resolution without a modelled prompt cycle");
    cursor = { requestId, segmentIndex: 0, nextEventIndex: 0, drained: false };
  }
  const apply = (events: readonly BattleKernelSemanticEvent[], from: number, limit: number, strict: boolean) => {
    let index = from;
    while (index < events.length && (strict ? events[index]!.sequence < limit : events[index]!.sequence <= limit)) {
      const mapped = orderEventOf(events[index]!, hidden);
      if (mapped.hidden) hidden = mapped.hidden;
      if (mapped.event) tracker = applySpriteOrderPresentationEvent(tracker, mapped.event);
      index += 1;
    }
    return index;
  };
  while (cursor.segmentIndex < resolution.segmentIndex) {
    const events = resolution.segments[cursor.segmentIndex]?.events ?? [];
    apply(events, cursor.nextEventIndex, Number.POSITIVE_INFINITY, false);
    cursor = { requestId, segmentIndex: cursor.segmentIndex + 1, nextEventIndex: 0, drained: false };
  }
  if (cursor.segmentIndex === resolution.segmentIndex) {
    const events = resolution.segments[cursor.segmentIndex]?.events ?? [];
    const nextEventIndex = apply(events, cursor.nextEventIndex, throughSequence, before);
    cursor = {
      requestId, segmentIndex: cursor.segmentIndex, nextEventIndex,
      drained: nextEventIndex >= events.length && cursor.segmentIndex === resolution.segments.length - 1,
    };
  }
  if (tracker === host.tracker && hidden === host.hidden && cursor.requestId === host.cursor?.requestId
    && cursor.segmentIndex === host.cursor.segmentIndex && cursor.nextEventIndex === host.cursor.nextEventIndex
    && cursor.drained === host.cursor.drained) return host;
  return Object.freeze({ ...host, tracker, hidden, cursor: Object.freeze(cursor) });
}

/** Order lent to the move body at its activation edge (null = consumers decline). */
export function lendLiveSpriteOrder(host: LiveSpriteOrderHost): LiveMoveSpriteOrderInput | undefined {
  const free = spriteOrderTrackerLend(host.tracker);
  return free === null ? undefined : Object.freeze({ known: true as const, free });
}
