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
 *   anything else                invalidate (party menu, switch, faint, summary, slide, substitute, transform, ...)
 *
 * A unit that leaves exactly one survivor (+-2 stat copy, SLP/PRZ/INFATUATION tails) gets its carried destroy
 * `D[c1,0]` applied at once: the carry lands before any other allocation (real-route ±2 carry 3/3 exact). Once
 * invalid the tracker stays invalid until a fresh known entry; it never guesses.
 */
import {
  KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, SPRITE_ORDER_SLOT_COUNT, applySpriteOrderUnitPlan, createSpriteOrderPlanCursor,
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
  | Readonly<{ kind: "invalidate"; reason: string }>;

export interface SpriteOrderTracker {
  readonly cursor: SpriteOrderPlanCursor;
  /** Bounce-pair slots while the action prompt is up (created, not yet destroyed). */
  readonly promptPair: readonly number[] | null;
  /** First reason the order became unknown (diagnostic only). */
  readonly invalidReason: string | null;
}

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

export function createSpriteOrderTracker(order: SpriteOrderState): SpriteOrderTracker {
  return Object.freeze({
    cursor: createSpriteOrderPlanCursor(order),
    promptPair: null,
    invalidReason: order.known ? null : "unknown entry",
  });
}

export function invalidateSpriteOrderTracker(tracker: SpriteOrderTracker, reason: string): SpriteOrderTracker {
  if (!tracker.cursor.order.known) return tracker;
  return Object.freeze({ cursor: applySpriteOrderUnitPlan(tracker.cursor, null), promptPair: null, invalidReason: reason });
}

function applyPlan(tracker: SpriteOrderTracker, plan: SpriteOrderPlan | null, label: string): SpriteOrderTracker {
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
  return Object.freeze({ ...tracker, cursor });
}

/** Apply one presentation event (pure). */
export function applySpriteOrderPresentationEvent(
  tracker: SpriteOrderTracker, event: SpriteOrderPresentationEvent,
): SpriteOrderTracker {
  if (!tracker.cursor.order.known) return tracker;
  switch (event.kind) {
    case "move-menu":
      return tracker;
    case "action-prompt": {
      if (tracker.promptPair !== null) return tracker;
      const cursor = applySpriteOrderUnitPlan(tracker.cursor, PROMPT_CREATE);
      if (!cursor.order.known) return invalidateSpriteOrderTracker(tracker, "prompt pair did not resolve");
      return Object.freeze({ ...tracker, cursor, promptPair: Object.freeze([...cursor.survivors[cursor.units - 1]!]) });
    }
    case "actions-committed": {
      if (tracker.promptPair === null) return invalidateSpriteOrderTracker(tracker, "actions committed without a prompt pair");
      const destroy: SpriteOrderPlan = [{
        D: tracker.promptPair.map(slot => ["o", slot] as const),
        pw: tracker.promptPair.map(() => PROMPT_PRIORITY_WORD),
      }];
      const cursor = applySpriteOrderUnitPlan(tracker.cursor, destroy);
      if (!cursor.order.known) return invalidateSpriteOrderTracker(tracker, "prompt pair destroy did not resolve");
      return Object.freeze({ ...tracker, cursor, promptPair: null });
    }
    case "move-animation":
      if (tracker.promptPair !== null) return invalidateSpriteOrderTracker(tracker, "body while the prompt pair lives");
      return applyPlan(tracker, spriteOrderProductionBodyPlan(event.moveId, event.attackerSide),
        `body ${event.moveId}:${event.attackerSide}`);
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
