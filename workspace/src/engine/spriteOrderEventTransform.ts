/**
 * Presentation-event transform of the free-slot `sSpriteOrder` (presentation-only; never touches rules or RNG).
 *
 * Implements the production rule table of docs/sprite-order-gap-causes.md §2, validated on real ordinary-Factory
 * battle histories by docs/sprite-order-real-route.md (strict replay: tests/spriteOrderEventTransform.test.ts):
 *
 *   action prompt shown          C[two lowest free] (DoBounceEffect pair; idempotent while the pair lives)
 *   actions committed            D[the pair, FDERIVED = F order at creation] (EndBounceEffect)
 *   move menu / cancel / cursor  no-op
 *   move-animation body          EXACT plan of (moveId, attacker side) from SPRITE_ORDER_PRODUCTION_BODIES, else invalidate
 *   hit-animation, target shown  blip: C[f]; D[n0] (DoHitAnimHealthboxEffect); a hidden target is unproven -> invalidate
 *   stat animation               +-1 / multiple: C[f]; D[n0]; +-2: C[f] and the carried D at the next boundary
 *   status animation             PSN / PRZ / SLP / INFATUATION plans; any other status -> invalidate
 *   general animation            HELD_ITEM_EFFECT / SUN_CONTINUES / FOCUS_PUNCH_SETUP plans; any other -> invalidate
 *   anything else                invalidate (substitute, transform, mid-battle slide, hidden battlers, ...)
 *
 * A body/animation unit that leaves exactly one survivor (+-2 stat copy, SLP/PRZ/INFATUATION tails) gets its carried
 * destroy `D[c1,0]` applied at once: the carry lands before any other allocation (real-route ±2 carry 3/3 exact).
 *
 * Battle units (docs/sprite-order-uncovered-units.md §2, plan texts = UNIT_PLANS of
 * tools/integration/spriteOrderUncoveredReplay.ts; their survivors are persistent sprites, never carried). The
 * tracker holds the battler sprite slot per side (entry: player 6, opponent 8; null = no tracked battler sprite) and
 * the last applied unit (adjacency guard, §2 rules (a)-(d)):
 *
 *   faint {side}                 D o<battler slot>; an unknown slot invalidates
 *   party-summary-next           Cfeeeeee (opponent next-mon summary; only after the opponent battler is gone)
 *   party-summary-hide           marker: must directly follow party-summary-next, no allocation
 *   next-mon-send-out            nextSendOut directly after party-summary-next; its single survivor = opponent battler
 *   switch-in-start / -finish    switchInStart (player battler gone, directly after a reshow or recall), then
 *                                switchInParticles directly after it; player battler = n1 of the start unit
 *   party-menu-reset             ResetSpriteData: identity F, empty occupancy, battler slots forgotten; revives an
 *                                invalid tracker (the one revive path)
 *   battle-reshow                directly after a reset: reshowBoth / reshowPlayerGone by playerBattlerPresent
 *   switch-out                   recall(player slot), PROVISIONAL (one instance); the live host never emits it
 *   trainer-slide-end            Cf (end-of-battle win slide)
 *
 * Any unit whose guard fails or whose plan does not resolve invalidates. Once invalid the tracker stays invalid
 * until a fresh known entry or a party-menu reset; it never guesses.
 */
import {
  KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, SPRITE_ORDER_SLOT_COUNT, applySpriteOrderUnitPlan, createSpriteOrderPlanCursor,
  initSpriteOrderState,
  type SpriteOrderPlan, type SpriteOrderPlanCursor, type SpriteOrderPlanToken, type SpriteOrderPlanWindow,
  type SpriteOrderState,
} from "./spriteOrderProvider.ts";
import {
  SPRITE_ORDER_PRODUCTION_ANIMS, SPRITE_ORDER_PRODUCTION_BODIES, SPRITE_ORDER_PRODUCTION_PLANS,
} from "./spriteOrderProductionPlans.ts";

