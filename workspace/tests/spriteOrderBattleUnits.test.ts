import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  KNOWN_ENTRY_BATTLER_SLOTS, SPRITE_ORDER_UNIT_PLAN_TEXTS, applySpriteOrderPresentationEvent, createSpriteOrderTracker,
  invalidateSpriteOrderTracker, spriteOrderRecallPlanText, spriteOrderTrackerLend, spriteOrderTrackerPostUnitView,
  type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { LAB_TRACES, ROUTE_TRACES, UNIT_PLANS, replay } from "../tools/integration/spriteOrderUncoveredReplay.ts";

// The PRODUCTION transform (src/engine/spriteOrderEventTransform.ts battle units, docs/sprite-order-uncovered-units.md §2)
// driven by the ROM evidence event streams (tools/integration/fixtures/sprite-order-uncovered/events) reproduces the
// strict replay receipt (replay-receipt.json, mode "modelled", not isolated) edge for edge. Only production events are
// used: no ROM re-seed, no body overrides, battler slots held by the tracker itself.
const FX = new URL("../tools/integration/fixtures/sprite-order-uncovered/", import.meta.url);
interface Ev { n: number; k: string; [key: string]: unknown }
type Side = "player" | "opponent";
const maskSlots = (mask: string) => {
  const bits = BigInt(`0x${mask}`);
  return Array.from({ length: 64 }, (_, slot) => slot).filter(slot => (bits >> BigInt(slot)) & 1n);
};
const same = (a: readonly number[], b: readonly number[]) => JSON.stringify(a) === JSON.stringify(b);
const GENERAL = new Map<number, string>([[7, "HELD_ITEM_EFFECT"], [11, "SUN_CONTINUES"], [13, "HAIL_CONTINUES"], [6, "TURN_TRAP"], [20, "FOCUS_PUNCH_SETUP"]]);
const STATUS = new Map<number, string>([[0, "PSN"], [1, "CONFUSION"], [2, "BRN"], [3, "INFATUATION"], [4, "SLP"], [5, "PRZ"], [6, "FRZ"], [7, "CURSED"], [8, "NIGHTMARE"]]);
function animEvent(table: string, id: number, arg: number | null): SpriteOrderPresentationEvent {
  if (table === "gBattleAnims_General" && id === 1 && arg !== null) return { kind: "stat-animation", argument: arg };
  if (table === "gBattleAnims_General") return { kind: "general-animation", animation: GENERAL.get(id) ?? `GENERAL_${id}` };
  if (table === "gBattleAnims_StatusConditions") return { kind: "status-animation", status: STATUS.get(id) ?? `STATUS_${id}` };
  return { kind: "invalidate", reason: `unknown animation table ${table}` };
}

/** Production events of one evidence unit (`recall` = the provisional switch-out event the live host never emits). */
function unitEvents(klass: string, playerPresent: boolean, recall: boolean): SpriteOrderPresentationEvent[] | null {
  if (klass === "faint-opponent" || klass === "faint-player") return [{ kind: "faint", side: klass.slice(6) as Side }];
  if (klass === "U2-next-mon-summary") return [{ kind: "party-summary-next" }];
  if (klass === "U3-next-mon-sendout") return [{ kind: "party-summary-hide" }, { kind: "next-mon-send-out" }];
  if (klass === "U4a-switchin-ball-start") return [{ kind: "switch-in-start" }];
  if (klass === "U4b-switchin-ball-particles") return [{ kind: "switch-in-finish" }];
  if (klass === "U5-party-menu") return []; // menu contents: erased by the exit reset (the next `reset` event)
  if (klass === "U6-battle-reshow") return [{ kind: "battle-reshow", playerBattlerPresent: playerPresent }];
  if (klass === "U7-end-trainer-slide") return [{ kind: "trainer-slide-end" }];
  if (klass === "U8-recall-switch-out") return [recall ? { kind: "switch-out" } : { kind: "invalidate", reason: "return to ball" }];
  return null;
}

