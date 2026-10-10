// prep45: prep43CorpusReplay.ts (copied: it runs at import) with the prep45 keys, run once on master src and once with the temporary
// prep45 patch (fixtures/prep45/prep45-temp-src.diff).
//  (a) corpus: spriteOrderCrossBodyCorpusReplay.ts's corpus and rules unchanged, the move-animation event carrying the host's
//      choosetwoturnanim key; prep45 adds Solar Beam (76: odd turn -> 10076, like Dig its turn is the occurrence parity per attacker side
//      in the scenario: setup, unleash, ...). On master 10076 has no plan, exactly like 76.
//  (b) prep45 probe corpus (fixtures/prep45/units.json): the same strict replay from the known entry, mv-0 bodies mapped to the order
//      event the patched host emits for them (status BRN, general TURN_TRAP_<trap branch by the job's trap move> / HELD_ITEM_EFFECT for
//      the Leftovers unit, WISH_HEAL, INGRAIN_HEAL, FUTURE_SIGHT_HIT); any other mv-0 body invalidates.
// usage: node --experimental-strip-types tools/integration/prep45CorpusReplay.ts <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { SPRITE_ORDER_PRODUCTION_ANIMS, SPRITE_ORDER_PRODUCTION_PLANS } from "../../src/engine/spriteOrderProductionPlans.ts";

interface Window { f: number; C?: [number, string][]; D?: number[] }
interface CorpusUnit { kind: "gap" | "body"; windows: Window[]; mv?: number; observedFreeAtEdge?: number[]; truncated?: boolean }
interface Scenario { file: string; move: number | null; side: "player" | "opponent" | null; freeAtFirstEdge: number[]; units: CorpusUnit[] }
type Side = "player" | "opponent";

const read = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const same = (l: readonly number[] | undefined, r: readonly number[] | undefined) => JSON.stringify(l) === JSON.stringify(r);

/** spriteOrderCrossBodyCorpusReplay.ts applyGap (verbatim rules). */
function applyGap(tracker: SpriteOrderTracker, windows: readonly Window[]): SpriteOrderTracker {
  let next = tracker;
  for (let index = 0; index < windows.length;) {
    const window = windows[index]!, following = windows[index + 1];
    const created = (window.C ?? []).map(([slot]) => slot);
    const pairsWith = following && !following.C && following.D && !window.D
      && following.D.length === created.length && created.every(slot => following.D!.includes(slot));
    if (created.length === 1 && window.C![0]![1] === "f" && pairsWith) {
      next = applySpriteOrderPresentationEvent(next, { kind: "hit-animation", targetVisible: true });
      index += 2;
    } else if (created.length === 2 && window.C!.every(([, mode]) => mode === "f") && pairsWith) {
      next = applySpriteOrderPresentationEvent(applySpriteOrderPresentationEvent(next, { kind: "action-prompt" }), { kind: "actions-committed" });
      index += 2;
    } else {
      next = applySpriteOrderPresentationEvent(next, { kind: "invalidate", reason: "unclassified gap window" });
      break;
    }
  }
  return next;
}

interface Tally { edges: number; known: number; exact: number; mismatched: number; mismatches: { file: string; unit: number; mv: number | string }[] }
const tally = (): Tally => ({ edges: 0, known: 0, exact: 0, mismatched: 0, mismatches: [] });
function edge(t: Tally, tracker: SpriteOrderTracker, observed: number[] | undefined, file: string, unit: number, mv: number | string) {
  t.edges += 1;
  if (!tracker.cursor.order.known) return;
  t.known += 1;
  if (same(tracker.cursor.order.free, observed)) t.exact += 1;
  else { t.mismatched += 1; t.mismatches.push({ file, unit, mv }); }
}

/** Host move id (liveSpriteOrderHost.ts MOVE_ANIMATION mapping) from the move, side and the scenario's turn evidence. */
function hostMoveId(mv: number, turn: number): number {
  if (mv === 143 && turn === 1) return 10143;
  if ((mv === 13 || mv === 19 || mv === 76 || mv === 91 || mv === 280 || mv === 340) && (turn & 1) === 1) return 10000 + mv;
  return mv;
}

/** plans48: the host keys Present's PresentHeal branch (damage <= 0) as 20217; replays read the branch from the body's allocation count. */
const presentKey = (mv: number, windows: readonly { C?: readonly unknown[] }[]) =>
  mv === 217 && windows.reduce((n, w) => n + (w.C?.length ?? 0), 0) !== 6 ? 20217 : null;

function replayCorpus(): Tally & { skipped: number } {
  const scenarios: Scenario[] = [...read("sprite-order-body-events.json").scenarios, ...read("sprite-order-body-events-ext.json").scenarios];
  const t = tally();
  let skipped = 0;
  for (const scenario of scenarios) {
    if (!same(scenario.freeAtFirstEdge, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER)) { skipped += 1; continue; }
    let tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
    const occurrences = new Map<string, number>();
    scenario.units.forEach((unit, index) => {
      if (unit.kind === "gap") { tracker = applyGap(tracker, unit.windows); return; }
      const mv = unit.mv ?? 0;
      if (unit.truncated) { tracker = applySpriteOrderPresentationEvent(tracker, { kind: "invalidate", reason: "truncated body" }); return; }
      edge(t, tracker, unit.observedFreeAtEdge, scenario.file, index, mv);
      const side: Side | null = scenario.side === null ? null : mv === scenario.move ? scenario.side : scenario.side === "opponent" ? "player" : "opponent";
      let turn = 0;
      if (side !== null && (mv === 13 || mv === 19 || mv === 76 || mv === 91 || mv === 340)) { const key = `${mv}:${side}`; turn = occurrences.get(key) ?? 0; occurrences.set(key, turn + 1); }
      if (mv === 280) turn = scenario.file.includes("-normal-") ? 0 : 1;
      tracker = applySpriteOrderPresentationEvent(tracker, mv === 0 || side === null
        ? { kind: "invalidate", reason: "mv-0 / unattributed body" }
        : { kind: "move-animation", moveId: presentKey(mv, unit.windows) ?? hostMoveId(mv, turn), attackerSide: side });
    });
  }
  return { ...t, skipped };
}