export type SpriteOrderPresentationEvent =
  | Readonly<{ kind: "action-prompt" }>
  | Readonly<{ kind: "actions-committed" }>
  | Readonly<{ kind: "move-menu" }>
  | Readonly<{ kind: "move-animation"; moveId: number; attackerSide: "player" | "opponent" }>
  | Readonly<{ kind: "hit-animation"; targetVisible: boolean }>
  | Readonly<{ kind: "stat-animation"; argument: number }>
  | Readonly<{ kind: "status-animation"; status: string }>
  | Readonly<{ kind: "general-animation"; animation: string }>
  | Readonly<{ kind: "faint"; side: SpriteOrderSide }>
  | Readonly<{ kind: "party-summary-next" }>
  | Readonly<{ kind: "party-summary-hide" }>
  | Readonly<{ kind: "next-mon-send-out" }>
  | Readonly<{ kind: "switch-in-start" }>
  | Readonly<{ kind: "switch-in-finish" }>
  | Readonly<{ kind: "party-menu-reset" }>
  | Readonly<{ kind: "battle-reshow"; playerBattlerPresent: boolean }>
  | Readonly<{ kind: "switch-out" }>
  | Readonly<{ kind: "trainer-slide-end" }>
  | Readonly<{ kind: "invalidate"; reason: string }>;

export type SpriteOrderSide = "player" | "opponent";
export type SpriteOrderBattlerSlots = Readonly<{ player: number | null; opponent: number | null }>;
/** Last allocation unit applied (adjacency guard of the §2 unit pairs). */
export type SpriteOrderUnitKind =
  | "entry" | "prompt" | "commit" | "body" | "animation" | "faint" | "summary" | "send-out" | "switch-in-start"
  | "switch-in" | "reset" | "reshow" | "recall" | "trainer-slide";

export interface SpriteOrderTracker {
  readonly cursor: SpriteOrderPlanCursor;
  /** Bounce-pair slots while the action prompt is up (created, not yet destroyed). */
  readonly promptPair: readonly number[] | null;
  /** First reason the order became unknown (diagnostic only). */
  readonly invalidReason: string | null;
  /** Battler sprite slot per side; null = no tracked battler sprite (fainted, recalled, or forgotten at a reset). */
  readonly battlerSlots: SpriteOrderBattlerSlots;
  readonly lastUnit: SpriteOrderUnitKind;
}

/** Plan texts of the battle units (docs/sprite-order-uncovered-units.md §2 = UNIT_PLANS of
 * tools/integration/spriteOrderUncoveredReplay.ts, pinned equal by tests/spriteOrderBattleUnits.test.ts). */
export const SPRITE_ORDER_UNIT_PLAN_TEXTS = Object.freeze({
  summary: "Cfeeeeee",
  nextSendOut: "Cff;Cf;Dc1.6,c1.5,c1.4,c1.3,c1.2,c1.1,c1.0;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;D2;Cf;Cf;Cf;D0;D3;D4;D5;D6;D7;D8;D9;D10;D11;D12;D13;D14;D15;D16;D17;D18",
  switchInStart: "Cff;Cf",
  switchInParticles: "Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Dc1.2;Cf;Cf;Cf;Dc1.0;D0;D1;D2;D3;D4;D5;D6;D7;D8;D9;D10;D11;D12;D13;D14;D15",
  trainerSlide: "Cf",
  reshowPlayerGone: "Cf;Cfee;Cfee;Cf",
  reshowBoth: "Cf;Cf;Cfee;Cfee;Cf",
});
/** Provisional voluntary recall (one observed instance): 16 particles, the player battler freed with particle n2. */
export function spriteOrderRecallPlanText(battlerSlot: number): string {
  return `${"Cf;".repeat(16)}D0;D1;D2,o${battlerSlot};${Array.from({ length: 13 }, (_, i) => `D${i + 3}`).join(";")}`;
}
/** Battler sprite slots at the known entry (KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER: player 6, opponent 8). */
export const KNOWN_ENTRY_BATTLER_SLOTS: SpriteOrderBattlerSlots = Object.freeze({ player: 6, opponent: 8 });

/** Moves whose bodies hand the battler sprite to another graphics owner (§2 "substitute / transform"): invalidate. */
const OWNERSHIP_CHANGING_MOVES: ReadonlySet<number> = new Set([144, 164]);
const PROMPT_CREATE: SpriteOrderPlan = Object.freeze([{ C: [["n", 0, "f"], ["n", 1, "f"]] }]);
const BLIP: SpriteOrderPlan = Object.freeze([{ C: [["n", 0, "f"]] }, { D: [["n", 0]] }]);
const CARRY: SpriteOrderPlan = Object.freeze([{ D: [["c", 1, 0]] }]);
const PROMPT_PRIORITY_WORD = 782;

