// S10A policy gaps (docs/sprite-order-policy-gaps.md): replay ROM event streams through the PURE production transform
// (src/engine/spriteOrderEventTransform.ts + spriteOrderProvider.ts) to validate three proposed order-policy mappings:
//   Q1 stat-changing move bodies (Double Team / Feather Dance / Fake Tears): `stat-stage-change` semantic event = no order transform, the
//      `animation STATS_CHANGE` event AFTER the move animation = stat plan;  controls: stat command invalidates / stat plan applied before the body.
//   Q2 battle-start Intimidate: pre-prompt entry state + stat plan + the ordinary prompt cycle, on the 12 corpus scenarios.
//   Q3 Endeavor (283) plan from fixtures/sprite-order-policy-gaps/sprite-order-body-plans-endeavor.json: lab scenarios + strict real-route replay.
//   run: node --experimental-strip-types tools/integration/spriteOrderPolicyGapsReplay.ts [--write]   (writes fixtures/sprite-order-policy-gaps/replay-receipt.json)
import { readFileSync, writeFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, invalidateSpriteOrderTracker, spriteOrderTrackerLend,
  type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import {
  BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, applySpriteOrderUnitPlan, applySpriteOrderWindow,
  initSpriteOrderState, knownEntrySpriteOrderState, type SpriteOrderPlan, type SpriteOrderState,
} from "../../src/engine/spriteOrderProvider.ts";
import { REAL_ROUTE_TRACES, replayCrossBodyTrace } from "./spriteOrderCrossBodyReplay.ts";

const FX = new URL("./fixtures/", import.meta.url);
const GAPS = new URL("sprite-order-policy-gaps/", FX);
const read = (url: URL) => JSON.parse(readFileSync(url, "utf8"));
const same = (a: readonly number[], b: readonly number[]) => JSON.stringify(a) === JSON.stringify(b);
const STATUS: Record<number, string> = { 0: "PSN", 1: "CONFUSION", 2: "BRN", 3: "INFATUATION", 4: "SLP", 5: "PRZ", 6: "FRZ", 7: "CURSED", 8: "NIGHTMARE" };
const GENERAL: Record<number, string> = { 7: "HELD_ITEM_EFFECT", 11: "SUN_CONTINUES", 13: "HAIL_CONTINUES", 6: "TURN_TRAP", 20: "FOCUS_PUNCH_SETUP" };
const STAT_MOVES = new Set([104, 297, 313]);

type Overrides = ReadonlyMap<string, SpriteOrderPlan>;
interface Ev { n: number; k: "prompt" | "blip" | "body" | "anim" | "invalidate"; reason?: string; move?: number; side?: "player" | "opponent"; obsF?: number[]; table?: string; id?: number | null; arg?: number | null }
type StatMode = "proposed" | "stat-command-invalidates" | "stat-plan-before-body";

/** Mirror of the (unexported) spriteOrderEventTransform.applyPlan, for plans the production table does not have yet. */
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

interface Edge { n: number; key: string; known: boolean; lent: boolean; exact: boolean | null }
function replayEvents(seed: SpriteOrderState, events: Ev[], overrides: Overrides, mode: StatMode) {
  let list = events.slice();
  if (mode === "stat-command-invalidates") {
    // the stat-stage-change event (seq 2) sits AHEAD of the move animation: an "any non-message command invalidates" policy
    list = list.flatMap(e => e.k === "body" && STAT_MOVES.has(e.move!) ? [{ n: e.n, k: "invalidate" as const, reason: "stat command" }, e] : [e]);
  } else if (mode === "stat-plan-before-body") {
    for (let i = 0; i + 1 < list.length; i += 1) {
      if (list[i]!.k === "body" && STAT_MOVES.has(list[i]!.move!) && list[i + 1]!.k === "anim") [list[i], list[i + 1]] = [list[i + 1]!, list[i]!];
    }
  }
  let tracker = createSpriteOrderTracker(seed);
  const edges: Edge[] = [];
  let firstInvalidation: { n: number; key: string; reason: string | null } | null = null;
  for (const e of list) {
    if (e.k === "prompt") {
      tracker = applySpriteOrderPresentationEvent(applySpriteOrderPresentationEvent(tracker, { kind: "action-prompt" }), { kind: "actions-committed" });
      continue;
    }
    if (e.k === "invalidate") {
      if (tracker.cursor.order.known && firstInvalidation === null) firstInvalidation = { n: e.n, key: e.reason ?? "invalidating event", reason: e.reason ?? "invalidating event" };
      tracker = invalidateSpriteOrderTracker(tracker, e.reason ?? "invalidating event");
      continue;
    }
    if (e.k === "body" || e.k === "anim") {
      const known = tracker.cursor.order.known;
      edges.push({ n: e.n, key: e.k === "body" ? `${e.move}:${e.side}` : `${e.table}:${e.id}:${e.arg}`, known,
        lent: spriteOrderTrackerLend(tracker) !== null, exact: known ? same(tracker.cursor.order.free, e.obsF!) : null });
    }
    const override = e.k === "body" ? overrides.get(`${e.move}:${e.side}`) : undefined;
    const wasKnown = tracker.cursor.order.known;
    tracker = override ? applyOverridePlan(tracker, override, `body ${e.move}:${e.side} (override)`) : applySpriteOrderPresentationEvent(tracker, presentationOf(e));
    if (wasKnown && !tracker.cursor.order.known && firstInvalidation === null) firstInvalidation = { n: e.n, key: e.k === "body" ? `${e.move}:${e.side}` : e.k, reason: tracker.invalidReason };
  }
  return { edges, finalKnown: tracker.cursor.order.known, invalidReason: tracker.invalidReason, firstInvalidation };
}
const count = (edges: Edge[]) => ({ edges: edges.length, known: edges.filter(x => x.known).length, exact: edges.filter(x => x.exact === true).length,
  mismatch: edges.filter(x => x.exact === false).length, lent: edges.filter(x => x.lent).length });
const sum = (rows: ReturnType<typeof count>[]) => rows.reduce((a, r) => ({ edges: a.edges + r.edges, known: a.known + r.known, exact: a.exact + r.exact, mismatch: a.mismatch + r.mismatch, lent: a.lent + r.lent }),
  { edges: 0, known: 0, exact: 0, mismatch: 0, lent: 0 });

const entry = knownEntrySpriteOrderState("ordinary-factory");
const plansExt = read(new URL("sprite-order-body-plans-ext.json", FX)).bodies as Record<string, { plan: SpriteOrderPlan }>;
const endeavor = read(new URL("sprite-order-body-plans-endeavor.json", GAPS)).bodies as Record<string, { plan: SpriteOrderPlan }>;
const NO_OVERRIDES: Overrides = new Map();
const FAKE_TEARS: Overrides = new Map([["313:player", plansExt["313:player"]!.plan], ["313:opponent", plansExt["313:opponent"]!.plan]]);
const ENDEAVOR: Overrides = new Map([["283:player", endeavor["283:player"]!.plan], ["283:opponent", endeavor["283:opponent"]!.plan]]);
const ALL: Overrides = new Map([...FAKE_TEARS, ...ENDEAVOR]);

export function run() {
  const receipt: Record<string, unknown> = { schema: "sprite-order-policy-gaps-replay/v1" };
  // ---- Q1: stat-changing bodies on the lab scenarios (two-run-identical ROM probes)
  const names = ["dt-player", "dt-opponent", "ft-player", "ft-opponent", "ftb-player", "ftb-opponent", "ftc-player", "ftc-opponent", "fd-player", "fd-opponent"];
  const scenarios = names.map(name => read(new URL(`events/${name}.json`, GAPS)) as { name: string; side: "player" | "opponent"; entryMatchesProvider: boolean; events: Ev[] });
  const q1: Record<string, unknown> = {};
  for (const [label, overrides, statMode] of [
    ["proposed (production table)", NO_OVERRIDES, "proposed"], ["proposed + Fake Tears relative-y plan", FAKE_TEARS, "proposed"],
    ["control: stat command invalidates", FAKE_TEARS, "stat-command-invalidates"], ["control: stat plan applied before the body", FAKE_TEARS, "stat-plan-before-body"],
  ] as const) {
    const per = scenarios.map(s => ({ name: s.name, ...count(replayEvents(entry, s.events, overrides, statMode).edges) }));
    q1[label] = { total: sum(per), perScenario: Object.fromEntries(per.map(p => [p.name, p])) };
  }
  receipt.q1 = q1;
  receipt.q1Edges = Object.fromEntries(scenarios.map(s => [s.name, replayEvents(entry, s.events, FAKE_TEARS, "proposed").edges]));
  // ---- Q3a: Endeavor on the lab scenarios
  const en = ["en-player", "en-opponent", "en2-player", "en3-player", "en3-opponent"].map(name => read(new URL(`events/${name}.json`, GAPS)) as { name: string; events: Ev[] });
  receipt.q3Lab = Object.fromEntries([["without plan", NO_OVERRIDES], ["with Endeavor plan", ENDEAVOR]].map(([label, o]) =>
    [label as string, sum(en.map(s => count(replayEvents(entry, s.events, o as Overrides, "proposed").edges)))]));
  receipt.q3LabEdges = Object.fromEntries(en.map(s => [s.name, replayEvents(entry, s.events, ENDEAVOR, "proposed").edges]));
  // ---- Q2: battle-start Intimidate (12 corpus scenarios): pre-prompt seed = the entry windows without the prompt cycle
  const windows = BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS;
  const identity = Array.from({ length: 64 }, (_, slot) => slot);
  let pre = initSpriteOrderState();
  for (const [created, destroyed] of windows.slice(0, -2)) pre = applySpriteOrderWindow(pre, created, destroyed, [...destroyed, ...identity.filter(s => !destroyed.includes(s))]);
  const post = applySpriteOrderPresentationEvent(applySpriteOrderPresentationEvent(createSpriteOrderTracker(pre), { kind: "action-prompt" }), { kind: "actions-committed" });
  const intimidate = read(new URL("events/intimidate.json", GAPS)) as { file: string; intimidateEdge: { obsF: number[] }; firstMoveEdge: { obsF: number[] }; statArg: number }[];
  const q2Rows = intimidate.map(row => {
    const stat: Ev = { n: 0, k: "anim", table: "gBattleAnims_General", id: 1, arg: row.statArg, obsF: row.intimidateEdge.obsF };
    const move: Ev = { n: 1, k: "body", move: 1, side: "player", obsF: row.firstMoveEdge.obsF };
    const proposed = replayEvents(pre, [stat, { n: 0.5, k: "prompt" }, move], NO_OVERRIDES, "proposed").edges;
    const constantSeed = replayEvents(entry, [stat, { n: 0.5, k: "prompt" }, move], NO_OVERRIDES, "proposed").edges; // control: the existing post-prompt constant as seed
    return { file: row.file, proposed: proposed.map(x => x.exact), control: constantSeed.map(x => x.exact) };
  });
  receipt.q2 = {
    prePromptFreeHead: pre.known ? pre.free.slice(0, 20) : null, preEqualsObservedAtIntimidateEdge: intimidate.every(r => same(pre.known ? pre.free : [], r.intimidateEdge.obsF)),
    promptOnPreEqualsKnownEntryConstant: post.cursor.order.known && same(post.cursor.order.free, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER) && same(entry.known ? entry.free : [], KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER),
    scenarios: intimidate.length,
    proposed: { edges: q2Rows.length * 2, exact: q2Rows.reduce((a, r) => a + r.proposed.filter(x => x === true).length, 0), mismatch: q2Rows.reduce((a, r) => a + r.proposed.filter(x => x === false).length, 0) },
    controlConstantSeed: { edges: q2Rows.length * 2, exact: q2Rows.reduce((a, r) => a + r.control.filter(x => x === true).length, 0), mismatch: q2Rows.reduce((a, r) => a + r.control.filter(x => x === false).length, 0) },
    rows: q2Rows,
  };
  // ---- Q3b: strict real-route replay with Endeavor added (copy of replayCrossBodyTrace with a body-plan override)
  receipt.q3RealRoute = REAL_ROUTE_TRACES.map(trace => {
    const base = replayCrossBodyTrace(trace, "strict");
    const doc = read(new URL(`sprite-order-real-route/events/${trace}.json`, FX)) as { events: Record<string, unknown>[] };
    const converted: Ev[] = [];
    let entryEnd = (doc.events.find(e => e.k === "prompt" || e.k === "body" || e.k === "anim") as { n: number }).n;
    const rows = doc.events.map(e => e as { n: number; k: string; move?: number; side?: "player" | "opponent"; table?: string; id?: number; arg?: number | null; obsF?: number[]; main?: unknown });
    for (const e of rows) {
      if (e.n <= entryEnd && e.k === "uncovered") continue;
      if (e.k === "prompt" || e.k === "blip") converted.push({ n: e.n, k: e.k });
      else if (e.k === "body") converted.push({ n: e.n, k: "body", move: e.move, side: e.side, obsF: e.obsF });
      else if (e.k === "anim") converted.push({ n: e.n, k: "anim", table: e.table, id: e.id, arg: e.arg ?? null, obsF: e.obsF });
      else converted.push({ n: e.n, k: "invalidate", reason: `${e.k}${e.k === "uncovered" ? `: ${String((e as { main?: unknown }).main)}` : ""}` });
    }
    const mine = (o: Overrides) => replayEvents(entry, converted, o, "proposed").edges;
    const baseline = mine(NO_OVERRIDES), withEndeavor = mine(ENDEAVOR), withAll = mine(ALL);
    return {
      trace, original: { move: base.moveEdges, anim: base.animEdges, firstInvalidation: base.firstInvalidation },
      copyNoOverride: count(baseline), copyMatchesOriginal: count(baseline).known === base.moveEdges.known + base.animEdges.known
        && count(baseline).mismatch === base.moveEdges.mismatched + base.animEdges.mismatched,
      withEndeavor: count(withEndeavor), withEndeavorAndFakeTears: count(withAll),
      firstInvalidationBaseline: replayEvents(entry, converted, NO_OVERRIDES, "proposed").firstInvalidation,
      firstInvalidationWithEndeavor: replayEvents(entry, converted, ENDEAVOR, "proposed").firstInvalidation,
    };
  });
  return receipt;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const receipt = run();
  const text = JSON.stringify(receipt, null, 1);
  if (process.argv.includes("--write")) writeFileSync(new URL("replay-receipt.json", GAPS), `${text}\n`);
  const r = receipt as any;
  for (const [k, v] of Object.entries(r.q1)) console.log("Q1", k, JSON.stringify((v as any).total));
  console.log("Q3 lab", JSON.stringify(r.q3Lab));
  console.log("Q2", JSON.stringify({ ...r.q2, rows: undefined }));
  for (const t of r.q3RealRoute) console.log("Q3 real", t.trace, "orig", JSON.stringify(t.original.move), "|copy", JSON.stringify(t.copyNoOverride), t.copyMatchesOriginal, "| +Endeavor", JSON.stringify(t.withEndeavor), "| +FT", JSON.stringify(t.withEndeavorAndFakeTears), "| firstInval base", JSON.stringify(t.firstInvalidationBaseline), "-> +Endeavor", JSON.stringify(t.firstInvalidationWithEndeavor));
}