interface ProbeWindow { f: number; C: [number, string][]; D: number[]; F: number[] }
interface ProbeUnit { kind: "gap" | "body"; label: string; F0: number[]; truncated: boolean; windows: ProbeWindow[]; survivorSlots: number[]; plan: string }
interface ProbeJob { unit: string; base: string; units: ProbeUnit[] }

const HELD_ITEM_PLAN = SPRITE_ORDER_PRODUCTION_PLANS[SPRITE_ORDER_PRODUCTION_ANIMS.HELD_ITEM_EFFECT!]!;
function mv0Event(job: ProbeJob, unit: ProbeUnit & { plan: string }): SpriteOrderPresentationEvent {
  const label = unit.label;
  if (label === "status BRN") return { kind: "status-animation", status: "BRN" };
  if (label === "general TURN_TRAP") {
    if (unit.plan === HELD_ITEM_PLAN) return { kind: "general-animation", animation: "HELD_ITEM_EFFECT" };
    const kind = job.base.includes("fire-spin") ? "FIRE_SPIN" : job.base.includes("whirlpool") ? "WHIRLPOOL" : job.base.includes("sand-tomb") ? "SAND_TOMB" : "BIND";
    return { kind: "general-animation", animation: `TURN_TRAP_${kind}` };
  }
  if (label === "general WISH_HEAL" || label === "general INGRAIN_HEAL" || label === "general FUTURE_SIGHT_HIT") {
    return { kind: "general-animation", animation: label.slice("general ".length) };
  }
  return { kind: "invalidate", reason: `unidentified mv-0 body (${job.unit})` };
}

function replayProbes(): Tally & { jobs: number; perLabel: Record<string, { edgesAfter: number; knownAfter: number }> } {
  const jobs = read("prep45/units.json").jobs as Record<string, ProbeJob>;
  const t = tally();
  const perLabel: Record<string, { edgesAfter: number; knownAfter: number }> = {};
  for (const [name, job] of Object.entries(jobs)) {
    const first = job.units.find(u => u.kind === "body");
    if (!first || !same(first.F0, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER)) continue;
    let tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
    const occurrences = new Map<string, number>();
    let carried: number | null = null;
    let lastLabel: string | null = null;
    job.units.forEach((unit, index) => {
      if (unit.kind === "gap") {
        let windows = unit.windows.map(w => ({ f: w.f, ...(w.C.length ? { C: w.C } : {}), ...(w.D.length ? { D: w.D } : {}) }));
        if (carried !== null && windows[0] && !windows[0].C && same(windows[0].D, [carried])) windows = windows.slice(1);
        carried = null;
        tracker = applyGap(tracker, windows);
        return;
      }
      if (unit.truncated) { tracker = applySpriteOrderPresentationEvent(tracker, { kind: "invalidate", reason: "truncated body" }); return; }
      edge(t, tracker, unit.F0, name, index, unit.label);
      if (lastLabel !== null) {
        const p = perLabel[lastLabel] ??= { edgesAfter: 0, knownAfter: 0 };
        p.edgesAfter += 1;
        if (tracker.cursor.order.known) p.knownAfter += 1;
      }
      lastLabel = unit.label.replace(/^body (\d+):.*$/, "body $1");
      carried = unit.survivorSlots.length === 1 ? unit.survivorSlots[0]! : null;
      const body = /^body (\d+):(player|opponent)$/.exec(unit.label);
      let event: SpriteOrderPresentationEvent;
      if (body) {
        const mv = Number(body[1]), side = body[2] as Side;
        let turn = 0;
        if (mv === 13 || mv === 19 || mv === 76 || mv === 91 || mv === 340) { turn = occurrences.get(unit.label) ?? 0; occurrences.set(unit.label, turn + 1); }
        if (mv === 280) turn = job.base.includes("-normal-") ? 0 : 1;
        event = { kind: "move-animation", moveId: presentKey(mv, unit.windows) ?? hostMoveId(mv, turn), attackerSide: side };
      } else event = mv0Event(job, unit);
      tracker = applySpriteOrderPresentationEvent(tracker, event);
    });
  }
  return { ...t, jobs: Object.keys(jobs).length, perLabel };
}

const corpus = replayCorpus();
const probes = replayProbes();
const out = { schema: "prep45-corpus-replay/v1", corpus, probes };
writeFileSync(process.argv[2]!, JSON.stringify(out, null, 1) + "\n");
const line = (name: string, r: Tally) => `${name}: edges ${r.edges} known ${r.known} exact ${r.exact} mismatched ${r.mismatched}${r.mismatches.length ? " " + JSON.stringify(r.mismatches.slice(0, 6)) : ""}`;
console.log(line("corpus (turn-keyed)", corpus));
console.log(line("prep45 probes", probes));
console.log(JSON.stringify(probes.perLabel));