/** Inverse of tools/integration/spriteOrderProductionTable.ts `encodeSpriteOrderPlan`. */
export function decodeSpriteOrderPlan(text: string): SpriteOrderPlan {
  if (text === "") return Object.freeze([]);
  let made = 0;
  return Object.freeze(text.split(";").map(windowText => {
    const window: { C?: (readonly ["n", number, "f" | "e"])[]; D?: SpriteOrderPlanToken[]; pw?: number[] } = {};
    for (const part of windowText.split("/")) {
      const body = part.slice(1);
      if (part[0] === "C") {
        window.C = [...body].map(mode => {
          if (mode !== "f" && mode !== "e") throw new Error(`bad create mode ${mode}`);
          return Object.freeze(["n", made++, mode] as const);
        });
      } else if (part[0] === "D") {
        window.D = body.split(",").map(token => Object.freeze(token[0] === "c"
          ? ["c", Number(token.slice(1).split(".")[0]), Number(token.slice(1).split(".")[1])] as const
          : token[0] === "o" ? ["o", Number(token.slice(1))] as const : ["n", Number(token)] as const));
      } else if (part[0] === "P") {
        window.pw = body.split(",").map(Number);
      } else {
        throw new Error(`bad plan part ${part}`);
      }
    }
    return Object.freeze(window) as SpriteOrderPlanWindow;
  }));
}

const decoded = new Map<number, SpriteOrderPlan>();
function planAt(index: number | undefined): SpriteOrderPlan | null {
  if (index === undefined) return null;
  let plan = decoded.get(index);
  if (!plan) {
    const text = SPRITE_ORDER_PRODUCTION_PLANS[index];
    if (text === undefined) return null;
    plan = decodeSpriteOrderPlan(text);
    decoded.set(index, plan);
  }
  return plan;
}

/** EXACT body plan of `(moveId, attacker side)`, or null (NEEDS-KEYS / not observed / substitute / transform). */
export function spriteOrderProductionBodyPlan(moveId: number, side: "player" | "opponent"): SpriteOrderPlan | null {
  if (OWNERSHIP_CHANGING_MOVES.has(moveId)) return null;
  return planAt(Object.hasOwn(SPRITE_ORDER_PRODUCTION_BODIES, `${moveId}:${side}`)
    ? SPRITE_ORDER_PRODUCTION_BODIES[`${moveId}:${side}`] : undefined);
}

/** `B_ANIM_STATS_CHANGE` argument (STAT_ANIM_PLUS1/MINUS1 + stat 15..28, PLUS2/MINUS2 + stat 39..52, multiple
 * +1/-1 55/57). Multiple +-2 (56/58) is unobserved: null. */
export function spriteOrderStatAnimationPlan(argument: number): SpriteOrderPlan | null {
  const klass = (argument >= 15 && argument <= 28) || argument === 55 || argument === 57 ? 1
    : argument >= 39 && argument <= 52 ? 2 : null;
  return klass === null ? null : planAt(SPRITE_ORDER_PRODUCTION_ANIMS[`STATS_CHANGE_CLASS_${klass}`]);
}

/** `InitAndLaunchChosenStatusAnimation` (battle_anim.c) status -> `B_ANIM_STATUS_*` name; null = no animation. */
export function spriteOrderStatusAnimationName(isStatus2: boolean, status: number): string | null {
  if (!isStatus2) {
    if (status === 0x20) return "FRZ";
    if (status === 0x8 || (status & 0x80) !== 0) return "PSN";
    if (status === 0x10) return "BRN";
    if ((status & 0x7) !== 0) return "SLP";
    if (status === 0x40) return "PRZ";
    return null;
  }
  if ((status & 0x000f0000) !== 0) return "INFATUATION";
  if ((status & 0x7) !== 0) return "CONFUSION";
  if ((status & 0x10000000) !== 0) return "CURSED";
  if ((status & 0x08000000) !== 0) return "NIGHTMARE";
  if ((status & 0xe000) !== 0) return "WRAPPED";
  return null;
}