/** `recall`: model the provisional voluntary recall (the receipt does); false = the live host's behaviour (invalidate). */
export function productionReplay(name: string, recall = true) {
  const events: Ev[] = JSON.parse(readFileSync(new URL(`./events/${name.replace(":", "-")}.json`, FX), "utf8")).events;
  let tracker: SpriteOrderTracker = createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
  let playerPresent = true; // from the event stream only (the host derives it from faint / switch-in events)
  const entryEnd = events.find(e => e.k === "prompt" || e.k === "body" || e.k === "anim" || e.k === "prompt-unterminated")!.n;
  const edges: { frame: number; kind: "move" | "anim"; known: boolean; exact: boolean | null; occupiedMatch: boolean | null }[] = [];
  const unitChecks: { frame: number; unit: string; exact: boolean; occupiedMatch: boolean }[] = [];
  const apply = (event: SpriteOrderPresentationEvent) => { tracker = applySpriteOrderPresentationEvent(tracker, event); };
  const check = (frame: number, unit: string, obsF: number[], obsMask: string) => {
    if (tracker.cursor.order.known) unitChecks.push({ frame, unit, exact: same(tracker.cursor.order.free, obsF), occupiedMatch: same(tracker.cursor.occupied, maskSlots(obsMask)) });
  };
  for (let index = 0; index < events.length; index += 1) {
    const e = events[index]!;
    const next = events[index + 1];
    if (e.n <= entryEnd && e.k === "uncovered") continue;
    const klass = String(e.unitClass ?? "");
    if (e.k === "prompt") {
      apply({ kind: "action-prompt" });
      apply({ kind: "actions-committed" });
    } else if (e.k === "blip") {
      apply({ kind: "hit-animation", targetVisible: true });
    } else if (e.k === "body" || e.k === "anim") {
      const known = tracker.cursor.order.known;
      edges.push({ frame: e.n, kind: e.k === "body" ? "move" : "anim", known, exact: known ? same(tracker.cursor.order.free, e.obsF as number[]) : null,
        occupiedMatch: known ? same(tracker.cursor.occupied, maskSlots(e.obsMask as string)) : null });
      if (e.k === "anim" && klass === "U8-recall-switch-out") {
        unitEvents(klass, playerPresent, recall)!.forEach(apply);
        playerPresent = false;
        if (next) check(e.n, klass, next.preF as number[], next.preMask as string);
      } else apply(e.k === "body" ? { kind: "move-animation", moveId: e.move as number, attackerSide: e.side as Side }
        : animEvent(e.table as string, e.id as number, (e.arg as number | null) ?? null));
    } else if (e.k === "prompt-unterminated") {
      apply({ kind: "action-prompt" }); // the bounce pair's create half (party menu opened over the prompt / trace end)
    } else if (e.k === "reset") {
      apply({ kind: "party-menu-reset" });
    } else if (e.k === "uncovered") {
      if (klass.startsWith("other:HandleTurnActionSelectionState")) continue; // = the prompt-unterminated event
      const mapped = unitEvents(klass, playerPresent, recall);
      if (mapped === null) { apply({ kind: "invalidate", reason: `uncovered unit class ${klass}` }); continue; }
      mapped.forEach(apply);
      if (klass === "faint-player") playerPresent = false;
      if (klass === "U4b-switchin-ball-particles") playerPresent = true;
      if (klass !== "U5-party-menu") check(e.n, klass, e.obsF as number[], e.obsMask as string);
    } else {
      apply({ kind: "invalidate", reason: e.k });
    }
  }
  return { trace: name, edges, unitChecks, tracker };
}

const names = [...ROUTE_TRACES, ...LAB_TRACES.map(name => `lab:${name}`)];
const receipt = JSON.parse(readFileSync(new URL("replay-receipt.json", FX), "utf8")) as {
  results: { trace: string; mode: string; isolated: boolean; edges: { frame: number; kind: string; known: boolean; exact: boolean | null; occupiedMatch: boolean | null }[];
    unitCheckRows: { frame: number; unit: string; exact: boolean; occupiedMatch: boolean }[] }[];
};
function totals(pick: (name: string) => boolean, recall = true) {
  const rows = names.filter(pick).map(name => productionReplay(name, recall));
  const moves = rows.flatMap(row => row.edges.filter(edge => edge.kind === "move"));
  const anims = rows.flatMap(row => row.edges.filter(edge => edge.kind === "anim"));
  const units = rows.flatMap(row => row.unitChecks);
  return {
    edges: moves.length, known: moves.filter(edge => edge.known).length, exact: moves.filter(edge => edge.exact === true).length,
    mismatched: moves.filter(edge => edge.exact === false).length, occupiedMismatch: [...moves, ...anims].filter(edge => edge.occupiedMatch === false).length,
    animKnown: anims.filter(edge => edge.known).length, animMismatched: anims.filter(edge => edge.exact === false).length,
    units: units.length, unitExact: units.filter(row => row.exact).length, unitOccupiedMismatch: units.filter(row => !row.occupiedMatch).length,
  };
}

