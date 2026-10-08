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
 *   set-battler-sprite-visibility                    hiding (semi-invulnerable) or a return-to-ball receipt invalidates,
 *                                                    except Roar/Whirlwind's `returntoball` of the segment's latest
 *                                                    MOVE_ANIMATION target: forced-switch-out {side}, and the player's
 *                                                    voluntary `returnatktoball` (battler 0, no earlier MOVE_ANIMATION
 *                                                    in the segment): switch-out (docs/voluntary-switch-lend-audit.md)
 *   faint-animation battler 0 / 1                    faint (player / opponent battler slot; unknown slot invalidates)
 *   draw-party-status-summary battler 1 / 0          party-summary-next / no allocation (no-op)
 *   hide-party-status-summary battler 1 / 0          party-summary-hide (adjacency marker) / no-op
 *   switch-in-animation battler 1                    next-mon-send-out (directly after the summary unit)
 *   switch-in-animation battler 0                    switch-in-start + switch-in-finish (after the party-menu reshow)
 *   switch-in-animation after a forced switch-out    switch-in-start + switch-in-finish {side} (no summary in between)
 *   switch (Cmd_getswitchedmondata)                  data only: no-op
 *   trainer-slide-in                                 trainer-slide-end (end-of-battle win slide)
 *   trainer-slide-out (mid-battle), outcome          invalidate
 *   other events (messages, HP, status data, PP, ...) no allocation: no-op
 *
 * Party menu (docs/sprite-order-uncovered-units.md §2 rule (d)): opening it is a ResetSpriteData (party-menu-reset,
 * which revives an invalid order); returning applies reset + battle-reshow (variant from whether the player battler
 * sprite exists; a hidden battler or a missing opponent battler invalidates). The orchestrator additionally
 * invalidates on a locked player action (no prompt), a retained locked-action continuation, and any resolution whose
 * events were not all applied.
 */