/**
 * Tracker at `order`. `battlerSlots` defaults to the known-entry battler sprites (player 6, opponent 8), each kept only
 * while that slot is occupied in `order` (a ResetSpriteData identity order therefore tracks no battler).
 */
export function createSpriteOrderTracker(
  order: SpriteOrderState, battlerSlots: SpriteOrderBattlerSlots = KNOWN_ENTRY_BATTLER_SLOTS,
): SpriteOrderTracker {
  const held = (slot: number | null) => slot !== null && order.known && !order.free.includes(slot) ? slot : null;
  return Object.freeze({
    cursor: createSpriteOrderPlanCursor(order),
    promptPair: null,
    invalidReason: order.known ? null : "unknown entry",
    battlerSlots: Object.freeze({ player: held(battlerSlots.player), opponent: held(battlerSlots.opponent) }),
    lastUnit: "entry",
  });
}

export function invalidateSpriteOrderTracker(tracker: SpriteOrderTracker, reason: string): SpriteOrderTracker {
  if (!tracker.cursor.order.known) return tracker;
  return Object.freeze({
    ...tracker, cursor: applySpriteOrderUnitPlan(tracker.cursor, null), promptPair: null, invalidReason: reason,
  });
}

function applyPlan(
  tracker: SpriteOrderTracker, plan: SpriteOrderPlan | null, label: string, unit: "body" | "animation" = "animation",
): SpriteOrderTracker {
  if (!tracker.cursor.order.known) return tracker;
  if (plan === null) return invalidateSpriteOrderTracker(tracker, `no EXACT plan: ${label}`);
  let cursor = applySpriteOrderUnitPlan(tracker.cursor, plan);
  if (!cursor.order.known) return invalidateSpriteOrderTracker(tracker, `plan did not resolve: ${label}`);
  const survivors = cursor.survivors[cursor.units - 1] ?? [];
  if (survivors.length > 1) return invalidateSpriteOrderTracker(tracker, `${survivors.length} survivors: ${label}`);
  if (survivors.length === 1) {
    cursor = applySpriteOrderUnitPlan(cursor, CARRY);
    if (!cursor.order.known) return invalidateSpriteOrderTracker(tracker, `carry did not resolve: ${label}`);
  }
  return Object.freeze({ ...tracker, cursor, lastUnit: unit });
}

const UNIT_PLANS: Readonly<Record<keyof typeof SPRITE_ORDER_UNIT_PLAN_TEXTS, SpriteOrderPlan>> = Object.freeze(
  Object.fromEntries(Object.entries(SPRITE_ORDER_UNIT_PLAN_TEXTS).map(([key, text]) => [key, decodeSpriteOrderPlan(text)])),
) as never;

/** Apply a battle unit's plan (its survivors are persistent sprites: no carry). Null when the plan does not resolve. */
function applyUnit(tracker: SpriteOrderTracker, plan: SpriteOrderPlan): SpriteOrderPlanCursor | null {
  const cursor = applySpriteOrderUnitPlan(tracker.cursor, plan);
  return cursor.order.known ? cursor : null;
}

function withUnit(
  tracker: SpriteOrderTracker, cursor: SpriteOrderPlanCursor, lastUnit: SpriteOrderUnitKind,
  battlerSlots: SpriteOrderBattlerSlots = tracker.battlerSlots,
): SpriteOrderTracker {
  return Object.freeze({ ...tracker, cursor, lastUnit, battlerSlots: Object.freeze({ ...battlerSlots }) });
}

const lastSurvivors = (cursor: SpriteOrderPlanCursor): readonly number[] => cursor.survivors[cursor.units - 1] ?? [];

