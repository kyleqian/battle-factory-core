/**
 * Live free-slot `sSpriteOrder` host for the Factory orchestrator (presentation-only; reads battle events, never
 * writes rules, RNG or facility state). Maps the resolution's semantic events and the command prompt lifecycle onto
 * the pure transform of spriteOrderEventTransform.ts, in event-sequence order, each event exactly once:
 *
 *   player command submitted from the action menu   action-prompt + actions-committed (bounce pair)
 *   animation MOVE_ANIMATION                         move-animation (moveId, attacker side; an odd request turn of
 *                                                    Razor Wind / Solar Beam / Sky Attack / Dig / Brick Break is 10000 + moveId: choosetwoturnanim;
 *                                                    Present with damage <= 0, the PresentHeal branch, is 20217; Fury Cutter
 *                                                    by the payload's furyCutterCounter 1 / 2 / 3 / 4+: 210 / 10210 / 20210 / 30210;
 *                                                    Return by AnimTask_GetReturnPowerLevel: Weak 40216 / Medium 216 / Strongest 30216)
 *   animation HIT_ANIMATION                          hit-animation (target visibility from the toggles below)
 *   animation STATS_CHANGE                           stat-animation (B_ANIM_STATS_CHANGE argument)
 *   animation WEATHER_VAR argument 12 / 13           general-animation SANDSTORM_CONTINUES / HAIL_CONTINUES
 *   animation TURN_TRAP argument = wrapped move      general-animation TURN_TRAP_FIRE_SPIN 83 / _WHIRLPOOL 250 / _SAND_TOMB 328 /
 *                                                    _BIND 20, 35 (Wrap); anything else (Clamp 128) stays TURN_TRAP (no plan)
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
 * sprite exists; a hidden player battler or a missing opponent battler invalidates). The orchestrator additionally
 * invalidates on a locked player action (no prompt) and any resolution whose events were not all applied; a retained
 * locked-action continuation applies the player's prompt cycle at its turn boundary (docs/next-adapters-prep47.md).
 */
