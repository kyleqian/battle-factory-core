// Strict replay of the production presentation-event transform (src/engine/spriteOrderEventTransform.ts) over the real
// ordinary-Factory battle-1 event lists (tools/integration/fixtures/sprite-order-real-route/events/*.json,
// docs/sprite-order-real-route.md). STRICT: starts at knownEntrySpriteOrderState("ordinary-factory"), never re-seeds from
// the ROM; every edge (move body / mid-battle animation activation) compares the predicted free order F and allocator
// occupancy with the ROM-observed ones. Optional "resync" re-seeds after each invalidation (rule test in isolation).
import { readFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, spriteOrderTrackerLend,
  type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { createSpriteOrderPlanCursor, knownEntrySpriteOrderState, type SpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";

export const REAL_ROUTE_TRACES = [
  "battle1-turn17-dense", "battle1-switch", "battle1-turn2-dragonbreath", "battle1-grovyle-faint", "battle1-victory",
] as const;

interface Ev { n: number; k: string; [key: string]: unknown }
export interface CrossBodyEdge {
  frame: number; kind: "move" | "anim"; key: string; known: boolean; lent: boolean; exact: boolean | null;
  occupiedMatch: boolean | null; trivial: boolean;
}
const GENERAL = new Map<number, string>([[7, "HELD_ITEM_EFFECT"], [11, "SUN_CONTINUES"], [13, "HAIL_CONTINUES"], [6, "TURN_TRAP"], [20, "FOCUS_PUNCH_SETUP"]]);
const STATUS = new Map<number, string>([[0, "PSN"], [1, "CONFUSION"], [2, "BRN"], [3, "INFATUATION"], [4, "SLP"], [5, "PRZ"], [6, "FRZ"], [7, "CURSED"], [8, "NIGHTMARE"]]);
const maskSlots = (mask: string) => {
  const bits = BigInt(`0x${mask}`);
  return Array.from({ length: 64 }, (_, slot) => slot).filter(slot => (bits >> BigInt(slot)) & 1n);
};
const same = (left: readonly number[], right: readonly number[]) => JSON.stringify(left) === JSON.stringify(right);

function animEvent(table: string, id: number, arg: number | null): SpriteOrderPresentationEvent {
  if (table === "gBattleAnims_General" && id === 1 && arg !== null) return { kind: "stat-animation", argument: arg };
  if (table === "gBattleAnims_General") return { kind: "general-animation", animation: GENERAL.get(id) ?? `GENERAL_${id}` };
  if (table === "gBattleAnims_StatusConditions") return { kind: "status-animation", status: STATUS.get(id) ?? `STATUS_${id}` };
  return { kind: "invalidate", reason: `unknown animation table ${table}` };
}

export function replayCrossBodyTrace(trace: string, mode: "strict" | "resync" = "strict") {
  const doc = JSON.parse(readFileSync(new URL(`./fixtures/sprite-order-real-route/events/${trace}.json`, import.meta.url), "utf8"));
  const events: Ev[] = doc.events;
  let tracker: SpriteOrderTracker = createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
  // Rows start at the battle ResetSpriteData; the known entry stream ends at the first prompt (docs/sprite-order-real-route.md §1).
  const entryEnd = events.find(e => e.k === "prompt" || e.k === "body" || e.k === "anim")!.n;
  const edges: CrossBodyEdge[] = [];
  const invalidations: { frame: number; reason: string }[] = [];
  let seededAt: Ev | null = null;
  const step = (e: Ev, event: SpriteOrderPresentationEvent) => {
    const before = tracker.cursor.order.known;
    tracker = applySpriteOrderPresentationEvent(tracker, event);
    if (before && !tracker.cursor.order.known) invalidations.push({ frame: e.n, reason: tracker.invalidReason ?? "" });
  };
  const resync = (e: Ev, free: number[], mask: string) => {
    seededAt = e;
    tracker = createSpriteOrderTracker({ known: true, free, pendingDestroyed: [] } as SpriteOrderState);
    tracker = { ...tracker, cursor: createSpriteOrderPlanCursor(tracker.cursor.order, maskSlots(mask)) };
  };
  for (let index = 0; index < events.length; index += 1) {
    const e = events[index]!;
    const next = events[index + 1];
    if (e.n <= entryEnd && e.k === "uncovered") continue;
    if (e.k === "prompt") {
      step(e, { kind: "action-prompt" });
      step(e, { kind: "actions-committed" });
    } else if (e.k === "blip") {
      step(e, { kind: "hit-animation", targetVisible: true });
    } else if (e.k === "body" || e.k === "anim") {
      const isBody = e.k === "body";
      const known = tracker.cursor.order.known;
      const observedFree = e.obsF as number[];
      const observedOccupied = maskSlots(e.obsMask as string);
      edges.push({
        frame: e.n, kind: isBody ? "move" : "anim", key: isBody ? `${e.move}:${e.side}` : `${e.table}:${e.id}:${e.arg}`,
        known, lent: spriteOrderTrackerLend(tracker) !== null,
        exact: known ? same(tracker.cursor.order.free, observedFree) : null,
        occupiedMatch: known ? same(tracker.cursor.occupied, observedOccupied) : null, trivial: seededAt === e,
      });
      if (mode === "resync" && !known) resync(e, observedFree, e.obsMask as string);
      step(e, isBody
        ? { kind: "move-animation", moveId: e.move as number, attackerSide: e.side as "player" | "opponent" }
        : animEvent(e.table as string, e.id as number, (e.arg as number | null) ?? null));
      if (mode === "resync" && !tracker.cursor.order.known && next) resync(next, next.preF as number[], next.preMask as string);
    } else {
      step(e, { kind: "invalidate", reason: `${e.k}${e.k === "uncovered" ? `: ${String(e.main)}` : ""}` });
      if (mode === "resync" && e.k === "uncovered") resync({ ...e, n: e.last as number }, e.obsF as number[], e.obsMask as string);
    }
  }
  const count = (list: CrossBodyEdge[]) => ({
    edges: list.length, known: list.filter(edge => edge.known).length,
    tested: list.filter(edge => edge.known && !edge.trivial).length,
    exact: list.filter(edge => edge.exact === true && !edge.trivial).length,
    mismatched: list.filter(edge => edge.exact === false && !edge.trivial).length,
    occupiedMismatch: list.filter(edge => edge.occupiedMatch === false && !edge.trivial).length,
    lent: list.filter(edge => edge.lent).length,
  });
  return {
    trace, mode, moveEdges: count(edges.filter(edge => edge.kind === "move")),
    animEdges: count(edges.filter(edge => edge.kind === "anim")), firstInvalidation: invalidations[0] ?? null, invalidations, edges,
  };
}