function applyBattleUnit(
  tracker: SpriteOrderTracker,
  event: Exclude<SpriteOrderPresentationEvent, Readonly<{ kind: "action-prompt" | "actions-committed" | "move-menu"
    | "move-animation" | "hit-animation" | "stat-animation" | "status-animation" | "general-animation" | "invalidate"
    | "party-menu-reset" }>>,
): SpriteOrderTracker {
  const fail = (reason: string) => invalidateSpriteOrderTracker(tracker, reason);
  if (tracker.promptPair !== null) return fail(`${event.kind} while the prompt pair lives`);
  const slots = tracker.battlerSlots;
  switch (event.kind) {
    case "faint": {
      const slot = slots[event.side];
      if (slot === null) return fail(`faint of ${event.side}: battler slot unknown`);
      const cursor = applyUnit(tracker, [{ D: [["o", slot]] }]);
      return cursor ? withUnit(tracker, cursor, "faint", { ...slots, [event.side]: null }) : fail(`faint of ${event.side}: plan did not resolve`);
    }
    case "party-summary-next": {
      if (slots.opponent !== null) return fail("next-mon summary while the opponent battler is tracked");
      const cursor = applyUnit(tracker, UNIT_PLANS.summary);
      return cursor ? withUnit(tracker, cursor, "summary") : fail("next-mon summary: plan did not resolve");
    }
    case "party-summary-hide":
      return tracker.lastUnit === "summary" ? tracker : fail("summary hidden without the summary unit directly before it");
    case "next-mon-send-out": {
      if (tracker.lastUnit !== "summary") return fail("send-out without the summary unit directly before it");
      const cursor = applyUnit(tracker, UNIT_PLANS.nextSendOut);
      if (!cursor) return fail("send-out: plan did not resolve");
      const survivors = lastSurvivors(cursor);
      if (survivors.length !== 1) return fail(`send-out left ${survivors.length} survivors`);
      return withUnit(tracker, cursor, "send-out", { ...slots, opponent: survivors[0]! });
    }
    case "switch-in-start": {
      if (slots.player !== null) return fail("switch-in while the player battler is tracked");
      if (tracker.lastUnit !== "reshow" && tracker.lastUnit !== "recall") {
        return fail("switch-in without a reshow or recall directly before it");
      }
      const cursor = applyUnit(tracker, UNIT_PLANS.switchInStart);
      return cursor ? withUnit(tracker, cursor, "switch-in-start") : fail("switch-in start: plan did not resolve");
    }
    case "switch-in-finish": {
      if (tracker.lastUnit !== "switch-in-start") return fail("switch-in particles without the start unit directly before it");
      const battler = lastSurvivors(tracker.cursor)[1];
      const cursor = applyUnit(tracker, UNIT_PLANS.switchInParticles);
      if (!cursor || battler === undefined) return fail("switch-in particles: plan did not resolve");
      return withUnit(tracker, cursor, "switch-in", { ...slots, player: battler });
    }
    case "battle-reshow": {
      if (tracker.lastUnit !== "reset") return fail("reshow without a party-menu reset directly before it");
      const cursor = applyUnit(tracker, event.playerBattlerPresent ? UNIT_PLANS.reshowBoth : UNIT_PLANS.reshowPlayerGone);
      if (!cursor) return fail("reshow: plan did not resolve");
      const survivors = lastSurvivors(cursor);
      return withUnit(tracker, cursor, "reshow", event.playerBattlerPresent
        ? { player: survivors[0]!, opponent: survivors[1]! } : { player: null, opponent: survivors[0]! });
    }
    case "switch-out": {
      if (slots.player === null) return fail("recall: player battler slot unknown");
      const cursor = applyUnit(tracker, decodeSpriteOrderPlan(spriteOrderRecallPlanText(slots.player)));
      return cursor ? withUnit(tracker, cursor, "recall", { ...slots, player: null }) : fail("recall: plan did not resolve");
    }
    case "trainer-slide-end": {
      const cursor = applyUnit(tracker, UNIT_PLANS.trainerSlide);
      return cursor ? withUnit(tracker, cursor, "trainer-slide") : fail("trainer slide: plan did not resolve");
    }
  }
}

