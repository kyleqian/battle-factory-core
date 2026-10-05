// Pure-transform replays with the rely rows (fixtures/sprite-order-body-plans-rely.json) added as body-plan overrides, over (a) the policy-gaps ROM event
// streams (Endeavor/Fake Tears/stat moves, fixtures/sprite-order-policy-gaps/events) and (b) the STRICT real-route replay (5 canonical battle-1 traces,
// docs/sprite-order-real-route.md): move/anim edges known / exact / mismatched, per override set. 0 mismatches required.
// Same replay core as tools/integration/spriteOrderPolicyGapsReplay.ts (copied: that file does not export it).
//   run: node --experimental-strip-types tools/integration/spriteOrderRelYReplay.ts [--write]   -> fixtures/sprite-order-rely/replay-receipt-ts.json
import { readFileSync, writeFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, invalidateSpriteOrderTracker, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, knownEntrySpriteOrderState, type SpriteOrderPlan } from "../../src/engine/spriteOrderProvider.ts";
import { REAL_ROUTE_TRACES, replayCrossBodyTrace } from "./spriteOrderCrossBodyReplay.ts";

const FX = new URL("./fixtures/", import.meta.url);
const read = (rel: string) => JSON.parse(readFileSync(new URL(rel, FX), "utf8"));
const same = (a: readonly number[], b: readonly number[]) => JSON.stringify(a) === JSON.stringify(b);
const STATUS: Record<number, string> = { 0: "PSN", 1: "CONFUSION", 2: "BRN", 3: "INFATUATION", 4: "SLP", 5: "PRZ", 6: "FRZ", 7: "CURSED", 8: "NIGHTMARE" };
const GENERAL: Record<number, string> = { 7: "HELD_ITEM_EFFECT", 11: "SUN_CONTINUES", 13: "HAIL_CONTINUES", 6: "TURN_TRAP", 20: "FOCUS_PUNCH_SETUP" };
type Overrides = ReadonlyMap<string, SpriteOrderPlan>;
interface Ev { n: number; k: "prompt" | "blip" | "body" | "anim" | "invalidate"; reason?: string; move?: number; side?: "player" | "opponent"; obsF?: number[]; table?: string; id?: number | null; arg?: number | null }

function applyOverridePlan(tracker: SpriteOrderTracker, plan: SpriteOrderPlan, label: string): SpriteOrderTracker {
  if (!tracker.cursor.order.known) return tracker;
  if (tracker.promptPair !== null) return invalidateSpriteOrderTracker(tracker, "body while the prompt pair lives");
  let cursor = applySpriteOrderUnitPlan(tracker.cursor, plan);
  if (!cursor.order.known) return invalidateSpriteOrderTracker(tracker, `plan did not resolve: ${label}`);
  const survivors = cursor.survivors[cursor.units - 1] ?? [];
  if (survivors.length > 1) return invalidateSpriteOrderTracker(tracker, `${survivors.length} survivors: ${label}`);
  if (survivors.length === 1) {
    cursor = applySpriteOrderUnitPlan(cursor, [{ D: [["c", 1, 0]] }]);
    if (!cursor.order.known) return invalidateSpriteOrderTracker(tracker, `carry did not resolve: ${label}`);
  }
  return Object.freeze({ ...tracker, cursor });
}

function presentationOf(e: Ev): SpriteOrderPresentationEvent {
  if (e.k === "body") return { kind: "move-animation", moveId: e.move!, attackerSide: e.side! };
  if (e.k === "blip") return { kind: "hit-animation", targetVisible: true };
  if (e.table === "gBattleAnims_General" && e.id === 1 && e.arg != null) return { kind: "stat-animation", argument: e.arg };
  if (e.table === "gBattleAnims_General") return { kind: "general-animation", animation: GENERAL[e.id ?? -1] ?? `GENERAL_${e.id}` };
  if (e.table === "gBattleAnims_StatusConditions") return { kind: "status-animation", status: STATUS[e.id ?? -1] ?? `STATUS_${e.id}` };
  return { kind: "invalidate", reason: `unknown animation ${e.table}` };
}

interface Edge { key: string; known: boolean; exact: boolean | null }
function replayEvents(events: Ev[], overrides: Overrides) {
  let tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
  const edges: Edge[] = [];
  for (const e of events) {
    if (e.k === "prompt") {
      tracker = applySpriteOrderPresentationEvent(applySpriteOrderPresentationEvent(tracker, { kind: "action-prompt" }), { kind: "actions-committed" });
      continue;
    }
    if (e.k === "invalidate") { tracker = invalidateSpriteOrderTracker(tracker, e.reason ?? "invalidating event"); continue; }
    if (e.k === "body" || e.k === "anim") {
      const known = tracker.cursor.order.known;
      edges.push({ key: e.k === "body" ? `${e.move}:${e.side}` : `${e.table}:${e.id}:${e.arg}`, known, exact: known ? same(tracker.cursor.order.free, e.obsF!) : null });
    }
    const override = e.k === "body" ? overrides.get(`${e.move}:${e.side}`) : undefined;
    tracker = override ? applyOverridePlan(tracker, override, `body ${e.move}:${e.side} (override)`) : applySpriteOrderPresentationEvent(tracker, presentationOf(e));
  }
  return edges;
}
const count = (edges: Edge[]) => ({ edges: edges.length, known: edges.filter(x => x.known).length, exact: edges.filter(x => x.exact === true).length, mismatch: edges.filter(x => x.exact === false).length });
const isAnim = (x: Edge) => x.key.startsWith("gBattleAnims");