import type { BattleKernelSemanticEvent } from "./battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import { createKnownEntrySpriteAllocatorProvider, type KnownEntryRoute } from "./knownEntrySpriteAllocator.ts";
import type { LiveMoveSpriteOrderInput } from "./liveMoveSpriteAllocator.ts";
import type { LiveSpriteAllocatorHost } from "./liveSpriteAllocator.ts";
import { generalAnimationPresentationRngKey, isWordsOrderDeferredUnit, WORDS_ORDER_GENERAL_ANIMATION, WORDS_ORDER_UNIT_MOVE_IDS } from "./wordsOrderUnits.ts";
import {
  KNOWN_ENTRY_BATTLER_SLOTS, KNOWN_ENTRY_OCCUPANT_ROLES, applySpriteOrderPresentationEvent, createSpriteOrderTracker,
  invalidateSpriteOrderTracker, spriteOrderStatusAnimationName, spriteOrderTrackerLend, spriteOrderTrackerRoleIsomorphic,
  SPRITE_ORDER_GEOMETRY_KEYED_ANIMS, SPRITE_ORDER_GEOMETRY_KEYED_BODIES, type SpriteOrderDeferredLend, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
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
  /** Battler sprites hidden by the semi-invulnerable `moveend`/`makevisible` toggles, or from a Fly / Bounce setup body to its unleash body (prep61). */
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

/**
 * Random2 move bodies that record a deferred-lend marker: the words-dependent order units Sand-Attack 28, Mud-Slap 189, Rain Dance 240,
 * Dive 291 and Ice Ball 301 (WORDS_ORDER_UNIT_MOVE_IDS; ANY later consumer takes their lend, docs/next-adapters-prep46.md; ice72: an Ice
 * Ball marker too, docs/ice72-ice-ball-words-unit.md). The RAIN_CONTINUES general animation marks itself per event (advanceLiveSpriteOrderHost).
 */
export const DEFERRED_LEND_MOVE_IDS: readonly number[] = Object.freeze([...WORDS_ORDER_UNIT_MOVE_IDS]);

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
 * `bodySpecies` (words59): the species displayed on each side at the body, recorded for Sand-Attack / Mud-Slap / Flatter (flat84) / Dive /
 * Ice Ball (ice72).
 */
export function markLiveSpriteOrderDeferredBody(
  host: LiveSpriteOrderHost, lend: LiveMoveSpriteOrderInput | undefined,
  body: Readonly<{ moveId: number; attacker: number; rolloutCounter?: number; turn?: number }>, key: string,
  bodySpecies?: Readonly<{ player: number; opponent: number }>,
): LiveSpriteOrderHost {
  if (!DEFERRED_LEND_MOVE_IDS.includes(body.moveId) || lend === undefined || (body.attacker !== 0 && body.attacker !== 1)) return host;
  let activation: SpriteOrderDeferredLend["activation"];
  if (lend.deferred !== undefined) activation = Object.freeze({ deferred: lend.deferred });
  else {
    const { battlerSlots, occupantRoles } = host.tracker;
    const atEntry = battlerSlots.player === KNOWN_ENTRY_BATTLER_SLOTS.player && battlerSlots.opponent === KNOWN_ENTRY_BATTLER_SLOTS.opponent
      && occupantRoles !== null && JSON.stringify(occupantRoles) === JSON.stringify(KNOWN_ENTRY_OCCUPANT_ROLES);
    // A words unit's lend is already in entry labels (spriteOrderTrackerLend rho), so its carry and the replay run in entry labels
    // also after a KO + send-in (role-isomorphic occupancy; prep46 s3; ice72: Ice Ball too, 10 ROM bodies at a rho occupancy exact).
    if ((!atEntry && !WORDS_ORDER_UNIT_MOVE_IDS.includes(body.moveId)) || !host.tracker.cursor.order.known) return host;
    activation = Object.freeze({ free: lend.free });
  }
  return Object.freeze({ ...host, deferredBody: Object.freeze({
    key, moveId: body.moveId, attackerSide: body.attacker === 0 ? "player" as const : "opponent" as const,
    ...(body.rolloutCounter === undefined ? {} : { rolloutCounter: body.rolloutCounter }),
    ...(body.turn === undefined ? {} : { turn: body.turn }),
    // words59: the dirt units' carry reads the body's displayed species (the consumer's field may show a replacement); ice72: Ice Ball's
    // shards sort on the target's Y_PIC_OFFSET point; flat84: Flatter's carry builds its adapter inputs at the body's species
    ...(bodySpecies === undefined || (body.moveId !== 28 && body.moveId !== 189 && body.moveId !== 260 && body.moveId !== 291 && body.moveId !== 301) ? {}
      : { bodySpecies: Object.freeze({ player: bodySpecies.player, opponent: bodySpecies.opponent }) }),
    activation }) });
}

/**
 * Moves whose script branches with choosetwoturnanim on `gAnimMoveTurn & 1` (Razor Wind / Solar Beam unleash, Fly / Bounce unleash, Sky
 * Attack strike, Dig unleash, Brick Break screen broken, Dive unleash). Dive 291 / 10291 stay words-keyed (no plan row; land68, prep65's
 * liveDiveWordsPlanText carries them).
 */
const TWO_TURN_ANIM_MOVE_IDS: ReadonlySet<number> = new Set([13, 19, 76, 91, 143, 280, 291, 340]);
/**
 * prep61: Fly / Bounce setup bodies hide the attacker's sprite themselves (FlySetUp / BounceSetUp; Scene ON emits no
 * MOVEEND_ATTACKER_INVISIBLE toggle, which needs HITMARKER_NO_ANIMATIONS): the battler is hidden from the setup body to its unleash body.
 * land68 (prep65): Dive's setup hides the diver too (AnimDiveBall, battle_anim_flying.c:1016); the render's hide is the same span
 * (liveSemiInvulnerableHideBattler / applyLiveSemiInvulnerableCommand, hide66).
 */
const SEMI_INVULNERABLE_SETUP_MOVE_IDS: ReadonlySet<number> = new Set([19, 291, 340]);
/** land68 (prep65): the order key of a marked body's own move-animation event (a two-turn unleash marker, Dive 291 turn 1, is keyed 10291). */
const deferredBodyOrderKey = (body: Readonly<{ moveId: number; turn?: number }>): number =>
  body.turn !== undefined && (body.turn & 1) === 1 && TWO_TURN_ANIM_MOVE_IDS.has(body.moveId) ? 10000 + body.moveId : body.moveId;
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
 * Order seed from the battle-start script events (docs/sprite-order-policy-gaps.md §2, proposal C; docs/next-adapters-prep47.md (B)).
 * The events must be a sequence of Intimidate triples (stat-stage-change, one STATS_CHANGE animation with a modelled stat argument,
 * message) and ROM-checked message-only units (Trace's STRINGID_PKMNTRACED, a prevented Intimidate's STRINGID_PREVENTEDFROMWORKING:
 * no sprite allocation). Without a triple: the known entry (also no events). With triples: the pre-prompt entry state plus one
 * stat-animation plan per triple, in order; the first prompt cycle then applies as usual. Anything else is unknown history.
 */
const BATTLE_START_SEED_MESSAGES: ReadonlySet<string> = new Set(["STRINGID_PKMNTRACED", "STRINGID_PREVENTEDFROMWORKING"]);
export function seedLiveSpriteOrderHostFromBattleStart(events: readonly BattleKernelSemanticEvent[]): LiveSpriteOrderHost {
  const known = knownEntrySpriteOrderState("ordinary-factory");
  const invalid = () => createLiveSpriteOrderHost(invalidateSpriteOrderState(known));
  const stats: number[] = [];
  for (let index = 0; index < events.length;) {
    const [stat, animation, message] = events.slice(index, index + 3);
    const payload = animation?.payload;
    if (stat?.payload.kind === "stat-stage-change" && message?.payload.kind === "message" && payload?.kind === "animation"
      && payload.animationId === "STATS_CHANGE" && payload.arguments.length === 1 && Number(payload.arguments[0]) === 22) {
      stats.push(22);
      index += 3;
      continue;
    }
    const lone = events[index]!.payload;
    if (lone.kind !== "message" || !BATTLE_START_SEED_MESSAGES.has(lone.messageId)) return invalid();
    index += 1;
  }
  if (stats.length === 0) return createLiveSpriteOrderHost(known);
  const host = createLiveSpriteOrderHost(knownEntryPrePromptSpriteOrderState("ordinary-factory"));
  const tracker = stats.reduce((t, argument) => applySpriteOrderPresentationEvent(t, { kind: "stat-animation", argument }), host.tracker);
  return Object.freeze({ ...host, tracker, bodies: stats.length });
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
 * Return from a party menu to the battle: the exit ResetSpriteData, then the battle reshow (both battlers, the opponent
 * alone when the player battler sprite is gone, or neither after a double KO: reshowNeither, docs/next-adapters-prep49.md X1).
 * A hidden player battler or the player battler without the opponent's is an unobserved reshow shape: invalidate (a hidden
 * opponent is the normal reshow: hist73).
 */
export function returnLiveSpriteOrderHostFromPartyMenu(
  host: LiveSpriteOrderHost, battlers: Readonly<{ player: boolean; opponent: boolean }>,
): LiveSpriteOrderHost {
  const reset = applySpriteOrderPresentationEvent(host.tracker, { kind: "party-menu-reset" });
  // prep49: neither battler (a double KO's forced party menu) is the reshowNeither shape; the opponent alone missing stays unobserved.
  // hist73: a hidden (semi-invulnerable) OPPONENT is re-created by the reshow in the same slot / order as a shown one, and stays
  // invisible (reshow_battle_screen.c CreateBattlerSprite; tools/integration/fixtures/hist73/hidden-battler-audit.json rs-*): the
  // normal reshow, `hidden` kept. A hidden player battler at a reshow stays unobserved.
  const tracker = !battlers.opponent && battlers.player ? invalidateSpriteOrderTracker(reset, "reshow without the opponent battler")
    : host.hidden[0] ? invalidateSpriteOrderTracker(reset, "reshow with a hidden battler")
      : applySpriteOrderPresentationEvent(reset, { kind: "battle-reshow", playerBattlerPresent: battlers.player,
        ...(battlers.opponent ? {} : { opponentBattlerPresent: false }) });
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
 * destroyed at commit, before the turn's first body (for a retained locked-action continuation: before the appended
 * continuation segment's first event). `promptShown` false (a locked player action) invalidates. A previous resolution whose events were not all applied invalidates.
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
 * battler the segment's latest MOVE_ANIMATION targeted; or Baton Pass's `returntoball BS_ATTACKER`, identified by its
 * interpreter receipt's script label (docs/next-adapters-prep49.md R1 / R2: the same `D o<battler slot>` unit, 2 x 2 exact).
 */
function isForcedSwitchOut(events: readonly BattleKernelSemanticEvent[], index: number): boolean {
  const event = events[index]!;
  const payload = event.payload;
  if (payload.kind !== "set-battler-sprite-visibility" || !payload.invisible
    || event.provenance?.opcodeName !== "B_SCR_OP_RETURNTOBALL") return false;
  // prep49: Cmd_returntoball is always skipAnim (EmitReturnMonToBall TRUE); its other script use is Baton Pass's
  // `returntoball BS_ATTACKER` (after the player's party menu / the AI's choice): the same `D o<battler slot>` unit.
  if (event.provenance?.sourceLabel === "BattleScript_EffectBatonPass") return payload.battler === 0 || payload.battler === 1;
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
 * A voluntary switch-out of `battler`: a RETURNATKTOBALL hide of it before any move body of the segment. Battler 0 is the
 * player's (BattleScript_ActionSwitch `returnatktoball`, docs/voluntary-switch-lend-audit.md §2.3; presentation synthesizes
 * its receipt). For battler 1 the kernel emits no receipt (its Cmd_returnatktoball handler only advances), so on real routes
 * the Factory AI's recall (docs/next-adapters-prep47.md (C): the same recall plan with the opponent battler) is applied at its
 * BattleScript_DoSwitchOut summary instead (isAiSwitchOutSummary, docs/next-adapters-prep49.md S1). A recall after a body
 * (Pursuit's switch-out damage) is unprobed and keeps invalidating.
 */
function isVoluntarySwitchOut(events: readonly BattleKernelSemanticEvent[], index: number, battler: 0 | 1): boolean {
  const event = events[index]!;
  const payload = event.payload;
  if (payload.kind !== "set-battler-sprite-visibility" || !payload.invisible || payload.battler !== battler
    || event.provenance?.opcodeName !== "B_SCR_OP_RETURNATKTOBALL") return false;
  return !events.slice(0, index).some(({ payload: earlier }) =>
    earlier.kind === "animation" && earlier.animationId === "MOVE_ANIMATION");
}

/** BattleScript_DoSwitchOut's summary with no recall receipt and no move body (Pursuit) before it in the segment. */
function isAiSwitchOutSummary(events: readonly BattleKernelSemanticEvent[], index: number): boolean {
  if (events[index]!.provenance?.sourceLabel !== "BattleScript_DoSwitchOut") return false;
  return !events.slice(0, index).some(({ payload: earlier }) =>
    (earlier.kind === "animation" && earlier.animationId === "MOVE_ANIMATION")
    || (earlier.kind === "set-battler-sprite-visibility" && earlier.battler === 1 && earlier.invisible));
}

/** Fury Cutter's order keys by furyCutterCounter 1 / 2 / 3 / 4+ (Move_FURY_CUTTER's FuryCutterContinue2 / Medium / Strong / Strongest). */
const FURY_CUTTER_ORDER_KEYS: readonly number[] = Object.freeze([210, 10210, 20210, 30210]);

/** AnimTask_GetReturnPowerLevel: 0 Weak (< 61: friendship 60 matches no range and keeps 0), 1 Medium (61..91), 2 Strong (92..200),
 * 3 Strongest (> 200). */
export function returnPowerLevel(friendship: number): 0 | 1 | 2 | 3 {
  return friendship > 200 ? 3 : friendship > 91 ? 2 : friendship > 60 ? 1 : 0;
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
    // hist73: a hidden (semi-invulnerable) battler's faint frees and orders its slots exactly as a shown battler's (both sides, two
    // species, the faint -> summary / party menu -> send-out window: tools/integration/fixtures/hist73/hidden-battler-audit.json hf-*
    // vs vf-*); the side is no longer hidden. prep61: a hidden battler's switch-in is unprobed.
    if (payload.kind === "faint-animation" && hidden[battler]) {
      const next: [boolean, boolean] = [hidden[0], hidden[1]];
      next[battler] = false;
      return { event: { kind: "faint", side: battler === 0 ? "player" : "opponent" }, hidden: Object.freeze(next) as readonly [boolean, boolean] };
    }
    if (payload.kind === "switch-in-animation" && hidden[battler]) {
      return { event: { kind: "invalidate", reason: `${payload.kind} of a hidden battler` } };
    }
    switch (payload.kind) {
      case "faint-animation":
        return { event: { kind: "faint", side: battler === 0 ? "player" : "opponent" } };
      case "draw-party-status-summary":
        // prep49: BattleScript_DoSwitchOut's `returnatktoball` emits no visibility receipt (the kernel handler only advances), so
        // the AI's voluntary recall (prep47 (C): the recall plan with the opponent battler) is applied at its summary.
        if (battler === 1 && isAiSwitchOutSummary(events, index)) {
          return { event: { kind: "switch-out", side: "opponent" }, then: { kind: "party-summary-next" } };
        }
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
        // choosetwoturnanim (gAnimMoveTurn & 1) branches: Sky Attack's strike, Dig's unleash, Brick Break's shattered screen.
        const secondBranch = (request.turn & 1) === 1 && TWO_TURN_ANIM_MOVE_IDS.has(request.moveId);
        // Move_PRESENT branches on gAnimMoveDmg > 0 (AnimTask_IsHealingMove, battle_anim_effects_3.c:1531): PresentHeal is 20000 + 217.
        const presentHeal = request.moveId === 217 && !(request.damage > 0);
        // Move_MAGNITUDE branches on gAnimMovePower > 99 (AnimTask_IsPowerOver99; request.power): MagnitudeIntense is 20000 + 222 (plans69).
        const magnitudeIntense = request.moveId === 222 && request.power > 99;
        // Move_FURY_CUTTER branches on furyCutterCounter (AnimTask_GetFuryCutterHitCount: 1 / 2 Medium / 3 Strong / 4+ Strongest; plans54):
        // the payload's 7th argument keys 210 / 10210 / 20210 / 30210; without it the body has no plan (invalidates).
        if (request.moveId === 210) {
          const counter = Number(payload.arguments[6]);
          return { event: Number.isInteger(counter) && counter >= 1 && counter <= 5
            ? { kind: "move-animation", moveId: FURY_CUTTER_ORDER_KEYS[Math.min(counter, 4) - 1]!, attackerSide: battler === 0 ? "player" : "opponent" }
            : { kind: "invalidate", reason: "Fury Cutter body without furyCutterCounter" } };
        }
        // Move_RETURN branches on gAnimFriendship (AnimTask_GetReturnPowerLevel, battle_anim_effects_3.c:5060-5073; ret80): 216's plan 117
        // is ReturnMedium's (61..91; dip, dip, lunge, hitsplat); ReturnStrongest (> 200) is 30000 + 216 (31 creates); ReturnWeak (< 61, the
        // kernel's friendship 0; dip, dip, hitsplat) is 40000 + 216 (ret88). Strong has no plan (invalidates).
        if (request.moveId === 216) {
          const level = returnPowerLevel(request.friendship);
          if (level === 3 || level === 0) {
            return { event: { kind: "move-animation", moveId: level === 3 ? 30216 : 40216, attackerSide: battler === 0 ? "player" : "opponent" } };
          }
          if (level !== 1) return { event: { kind: "invalidate", reason: `Return power level ${level} body` } };
        }
        const event = { kind: "move-animation", moveId: presentHeal ? 20217 : magnitudeIntense ? 20222 : secondBranch ? 10000 + request.moveId : request.moveId,
          attackerSide: battler === 0 ? "player" : "opponent" } as const;
        if (!SEMI_INVULNERABLE_SETUP_MOVE_IDS.has(request.moveId)) return { event };
        const next: [boolean, boolean] = [hidden[0], hidden[1]];
        next[battler] = (request.turn & 1) === 0;
        return { event, hidden: Object.freeze(next) as readonly [boolean, boolean] };
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
        // playanimation_var sB_ANIM_ARG1 (BattleScript_DamagingWeatherContinues): B_ANIM_SANDSTORM_CONTINUES 12 / B_ANIM_HAIL_CONTINUES 13.
        // General_TurnTrap -> AnimTask_GetTrappedMoveAnimId (battle_anim_throw.c:2486): the trapped battler's wrapped move picks the branch.
        if (payload.animationId === "TURN_TRAP") {
          const move = Number(payload.arguments[0]);
          return { event: { kind: "general-animation", animation: move === 83 ? "TURN_TRAP_FIRE_SPIN" : move === 250 ? "TURN_TRAP_WHIRLPOOL"
            : move === 328 ? "TURN_TRAP_SAND_TOMB" : move === 20 || move === 35 ? "TURN_TRAP_BIND" : "TURN_TRAP" } };
        }
        if (payload.animationId === "WEATHER_VAR") {
          const argument = payload.arguments[0];
          return { event: { kind: "general-animation", animation: argument === "12" ? "SANDSTORM_CONTINUES" : argument === "13" ? "HAIL_CONTINUES" : "WEATHER_VAR" } };
        }
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
    if (isVoluntarySwitchOut(events, index, 0)) return { event: { kind: "switch-out" } };
    if (isVoluntarySwitchOut(events, index, 1)) return { event: { kind: "switch-out", side: "opponent" } };
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

/** A geometry-keyed body's plan text at the displayed species of its move-animation command (segment, event sequence); undefined
 * when unknown. HAIL_CONTINUES asks for Move_HAIL's (moveId 258) at its own (general-animation) event sequence. `lentFree`: the order the
 * body is lent (spriteOrderTrackerLend: entry labels, as the live renderer gets it; Water Spout's plan ties in it, plans54). */
export type SpriteOrderBodyPlanAt = (
  segmentIndex: number, sequence: number, moveId: number, attackerSide: "player" | "opponent", lentFree?: readonly number[],
) => string | undefined;

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
  bodyPlanAt?: SpriteOrderBodyPlanAt,
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
  const apply = (segmentIndex: number, events: readonly BattleKernelSemanticEvent[], from: number, limit: number, strict: boolean) => {
    let index = from;
    while (index < events.length && (strict ? events[index]!.sequence < limit : events[index]!.sequence <= limit)) {
      let mapped = orderEventOf(events, index, hidden);
      // gdgeo: a geometry-keyed body (Giga Drain / Mega Drain) carries its plan at the displayed species of its own command;
      // unknown -> no plan (invalidates).
      // plans54: Move_HAIL / General_Hail (HAIL_CONTINUES, requested under 258) target both battlers through IsBattlerSpriteVisible; the plan
      // assumes both battler sprites are shown (a fainted / hidden battler moves its targets to the fixed coordinates): otherwise no plan.
      const bothBattlersShown = tracker.battlerSlots.player !== null && tracker.battlerSlots.opponent !== null && !hidden[0] && !hidden[1];
      if (mapped.event?.kind === "move-animation" && SPRITE_ORDER_GEOMETRY_KEYED_BODIES.has(mapped.event.moveId)
        && (mapped.event.moveId !== 258 || bothBattlersShown)) {
        const geometryPlan = bodyPlanAt?.(segmentIndex, events[index]!.sequence, mapped.event.moveId, mapped.event.attackerSide,
          spriteOrderTrackerLend(tracker) ?? undefined);
        if (geometryPlan !== undefined) mapped = { ...mapped, event: Object.freeze({ ...mapped.event, geometryPlan }) };
      }
      if (mapped.event?.kind === "general-animation" && SPRITE_ORDER_GEOMETRY_KEYED_ANIMS.has(mapped.event.animation) && bothBattlersShown) {
        const geometryPlan = bodyPlanAt?.(segmentIndex, events[index]!.sequence, 258, "player");
        if (geometryPlan !== undefined) mapped = { ...mapped, event: Object.freeze({ ...mapped.event, geometryPlan }) };
      }
      if (mapped.hidden) hidden = mapped.hidden;
      // RAIN_CONTINUES (General_Rain) is a words-dependent order unit: a marker keyed per event, whose activation is the known lend or
      // the pending words chain (prep46 s2). Word-free: the render seam reads its non-consuming sub-stream words by this key.
      let rainActivation: SpriteOrderDeferredLend["activation"] | undefined;
      if (mapped.event?.kind === "general-animation" && mapped.event.animation === WORDS_ORDER_GENERAL_ANIMATION) {
        const lend = spriteOrderTrackerLend(tracker);
        rainActivation = lend !== null ? Object.freeze({ free: lend })
          : deferred !== undefined && isWordsOrderDeferredUnit(deferred) ? Object.freeze({ deferred }) : undefined;
      }
      if (mapped.event) tracker = applySpriteOrderPresentationEvent(tracker, mapped.event);
      if (mapped.then) tracker = applySpriteOrderPresentationEvent(tracker, mapped.then);
      // Deferred lend: the marked body's own event starts it (the tracker invalidates there); later events are its units while the order is
      // unknown; a revived (known) tracker drops it.
      if (rainActivation !== undefined && !tracker.cursor.order.known) {
        const battler = events[index]!.payload.kind === "animation" ? (events[index]!.payload as { battler?: number }).battler : undefined;
        deferred = Object.freeze({
          key: generalAnimationPresentationRngKey(requestId, segmentIndex, events[index]!.sequence), moveId: 0,
          attackerSide: battler === 1 ? "opponent" as const : "player" as const, generalAnimation: WORDS_ORDER_GENERAL_ANIMATION,
          activation: rainActivation, units: Object.freeze([]) });
      } else if (mapped.event?.kind === "move-animation" && deferredBody !== undefined && mapped.event.moveId === deferredBodyOrderKey(deferredBody)
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
    apply(cursor.segmentIndex, events, cursor.nextEventIndex, Number.POSITIVE_INFINITY, false);
    cursor = { requestId, segmentIndex: cursor.segmentIndex + 1, nextEventIndex: 0, drained: false };
  }
  if (cursor.segmentIndex === resolution.segmentIndex) {
    const events = resolution.segments[cursor.segmentIndex]?.events ?? [];
    const nextEventIndex = apply(cursor.segmentIndex, events, cursor.nextEventIndex, throughSequence, before);
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
  // After a words-dependent order unit (Sand-Attack / Mud-Slap / Rain Dance / RAIN_CONTINUES / Dive / Ice Ball) ANY consumer takes it
  // (prep46; ice72), honouring POSTKO_LEND_EXCLUDED_MOVE_IDS.
  if (!host.tracker.cursor.order.known && host.deferred !== undefined
    && (moveId === host.deferred.moveId || isWordsOrderDeferredUnit(host.deferred))) {
    const { player, opponent } = host.tracker.battlerSlots;
    const atEntry = player === KNOWN_ENTRY_BATTLER_SLOTS.player && opponent === KNOWN_ENTRY_BATTLER_SLOTS.opponent;
    if (!atEntry && moveId !== undefined && POSTKO_LEND_EXCLUDED_MOVE_IDS.includes(moveId)) return undefined;
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