/** Apply one presentation event (pure). */
export function applySpriteOrderPresentationEvent(
  tracker: SpriteOrderTracker, event: SpriteOrderPresentationEvent,
): SpriteOrderTracker {
  // ResetSpriteData: identity order, nothing allocated, no battler tracked (rule (d): revives an invalid tracker).
  if (event.kind === "party-menu-reset") {
    return Object.freeze({
      ...createSpriteOrderTracker(initSpriteOrderState(), { player: null, opponent: null }), lastUnit: "reset",
    });
  }
  if (!tracker.cursor.order.known) return tracker;
  switch (event.kind) {
    case "move-menu":
      return tracker;
    case "action-prompt": {
      if (tracker.promptPair !== null) return tracker;
      const cursor = applySpriteOrderUnitPlan(tracker.cursor, PROMPT_CREATE);
      if (!cursor.order.known) return invalidateSpriteOrderTracker(tracker, "prompt pair did not resolve");
      return Object.freeze({
        ...tracker, cursor, promptPair: Object.freeze([...cursor.survivors[cursor.units - 1]!]), lastUnit: "prompt",
      });
    }
    case "actions-committed": {
      if (tracker.promptPair === null) return invalidateSpriteOrderTracker(tracker, "actions committed without a prompt pair");
      const destroy: SpriteOrderPlan = [{
        D: tracker.promptPair.map(slot => ["o", slot] as const),
        pw: tracker.promptPair.map(() => PROMPT_PRIORITY_WORD),
      }];
      const cursor = applySpriteOrderUnitPlan(tracker.cursor, destroy);
      if (!cursor.order.known) return invalidateSpriteOrderTracker(tracker, "prompt pair destroy did not resolve");
      return Object.freeze({ ...tracker, cursor, promptPair: null, lastUnit: "commit" });
    }
    case "move-animation":
      if (tracker.promptPair !== null) return invalidateSpriteOrderTracker(tracker, "body while the prompt pair lives");
      return applyPlan(tracker, spriteOrderProductionBodyPlan(event.moveId, event.attackerSide),
        `body ${event.moveId}:${event.attackerSide}`, "body");
    case "hit-animation":
      return event.targetVisible ? applyPlan(tracker, BLIP, "hit-animation blip")
        : invalidateSpriteOrderTracker(tracker, "hit-animation on a hidden target (unproven)");
    case "stat-animation":
      return applyPlan(tracker, spriteOrderStatAnimationPlan(event.argument), `stat animation ${event.argument}`);
    case "status-animation":
      return applyPlan(tracker, planAt(SPRITE_ORDER_PRODUCTION_ANIMS[`STATUS_${event.status}`]),
        `status animation ${event.status}`);
    case "general-animation":
      return applyPlan(tracker, event.animation.startsWith("STAT") || event.animation.startsWith("STATUS_") ? null
        : planAt(Object.hasOwn(SPRITE_ORDER_PRODUCTION_ANIMS, event.animation)
          ? SPRITE_ORDER_PRODUCTION_ANIMS[event.animation] : undefined),
      `general animation ${event.animation}`);
    case "invalidate":
      return invalidateSpriteOrderTracker(tracker, event.reason);
    default:
      return applyBattleUnit(tracker, event);
  }
}

const KNOWN_ENTRY_OCCUPIED: readonly number[] = Object.freeze(Array.from(
  { length: SPRITE_ORDER_SLOT_COUNT }, (_, slot) => slot,
).filter(slot => !KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER.includes(slot)));

/**
 * Order lent to a move body at its activation edge: known, no prompt pair alive, and allocator occupancy equal to
 * the known-entry occupants (every modelled unit is occupancy-net-zero, so consumers' lowest-free allocation slots
 * and the occupied prefix stay the known-entry ones). Otherwise null (consumers decline).
 */
export function spriteOrderTrackerLend(tracker: SpriteOrderTracker): readonly number[] | null {
  const { order, occupied } = tracker.cursor;
  if (!order.known || tracker.promptPair !== null) return null;
  if (occupied.length !== KNOWN_ENTRY_OCCUPIED.length || occupied.some((slot, index) => slot !== KNOWN_ENTRY_OCCUPIED[index])) {
    return null;
  }
  return order.free;
}

/**
 * Post-unit view for the next rung (NOT used to lend yet): the tracked free order, the model's own allocator
 * occupancy and the battler sprite slots. Null when the order is unknown or the action-prompt pair is alive.
 */
export function spriteOrderTrackerPostUnitView(tracker: SpriteOrderTracker): Readonly<{
  free: readonly number[]; occupied: readonly number[]; battlerSlots: SpriteOrderBattlerSlots;
}> | null {
  const { order, occupied } = tracker.cursor;
  if (!order.known || tracker.promptPair !== null) return null;
  return Object.freeze({ free: order.free, occupied, battlerSlots: tracker.battlerSlots });
}