const rows = (rel: string) => Object.fromEntries(Object.entries(read(rel).bodies as Record<string, { plan: SpriteOrderPlan; tier?: string }>));
const pg = rows("sprite-order-policy-gaps/relative-y-plans.json");
const rely = rows("sprite-order-body-plans-rely.json");
const mk = (...sets: Record<string, { plan: SpriteOrderPlan; tier?: string }>[]): Overrides => new Map(sets.flatMap(s => Object.entries(s).map(([k, v]) => [k, v.plan] as const)));
const strictRely = Object.fromEntries(Object.entries(rely).filter(([, v]) => v.tier === "confirmed"));
const SETS: [string, Overrides][] = [["no overrides", mk()], ["+ policy-gaps rows (283/313)", mk(pg)], ["+ policy-gaps + rely confirmed tier", mk(pg, strictRely)], ["+ policy-gaps + all rely rows", mk(pg, rely)]];

const receipt: Record<string, unknown> = { schema: "sprite-order-rely-replay-ts/v1" };
const labNames = ["dt-player", "dt-opponent", "ft-player", "ft-opponent", "ftb-player", "ftb-opponent", "ftc-player", "ftc-opponent", "fd-player", "fd-opponent", "en-player", "en-opponent", "en2-player", "en3-player", "en3-opponent"];
const lab = labNames.map(n => read(`sprite-order-policy-gaps/events/${n}.json`).events as Ev[]);
receipt.policyGapsStreams = Object.fromEntries(SETS.map(([label, o]) => [label, count(lab.flatMap(ev => replayEvents(ev, o)))]));
receipt.realRoute = REAL_ROUTE_TRACES.map(trace => {
  const orig = replayCrossBodyTrace(trace, "strict");
  const doc = read(`sprite-order-real-route/events/${trace}.json`) as { events: Record<string, any>[] };
  const entryEnd = (doc.events.find(e => e.k === "prompt" || e.k === "body" || e.k === "anim") as { n: number }).n;
  const converted: Ev[] = [];
  for (const e of doc.events) {
    if (e.n <= entryEnd && e.k === "uncovered") continue;
    if (e.k === "prompt" || e.k === "blip") converted.push({ n: e.n, k: e.k });
    else if (e.k === "body") converted.push({ n: e.n, k: "body", move: e.move, side: e.side, obsF: e.obsF });
    else if (e.k === "anim") converted.push({ n: e.n, k: "anim", table: e.table, id: e.id, arg: e.arg ?? null, obsF: e.obsF });
    else converted.push({ n: e.n, k: "invalidate", reason: `${e.k}` });
  }
  const per = Object.fromEntries(SETS.map(([label, o]) => { const ed = replayEvents(converted, o); return [label, { move: count(ed.filter(x => !isAnim(x))), anim: count(ed.filter(isAnim)) }]; }));
  return { trace, original: { move: orig.moveEdges, anim: orig.animEdges }, copyMatchesOriginal: per["no overrides"]!.move.known === orig.moveEdges.known && per["no overrides"]!.anim.known === orig.animEdges.known, per };
});
const rr = receipt.realRoute as any[];
receipt.realRouteTotals = Object.fromEntries(SETS.map(([label]) => {
  const t = { moveEdges: 0, moveKnown: 0, moveExact: 0, moveMismatch: 0, animEdges: 0, animKnown: 0, animExact: 0, animMismatch: 0 };
  for (const r of rr) { const p = r.per[label]; t.moveEdges += p.move.edges; t.moveKnown += p.move.known; t.moveExact += p.move.exact; t.moveMismatch += p.move.mismatch; t.animEdges += p.anim.edges; t.animKnown += p.anim.known; t.animExact += p.anim.exact; t.animMismatch += p.anim.mismatch; }
  return [label, t];
}));
console.log("policy-gaps streams", JSON.stringify(receipt.policyGapsStreams, null, 1));
console.log("real route totals", JSON.stringify(receipt.realRouteTotals, null, 1));
console.log("copy matches original:", rr.map(r => r.copyMatchesOriginal).join(","));
if (process.argv.includes("--write")) writeFileSync(new URL("sprite-order-rely/replay-receipt-ts.json", FX), `${JSON.stringify(receipt, null, 1)}\n`);