import type { BattleKernelSemanticEvent } from "./battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import { createKnownEntrySpriteAllocatorProvider, type KnownEntryRoute } from "./knownEntrySpriteAllocator.ts";
import type { LiveMoveSpriteOrderInput } from "./liveMoveSpriteAllocator.ts";
import type { LiveSpriteAllocatorHost } from "./liveSpriteAllocator.ts";
import {
  KNOWN_ENTRY_BATTLER_SLOTS, KNOWN_ENTRY_OCCUPANT_ROLES, applySpriteOrderPresentationEvent, createSpriteOrderTracker,
  invalidateSpriteOrderTracker, spriteOrderStatusAnimationName, spriteOrderTrackerLend, spriteOrderTrackerRoleIsomorphic,
  type SpriteOrderDeferredLend, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "./spriteOrderEventTransform.ts";
import {
  invalidateSpriteOrderState, knownEntryPrePromptSpriteOrderState, knownEntrySpriteOrderState, type SpriteOrderState,
} from "./spriteOrderProvider.ts";

export interface LiveSpriteOrderHost {
  readonly tracker: SpriteOrderTracker;
  /** Request whose prompt cycle has been applied; a resolution of any other request invalidates. */
  readonly promptRequestId: number | null;
  /** Next unapplied semantic event of the presented resolution; `drained` once its last segment is applied. */
  readonly cursor: Readonly<{ requestId: number; segmentIndex: number; nextEventIndex: number; drained: boolean }> | null;
  /** Battler sprites hidden by the semi-invulnerable `moveend`/`makevisible` toggles. */
  readonly hidden: readonly [boolean, boolean];
  /** Presentation units (animation bodies, faints, switches, party-menu resets) applied since the battle began (prep16 s0.3 first-body gate). */
  readonly bodies?: number;
  /**
   * prep18 s1.1: the battle's first unit was a Dig setup body (move-animation 91 at `bodies` 0). `units` = the body counter right
   * after it; the unleash lend requires no other unit since (only the setup's own attacker-hide invalidate may follow).
   */
  readonly digSetup?: Readonly<{ units: number }>;
  /** prep29: the battle's first unit was a Bonemerang hit 1 (move-animation 155 at `bodies` 0); `units` = the body counter right after it (hit 2 lend gate). */
  readonly bonemerangHit1?: Readonly<{ units: number }>;
  /**
   * Deferred-lend marker of a multi-body Random2 move (docs/s10a-random2-order-lend-blocker.md design 1; markLiveSpriteOrderDeferredBody):
   * `deferredBody` is set at the earlier body's lend and consumed by that body's own move-animation event, which starts `deferred` (the
   * tracker invalidates there: no constant plan). Every later order event appends to `deferred.units` while the tracker stays unknown.
   * Word-free: keys, request fields, free orders and order events only.
   */
  readonly deferredBody?: Omit<SpriteOrderDeferredLend, "units">;
  readonly deferred?: SpriteOrderDeferredLend;
}

/** Multi-body Random2 moves whose later bodies take a deferred lend from an earlier body of the same move (Ice Ball 301). */
export const DEFERRED_LEND_MOVE_IDS: readonly number[] = Object.freeze([301]);

/** Append order events to a pending deferred lend (no-op without one). */
function withDeferredUnits(host: LiveSpriteOrderHost, units: readonly SpriteOrderPresentationEvent[]): LiveSpriteOrderHost {
  if (host.deferred === undefined || units.length === 0) return host;
  return Object.freeze({ ...host, deferred: Object.freeze({ ...host.deferred, units: Object.freeze([...host.deferred.units, ...units]) }) });
}
/** Drop the deferred marker (the tracker was revived by a party-menu reset, or a new known order replaces it). */
function withoutDeferred(host: LiveSpriteOrderHost): LiveSpriteOrderHost {
  if (host.deferred === undefined && host.deferredBody === undefined) return host;
  const { deferred: _d, deferredBody: _b, ...rest } = host;
  return Object.freeze(rest);
}

/**
 * Record the deferred-lend marker at a DEFERRED_LEND_MOVE_IDS body's activation edge (orchestrator, right after lendLiveSpriteOrder): its
 * presentation body key, request fields and its own lend, which must be a known-entry-occupancy free order (battler slots and occupant
 * roles the entry ones: the lend is the raw free order) or itself deferred. Anything else records nothing (later bodies decline).
 */
export function markLiveSpriteOrderDeferredBody(
  host: LiveSpriteOrderHost, lend: LiveMoveSpriteOrderInput | undefined,
  body: Readonly<{ moveId: number; attacker: number; rolloutCounter?: number; turn?: number }>, key: string,
): LiveSpriteOrderHost {
  if (!DEFERRED_LEND_MOVE_IDS.includes(body.moveId) || lend === undefined || (body.attacker !== 0 && body.attacker !== 1)) return host;
  let activation: SpriteOrderDeferredLend["activation"];
  if (lend.deferred !== undefined) activation = Object.freeze({ deferred: lend.deferred });
  else {
    const { battlerSlots, occupantRoles } = host.tracker;
    const atEntry = battlerSlots.player === KNOWN_ENTRY_BATTLER_SLOTS.player && battlerSlots.opponent === KNOWN_ENTRY_BATTLER_SLOTS.opponent
      && occupantRoles !== null && JSON.stringify(occupantRoles) === JSON.stringify(KNOWN_ENTRY_OCCUPANT_ROLES);
    if (!atEntry || !host.tracker.cursor.order.known) return host;
    activation = Object.freeze({ free: lend.free });
  }
  return Object.freeze({ ...host, deferredBody: Object.freeze({
    key, moveId: body.moveId, attackerSide: body.attacker === 0 ? "player" as const : "opponent" as const,
    ...(body.rolloutCounter === undefined ? {} : { rolloutCounter: body.rolloutCounter }),
    ...(body.turn === undefined ? {} : { turn: body.turn }), activation }) });
}

const RECALL_OPCODES: ReadonlySet<string> = new Set(["B_SCR_OP_VARIOUS", "B_SCR_OP_RETURNATKTOBALL", "B_SCR_OP_RETURNTOBALL"]);
/** Order events that count as a presentation unit for the first-body gate (every body, faint, switch and recall). */
const BODY_UNIT_EVENTS: ReadonlySet<string> = new Set([
  "move-animation", "hit-animation", "stat-animation", "general-animation", "status-animation", "faint", "switch-out",
  "forced-switch-out", "switch-in-start", "next-mon-send-out", "invalidate"]);
const INVALIDATING_EVENTS: ReadonlySet<string> = new Set(["trainer-slide-out", "outcome"]);

export function createLiveSpriteOrderHost(order: SpriteOrderState): LiveSpriteOrderHost {
  const hidden: readonly [boolean, boolean] = Object.freeze([false, false] as const);
  return Object.freeze({ tracker: createSpriteOrderTracker(order), promptRequestId: null, cursor: null, hidden, bodies: 0 });
}

/**
 * Order seed from the battle-start script events (docs/sprite-order-policy-gaps.md §2, proposal C). No events: the
 * known entry. Exactly one Intimidate triple (stat-stage-change, one STATS_CHANGE animation with a modelled stat
 * argument, message): the pre-prompt entry state plus the stat-animation plan; the first prompt cycle then applies as
 * usual. Anything else is unknown history.
 */
export function seedLiveSpriteOrderHostFromBattleStart(events: readonly BattleKernelSemanticEvent[]): LiveSpriteOrderHost {
  const known = knownEntrySpriteOrderState("ordinary-factory");
  if (events.length === 0) return createLiveSpriteOrderHost(known);
  const invalid = () => createLiveSpriteOrderHost(invalidateSpriteOrderState(known));
  if (events.length !== 3) return invalid();
  const [stat, animation, message] = events as [BattleKernelSemanticEvent, BattleKernelSemanticEvent, BattleKernelSemanticEvent];
  const payload = animation.payload;
  if (stat.payload.kind !== "stat-stage-change" || message.payload.kind !== "message"
    || payload.kind !== "animation" || payload.animationId !== "STATS_CHANGE" || payload.arguments.length !== 1
    || Number(payload.arguments[0]) !== 22) return invalid();
  const host = createLiveSpriteOrderHost(knownEntryPrePromptSpriteOrderState("ordinary-factory"));
  return Object.freeze({
    ...host, tracker: applySpriteOrderPresentationEvent(host.tracker, { kind: "stat-animation", argument: 22 }), bodies: 1,
  });
}

export function invalidateLiveSpriteOrderHost(host: LiveSpriteOrderHost, reason: string): LiveSpriteOrderHost {
  if (!host.tracker.cursor.order.known) return withDeferredUnits(host, [{ kind: "invalidate", reason }]);
  return Object.freeze({ ...host, tracker: invalidateSpriteOrderTracker(host.tracker, reason) });
}

export function liveSpriteOrderHostOrder(host: LiveSpriteOrderHost): SpriteOrderState {
  return host.tracker.cursor.order;
}

/**
 * The voluntary party menu opened from the action prompt (ResetSpriteData): identity order, nothing allocated, no
 * battler tracked; revives an invalid order. Events of the finished resolution that were never applied ran before
 * the menu and are erased with it, so its cursor counts as drained.
 */
export function openLiveSpriteOrderHostPartyMenu(host: LiveSpriteOrderHost): LiveSpriteOrderHost {
  return Object.freeze({
    ...withoutDeferred(host),
    tracker: applySpriteOrderPresentationEvent(host.tracker, { kind: "party-menu-reset" }),
    bodies: (host.bodies ?? 0) + 1,
    cursor: host.cursor === null || host.cursor.drained ? host.cursor : Object.freeze({ ...host.cursor, drained: true }),
  });
}

/**
 * Return from a party menu to the battle: the exit ResetSpriteData, then the battle reshow (both battlers, or the
 * opponent alone when the player battler sprite is gone). A hidden battler or a missing opponent battler is an
 * unobserved reshow shape: invalidate.
 */
export function returnLiveSpriteOrderHostFromPartyMenu(
  host: LiveSpriteOrderHost, battlers: Readonly<{ player: boolean; opponent: boolean }>,
): LiveSpriteOrderHost {
  const reset = applySpriteOrderPresentationEvent(host.tracker, { kind: "party-menu-reset" });
  const tracker = !battlers.opponent ? invalidateSpriteOrderTracker(reset, "reshow without the opponent battler")
    : host.hidden[0] || host.hidden[1] ? invalidateSpriteOrderTracker(reset, "reshow with a hidden battler")
      : applySpriteOrderPresentationEvent(reset, { kind: "battle-reshow", playerBattlerPresent: battlers.player });
  return Object.freeze({ ...withoutDeferred(host), tracker, bodies: (host.bodies ?? 0) + 1 });
}

/**
 * Whether each side's battler sprite exists before `segmentIndex` of a resolution: the last faint-animation /
 * switch-in-animation of that battler in the earlier segments (none: present, as at every command prompt).
 */
export function liveSpriteOrderBattlersPresent(
  resolution: ResolutionView, segmentIndex: number,
): Readonly<{ player: boolean; opponent: boolean }> {
  const present = [true, true];
  for (const segment of resolution.segments.slice(0, segmentIndex)) {
    for (const event of segment.events) {
      const payload = event.payload;
      if ((payload.kind === "faint-animation" || payload.kind === "switch-in-animation")
        && (payload.battler === 0 || payload.battler === 1)) present[payload.battler] = payload.kind === "switch-in-animation";
    }
  }
  return Object.freeze({ player: present[0]!, opponent: present[1]! });
}

/**
 * The player submitted request `requestId` from the action menu: the bounce pair was created at the prompt and is
 * destroyed at commit, before the turn's first body. `promptShown` false (a locked action, a retained locked-action
 * continuation) invalidates. A previous resolution whose events were not all applied invalidates.
 * `fromPartyMenu`: the decision was chosen in the voluntary party menu, which erased the prompt's bounce pair; its
 * return (reset + reshow with both battlers) replaces the prompt cycle (ROM: reshow, then the turn's first body).
 */
export function beginLiveSpriteOrderTurn(
  host: LiveSpriteOrderHost, requestId: number, promptShown: boolean, fromPartyMenu = false,
): LiveSpriteOrderHost {
  let next = host;
  if (fromPartyMenu) {
    next = returnLiveSpriteOrderHostFromPartyMenu(openLiveSpriteOrderHostPartyMenu(next), { player: true, opponent: true });
  } else if (next.cursor !== null && !next.cursor.drained) {
    next = invalidateLiveSpriteOrderHost(next, "previous resolution not fully applied");
  }
  if (!promptShown) next = invalidateLiveSpriteOrderHost(next, "command resolution without an action prompt");
  let tracker = next.tracker;
  if (!fromPartyMenu) {
    tracker = applySpriteOrderPresentationEvent(tracker, { kind: "action-prompt" });
    tracker = applySpriteOrderPresentationEvent(tracker, { kind: "actions-committed" });
    if (!tracker.cursor.order.known) next = withDeferredUnits(next, [{ kind: "action-prompt" }, { kind: "actions-committed" }]);
  }
  return Object.freeze({ ...next, tracker, promptRequestId: requestId });
}

/**
 * Roar/Whirlwind's forced `returntoball` (skipAnim; docs/forced-switch-continuation.md §1.1): a RETURNTOBALL hide of the
 * battler the segment's latest MOVE_ANIMATION targeted (not its attacker: Baton Pass's `returntoball BS_ATTACKER` is not
 * modelled and keeps invalidating).
 */
function isForcedSwitchOut(events: readonly BattleKernelSemanticEvent[], index: number): boolean {
  const event = events[index]!;
  const payload = event.payload;
  if (payload.kind !== "set-battler-sprite-visibility" || !payload.invisible
    || event.provenance?.opcodeName !== "B_SCR_OP_RETURNTOBALL") return false;
  for (let at = index - 1; at >= 0; at--) {
    const earlier = events[at]!.payload;
    if (earlier.kind === "animation" && earlier.animationId === "MOVE_ANIMATION") {
      return earlier.target !== earlier.battler && earlier.target === payload.battler;
    }
  }
  return false;
}

/** The send-in of a forced switch-out earlier in the segment (no party summary or other send-in in between). */
function followsForcedSwitchOut(events: readonly BattleKernelSemanticEvent[], index: number, battler: 0 | 1): boolean {
  for (let at = index - 1; at >= 0; at--) {
    const earlier = events[at]!.payload;
    if (earlier.kind === "draw-party-status-summary" || earlier.kind === "switch-in-animation"
      || earlier.kind === "faint-animation") return false;
    if (earlier.kind === "set-battler-sprite-visibility" && earlier.battler === battler) return isForcedSwitchOut(events, at);
  }
  return false;
}

/**
 * The player's voluntary switch-out (BattleScript_ActionSwitch `returnatktoball`, docs/voluntary-switch-lend-audit.md §2.3):
 * a RETURNATKTOBALL hide of battler 0 before any move body of the segment. The opponent's AI switch (battler 1) and a
 * recall after a body (Pursuit's switch-out damage) are unprobed and keep invalidating.
 */
function isVoluntaryPlayerSwitchOut(events: readonly BattleKernelSemanticEvent[], index: number): boolean {
  const event = events[index]!;
  const payload = event.payload;
  if (payload.kind !== "set-battler-sprite-visibility" || !payload.invisible || payload.battler !== 0
    || event.provenance?.opcodeName !== "B_SCR_OP_RETURNATKTOBALL") return false;
  return !events.slice(0, index).some(({ payload: earlier }) =>
    earlier.kind === "animation" && earlier.animationId === "MOVE_ANIMATION");
}

function orderEventOf(
  events: readonly BattleKernelSemanticEvent[], index: number, hidden: readonly [boolean, boolean],
): { event?: SpriteOrderPresentationEvent; then?: SpriteOrderPresentationEvent; hidden?: readonly [boolean, boolean] } {
  const event = events[index]!;
  const payload = event.payload;
  if (payload.kind === "faint-animation" || payload.kind === "draw-party-status-summary"
    || payload.kind === "hide-party-status-summary" || payload.kind === "switch-in-animation") {
    const battler = payload.battler;
    if (battler !== 0 && battler !== 1) return { event: { kind: "invalidate", reason: `${payload.kind} battler ${battler}` } };
    switch (payload.kind) {
      case "faint-animation":
        return { event: { kind: "faint", side: battler === 0 ? "player" : "opponent" } };
      case "draw-party-status-summary":
        // The player-side summary allocates nothing (forced and voluntary: 0 allocator calls).
        return battler === 1 ? { event: { kind: "party-summary-next" } } : {};
      case "hide-party-status-summary":
        return battler === 1 ? { event: { kind: "party-summary-hide" } } : {};
      case "switch-in-animation":
        if (followsForcedSwitchOut(events, index, battler)) {
          const side = battler === 0 ? "player" as const : "opponent" as const;
          return { event: { kind: "switch-in-start", side }, then: { kind: "switch-in-finish", side } };
        }
        return battler === 1 ? { event: { kind: "next-mon-send-out" } }
          : { event: { kind: "switch-in-start" }, then: { kind: "switch-in-finish" } };
    }
  }
  if (payload.kind === "switch") return {};
  if (payload.kind === "trainer-slide-in") return { event: { kind: "trainer-slide-end" } };
  if (payload.kind === "animation") {
    const battler = payload.battler;
    if (battler !== 0 && battler !== 1) return { event: { kind: "invalidate", reason: `animation ${payload.animationId} battler ${battler}` } };
    switch (payload.animationId) {
      case "MOVE_ANIMATION": {
        const request = battleMoveAnimationRequest(battler, payload.target, payload.arguments);
        return { event: { kind: "move-animation", moveId: request.moveId === 143 && request.turn === 1 ? 10143 : request.moveId, attackerSide: battler === 0 ? "player" : "opponent" } };
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
    if (isForcedSwitchOut(events, index)) {
      return { event: { kind: "forced-switch-out", side: payload.battler === 0 ? "player" : "opponent" } };
    }
    if (isVoluntaryPlayerSwitchOut(events, index)) return { event: { kind: "switch-out" } };
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
  let bodies = host.bodies ?? 0;
  let digSetup = host.digSetup;
  let bonemerangHit1 = host.bonemerangHit1;
  let deferredBody = host.deferredBody;
  let deferred = host.deferred;
  const record = (event: SpriteOrderPresentationEvent | undefined) => {
    if (event !== undefined && deferred !== undefined) deferred = Object.freeze({ ...deferred, units: Object.freeze([...deferred.units, event]) });
  };
  let cursor = host.cursor;
  if (cursor?.requestId !== requestId) {
    if (cursor !== null && !cursor.drained) {
      tracker = invalidateSpriteOrderTracker(tracker, "previous resolution not fully applied");
      record({ kind: "invalidate", reason: "previous resolution not fully applied" });
    }
    if (host.promptRequestId !== requestId) {
      tracker = invalidateSpriteOrderTracker(tracker, "resolution without a modelled prompt cycle");
      record({ kind: "invalidate", reason: "resolution without a modelled prompt cycle" });
    }
    cursor = { requestId, segmentIndex: 0, nextEventIndex: 0, drained: false };
  }
  const apply = (events: readonly BattleKernelSemanticEvent[], from: number, limit: number, strict: boolean) => {
    let index = from;
    while (index < events.length && (strict ? events[index]!.sequence < limit : events[index]!.sequence <= limit)) {
      const mapped = orderEventOf(events, index, hidden);
      if (mapped.hidden) hidden = mapped.hidden;
      if (mapped.event) tracker = applySpriteOrderPresentationEvent(tracker, mapped.event);
      if (mapped.then) tracker = applySpriteOrderPresentationEvent(tracker, mapped.then);
      // Deferred lend: the marked body's own event starts it (the tracker invalidates there); later events are its units while the order is
      // unknown; a revived (known) tracker drops it.
      if (mapped.event?.kind === "move-animation" && deferredBody !== undefined && mapped.event.moveId === deferredBody.moveId
        && mapped.event.attackerSide === deferredBody.attackerSide) {
        deferred = tracker.cursor.order.known ? undefined : Object.freeze({ ...deferredBody, units: Object.freeze([]) });
        deferredBody = undefined;
      } else if (tracker.cursor.order.known) {
        deferred = undefined;
      } else {
        record(mapped.event);
        record(mapped.then);
      }
      const wasFirstBody = bodies === 0;
      if (mapped.event && BODY_UNIT_EVENTS.has(mapped.event.kind)) bodies += 1;
      if (mapped.event?.kind === "move-animation" && mapped.event.moveId === 91 && wasFirstBody) digSetup = Object.freeze({ units: bodies });
      if (mapped.event?.kind === "move-animation" && mapped.event.moveId === 155 && wasFirstBody) bonemerangHit1 = Object.freeze({ units: bodies });
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
  if (tracker === host.tracker && bodies === (host.bodies ?? 0) && digSetup === host.digSetup && bonemerangHit1 === host.bonemerangHit1
    && deferred === host.deferred && deferredBody === host.deferredBody && hidden === host.hidden && cursor.requestId === host.cursor?.requestId
    && cursor.segmentIndex === host.cursor.segmentIndex && cursor.nextEventIndex === host.cursor.nextEventIndex
    && cursor.drained === host.cursor.drained) return host;
  const { deferred: _d, deferredBody: _b, ...rest } = host;
  return Object.freeze({ ...rest, tracker, hidden, bodies, ...(digSetup === undefined ? {} : { digSetup }), ...(bonemerangHit1 === undefined ? {} : { bonemerangHit1 }),
    ...(deferredBody === undefined ? {} : { deferredBody }), ...(deferred === undefined ? {} : { deferred }), cursor: Object.freeze(cursor) });
}

/**
 * Consumers measured NOT exact after an opponent KO under the entry-label lend (docs/postko-consumer-audit.md §4): they keep
 * declining post-KO (scene-off fallback) until resolved. Empty: Leaf Blade 348 was excluded for ISSUES #144, which was the target
 * species' front-idle x2 (not the lend); fixed, postko-lend/postko-leaf-blade-fixed-receipt.json is 224/224 twice fresh.
 */
export const POSTKO_LEND_EXCLUDED_MOVE_IDS: readonly number[] = Object.freeze<number[]>([]);

/**
 * Free order after a Dig setup body (prep18 s1.1: identical in both corpora and the FLYGON/GOLEM alternates, both attacker sides):
 * the known-entry occupied prefix `[62, 60, 0, 63, 1, 61, 6, 8, 2]` then this tail. The hide that follows the setup invalidates the
 * tracker (a semi-invulnerable battler), so the unleash lend is this constant, valid only for "setup first, nothing since".
 */
const DIG_POST_SETUP_FREE: readonly number[] = Object.freeze([
  4, 3, 7, 5, 10, 9, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 54, 55, 56, 57, 58, 59, 23, 22,
  48, 49, 50, 51, 52, 53, ...Array.from({ length: 24 }, (_, i) => 24 + i)]);

/** The unleash body's lend: post-setup order and BG/scanline history (`afterDigSetup`). Also used by the dense fixture harness. */
export function digUnleashLend(): LiveMoveSpriteOrderInput {
  return Object.freeze({ known: true as const, free: DIG_POST_SETUP_FREE, afterDigSetup: true as const });
}

/**
 * Order lent to the move body at its activation edge (undefined = consumers decline): the tracker's entry-label lend
 * (spriteOrderTrackerLend), withheld after a KO (battler slots not the entry ones) from POSTKO_LEND_EXCLUDED_MOVE_IDS.
 */
/**
 * Bonemerang hit 2 lend (prep29 B.1; identical in the accepted scenarios and the RHYDON/GOLEM alternates, both sides): the known-entry
 * free order with the hit-1 sprite pair swapped (slots 3 and 4 trade places after the bone / impact / lunge births and frees). The
 * tracker's own lend (after the hit-1 body and the target's hit animation) is only the known / unknown gate.
 */
export function bonemerangHit2Free(): readonly number[] {
  return BONEMERANG_HIT2_FREE;
}
const BONEMERANG_HIT2_FREE: readonly number[] = Object.freeze([
  3, 4, 21, 20, 5, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 7, 54, 55, 56, 57, 58, 59, 23, 22,
  48, 49, 50, 51, 52, 53, ...Array.from({ length: 24 }, (_, i) => 24 + i)]);

export function lendLiveSpriteOrder(host: LiveSpriteOrderHost, moveId?: number): LiveMoveSpriteOrderInput | undefined {
  if (moveId === 91 && host.digSetup !== undefined && (host.bodies ?? 0) >= host.digSetup.units && (host.bodies ?? 0) <= host.digSetup.units + 1) {
    return digUnleashLend();
  }
  // A later body of a DEFERRED_LEND_MOVE_IDS move after an earlier one (unknown tracker): the word-free deferred lend; the render seam
  // resolves it (resolveSpriteOrderDeferredLend). `free` is empty so that no other consumer can read it as an order.
  if (!host.tracker.cursor.order.known && host.deferred !== undefined && moveId === host.deferred.moveId) {
    return Object.freeze({ known: true as const, free: Object.freeze([]), deferred: host.deferred });
  }
  const free = spriteOrderTrackerLend(host.tracker);
  if (free === null) return undefined;
  const { player, opponent } = host.tracker.battlerSlots;
  const atEntry = player === KNOWN_ENTRY_BATTLER_SLOTS.player && opponent === KNOWN_ENTRY_BATTLER_SLOTS.opponent;
  if (!atEntry && moveId !== undefined && POSTKO_LEND_EXCLUDED_MOVE_IDS.includes(moveId)) return undefined;
  // hit 1 first body; the target's hit animation between the hits is the only unit that may follow it
  const hit2 = moveId === 155 && host.bonemerangHit1 !== undefined && (host.bodies ?? 0) >= host.bonemerangHit1.units && (host.bodies ?? 0) <= host.bonemerangHit1.units + 1;
  return Object.freeze({
    known: true as const, free: hit2 ? bonemerangHit2Free() : free, ...((host.bodies ?? 0) === 0 ? { firstBody: true as const } : {}),
    ...(hit2 ? { afterBonemerangHit1: true as const } : {}),
  });
}

/**
 * Whether the order host's last unit leaves the allocator occupancy role-isomorphic to the known entry, so that the
 * allocator host can be re-seeded in entry labels: a modelled opponent faint + next-mon summary + send-out
 * (docs/postko-consumer-audit.md §4.3), a player faint + forced party menu + reshowPlayerGone + forced switch-in
 * (docs/playerfaint-lend-audit.md §4.3), a voluntary recall + switch-in, or the return from a cancelled voluntary party
 * menu (reshowBoth; docs/voluntary-switch-lend-audit.md §4.4). Occupant roles must be known.
 */
export function liveSpriteAllocatorReseedable(host: LiveSpriteOrderHost): boolean {
  const { lastUnit, occupantRoles } = host.tracker;
  return (lastUnit === "send-out" || ((lastUnit === "switch-in" || lastUnit === "reshow") && occupantRoles !== null))
    && spriteOrderTrackerRoleIsomorphic(host.tracker);
}

/**
 * Allocator host after a modelled opponent send-out, a player switch-in or a cancelled party menu's reshow
 * (liveSpriteAllocatorReseedable): the
 * occupancy is role-isomorphic to the known entry (battlers, healthboxes, shadow), so the host is re-seeded with the
 * known-entry `firstMove` host, i.e. the post-unit view relabelled to entry slot labels (the labels the order lend
 * uses). Any other host is returned unchanged (an invalid host stays invalid). Net-zero history persists from there.
 */
export function reseedLiveSpriteAllocatorAfterSendOut(
  allocator: LiveSpriteAllocatorHost, host: LiveSpriteOrderHost, route: KnownEntryRoute = "ordinary-factory",
): LiveSpriteAllocatorHost {
  if (allocator.historyKnown || !liveSpriteAllocatorReseedable(host)) return allocator;
  return createKnownEntrySpriteAllocatorProvider(route).firstMove;
}