describe("production sprite-order battle units (faint / summary / send-out / switch-in / party menu / reshow / slide)", () => {
  it("unit plan texts are the evidence replay's UNIT_PLANS", () => {
    const { recall, ...texts } = UNIT_PLANS;
    expect(SPRITE_ORDER_UNIT_PLAN_TEXTS).toEqual(texts);
    for (const slot of [0, 5, 6]) expect(spriteOrderRecallPlanText(slot)).toBe(recall(slot));
    expect(KNOWN_ENTRY_BATTLER_SLOTS).toEqual({ player: 6, opponent: 8 });
  });

  it("strict evidence streams reproduce the replay edge for edge (route 84/84/0, lab 25/25/0, units 18/18 + 18/18)", () => {
    for (const name of names) {
      // Same production body table as the evidence replay tool (strict, "modelled", not isolated).
      const row = replay(name, "modelled");
      const ours = productionReplay(name);
      expect(ours.edges, name).toEqual(row.edges.map(({ frame, kind, known, exact, occupiedMatch }) => ({ frame, kind, known, exact, occupiedMatch })));
      expect(ours.unitChecks, name).toEqual(row.unitCheckRows.map(({ frame, unit, exact, occupiedMatch }) => ({ frame, unit, exact, occupiedMatch })));
      // Against the committed receipt: identical, except anim edges the grown production body table now keeps known (exact).
      const committed = receipt.results.find(result => result.trace === name && result.mode === "modelled" && !result.isolated)!;
      ours.edges.forEach((edge, index) => {
        const old = committed.edges[index]!;
        expect(edge.frame, name).toBe(old.frame);
        if (old.known) expect({ known: edge.known, exact: edge.exact, occupiedMatch: edge.occupiedMatch }, `${name}@${edge.frame}`).toEqual({ known: true, exact: old.exact, occupiedMatch: old.occupiedMatch });
        else if (edge.known) expect({ kind: edge.kind, exact: edge.exact, occupiedMatch: edge.occupiedMatch }, `${name}@${edge.frame}`).toEqual({ kind: "anim", exact: true, occupiedMatch: true });
      });
      expect(ours.unitChecks, name).toEqual(committed.unitCheckRows.map(({ frame, unit, exact, occupiedMatch }) => ({ frame, unit, exact, occupiedMatch })));
    }
    const route = (name: string) => !name.startsWith("lab:");
    // Receipt: route animKnown 22 (turn17 BRN anim at 21412 is now known + exact: 7:player joined the production table after the receipt).
    expect(totals(route)).toEqual({ edges: 91, known: 84, exact: 84, mismatched: 0, occupiedMismatch: 0, animKnown: 23, animMismatched: 0, units: 18, unitExact: 18, unitOccupiedMismatch: 0 });
    expect(totals(name => !route(name))).toEqual({ edges: 27, known: 25, exact: 25, mismatched: 0, occupiedMismatch: 0, animKnown: 6, animMismatched: 0, units: 18, unitExact: 18, unitOccupiedMismatch: 0 });
    // The live host keeps the voluntary recall invalidating (provisional): only issue135's two post-recall bodies drop.
    expect(totals(name => !route(name), false)).toMatchObject({ edges: 27, known: 23, exact: 23, mismatched: 0, occupiedMismatch: 0 });
  });

  it("battler slots follow the units: send-out battler 5, reshow opponent 0, forced switch-in player 5 (doc §1.2)", () => {
    let tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
    const apply = (...events: SpriteOrderPresentationEvent[]) => { for (const event of events) tracker = applySpriteOrderPresentationEvent(tracker, event); };
    apply({ kind: "faint", side: "opponent" }, { kind: "party-summary-next" }, { kind: "party-summary-hide" }, { kind: "next-mon-send-out" });
    expect(tracker.battlerSlots).toEqual({ player: 6, opponent: 5 });
    expect(spriteOrderTrackerPostUnitView(tracker)).toMatchObject({ occupied: [0, 1, 2, 5, 6, 60, 61, 62, 63], battlerSlots: { player: 6, opponent: 5 } });
    expect(spriteOrderTrackerLend(tracker)).toBeNull(); // lend gate unchanged: occupancy is not the known entry's
    apply({ kind: "faint", side: "player" }, { kind: "party-menu-reset" }, { kind: "party-menu-reset" }, { kind: "battle-reshow", playerBattlerPresent: false });
    expect(tracker.battlerSlots).toEqual({ player: null, opponent: 0 });
    expect(tracker.cursor.occupied).toEqual([0, 1, 2, 3, 60, 61, 62, 63]);
    apply({ kind: "switch-in-start" }, { kind: "switch-in-finish" });
    expect(tracker.battlerSlots).toEqual({ player: 5, opponent: 0 });
    expect(tracker.cursor.occupied).toEqual([0, 1, 2, 3, 5, 60, 61, 62, 63]);
  });

  it("adjacency guard: send-out without the summary, faint with an unknown battler slot, and unguarded units invalidate; a reset revives", () => {
    const entry = () => createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
    const run = (tracker: SpriteOrderTracker, ...events: SpriteOrderPresentationEvent[]) => events.reduce(applySpriteOrderPresentationEvent, tracker);
    // send-out without a summary directly before it
    expect(run(entry(), { kind: "faint", side: "opponent" }, { kind: "next-mon-send-out" }).cursor.order.known).toBe(false);
    expect(run(entry(), { kind: "faint", side: "opponent" }, { kind: "party-summary-next" }, { kind: "hit-animation", targetVisible: true },
      { kind: "next-mon-send-out" }).invalidReason).toBe("send-out without the summary unit directly before it");
    expect(run(entry(), { kind: "faint", side: "opponent" }, { kind: "party-summary-hide" }).cursor.order.known).toBe(false);
    // next-mon summary while the opponent battler is still tracked
    expect(run(entry(), { kind: "party-summary-next" }).cursor.order.known).toBe(false);
    // faint with an unknown battler slot (twice, or after a reset without a reshow)
    expect(run(entry(), { kind: "faint", side: "opponent" }, { kind: "faint", side: "opponent" }).invalidReason).toBe("faint of opponent: battler slot unknown");
    expect(run(entry(), { kind: "party-menu-reset" }, { kind: "faint", side: "player" }).cursor.order.known).toBe(false);
    // switch-in particles without the start; switch-in start while the player battler is tracked / not after a reshow
    expect(run(entry(), { kind: "switch-in-finish" }).cursor.order.known).toBe(false);
    expect(run(entry(), { kind: "switch-in-start" }).cursor.order.known).toBe(false);
    expect(run(entry(), { kind: "party-menu-reset" }, { kind: "switch-in-start" }).cursor.order.known).toBe(false);
    // reshow not directly after a reset; a unit while the prompt pair lives
    expect(run(entry(), { kind: "battle-reshow", playerBattlerPresent: true }).cursor.order.known).toBe(false);
    expect(run(entry(), { kind: "action-prompt" }, { kind: "faint", side: "opponent" }).cursor.order.known).toBe(false);
    // reset revives an invalid tracker: identity order, empty occupancy, no battler tracked
    const revived = run(invalidateSpriteOrderTracker(entry(), "test"), { kind: "party-menu-reset" });
    expect(revived.cursor.order.known).toBe(true);
    expect(revived.cursor.order.free).toEqual(Array.from({ length: 64 }, (_, slot) => slot));
    expect(revived.cursor.occupied).toEqual([]);
    expect(revived.battlerSlots).toEqual({ player: null, opponent: null });
    expect(revived.invalidReason).toBeNull();
    expect(spriteOrderTrackerPostUnitView(run(revived, { kind: "battle-reshow", playerBattlerPresent: true })))
      .toEqual({ free: expect.any(Array), occupied: [0, 1, 2, 3, 4, 60, 61, 62, 63], battlerSlots: { player: 0, opponent: 1 } });
    expect(spriteOrderTrackerPostUnitView(invalidateSpriteOrderTracker(entry(), "test"))).toBeNull();
    // outcome-style invalidation still sticks until a reset
    expect(run(entry(), { kind: "invalidate", reason: "outcome" }, { kind: "trainer-slide-end" }).cursor.order.known).toBe(false);
  });
});
