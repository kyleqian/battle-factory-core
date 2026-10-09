// prep43: strict cross-body replays of the production presentation-event transform (src/engine/spriteOrderEventTransform.ts), run once on
// master src and once with the temporary prep43 patch (fixtures/prep43/prep43-temp-src.diff).
//  (a) corpus: tools/integration/spriteOrderCrossBodyCorpusReplay.ts's corpus and rules unchanged, except that the move-animation
//      event carries the host's choosetwoturnanim key (liveSpriteOrderHost.ts: Sky Attack turn 1 -> 10143; with the patch Dig / Brick
//      Break odd turn -> 10091 / 10280): the corpus has no request.turn, so Dig's turn is its occurrence parity per attacker side in
//      the scenario (setup, unleash, ...) and Brick Break's is "a screen was broken" = the scenario is not a `-normal-` one (prep43
//      probes: both shapes 3/3). Without the patch the 10091 / 10280 keys have no plan, exactly like 91 / 280 on master.
//  (b) prep43 probe corpus (fixtures/prep43/units.json): the same strict replay from the known entry over the 57 probe jobs, mv-0
//      bodies mapped to the order event the host emits for them in that job (status CONFUSION / PRZ, general LEECH_SEED_DRAIN, the
//      sandstorm job's WEATHER_VAR with argument 12 = SANDSTORM_CONTINUES, hail 13, rain RAIN_CONTINUES); a ROM carry (the first gap
//      window destroying a unit's single survivor) is the transform's own immediate carry and is not replayed again as a gap window.
//  gdgeo (docs/giga-drain-geometry-order.md): every Giga Drain (202) / Mega Drain (72) move-animation event carries the scenario's lead species as its
//      `geometry` (the production host attaches the displayed species at the body's command); a src without the geometry-keyed plan
//      ignores the field, so the same tool measures before / after. (c) / (d) the gdgeo Giga Drain / Mega Drain probe grids
//      (fixtures/gdgeo/units.json, md-units.json), as (b).
// usage: node --experimental-strip-types tools/integration/prep43CorpusReplay.ts <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";

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

/** Lead species of a BattleLab scenario (`tools/battle-lab/<base>.json`) after a prep43 / gdgeo variant; null when not found. */
function leadSpecies(base: string, variant: unknown): { playerSpecies: number; opponentSpecies: number } | null {
  let scenario;
  try { scenario = JSON.parse(readFileSync(new URL(`../battle-lab/${base}.json`, import.meta.url), "utf8")); } catch { return null; }
  const parties = scenario.overrides?.parties;
  if (!parties) return null;
  let playerSpecies = parties.player[0].species as number, opponentSpecies = parties.opponent[0].species as number;
  const v = (Array.isArray(variant) ? variant : []) as (string | number)[];
  if (v[0] === "both") return { playerSpecies: v[1] as number, opponentSpecies: v[2] as number };
  for (let i = v[0] === "extend" ? 2 : 0; i + 1 < v.length; i += 2) {
    if (v[i] === "player") playerSpecies = v[i + 1] as number; else if (v[i] === "opponent") opponentSpecies = v[i + 1] as number;
  }
  return { playerSpecies, opponentSpecies };
}

/** The production body event, with the Giga Drain geometry when the species are known. */
function bodyEvent(moveId: number, attackerSide: Side, geometry: ReturnType<typeof leadSpecies>): SpriteOrderPresentationEvent {
  return (moveId === 202 || moveId === 72) && geometry !== null
    ? { kind: "move-animation", moveId, attackerSide, geometry } as SpriteOrderPresentationEvent
    : { kind: "move-animation", moveId, attackerSide };
}

/** Host move id (liveSpriteOrderHost.ts MOVE_ANIMATION mapping) from the move, side and the scenario's turn evidence. */
function hostMoveId(mv: number, turn: number): number {
  if (mv === 143 && turn === 1) return 10143;
  if ((mv === 91 || mv === 280) && (turn & 1) === 1) return 10000 + mv;
  return mv;
}

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
      if (side !== null && mv === 91) { const key = `${mv}:${side}`; turn = occurrences.get(key) ?? 0; occurrences.set(key, turn + 1); }
      if (mv === 280) turn = scenario.file.includes("-normal-") ? 0 : 1;
      tracker = applySpriteOrderPresentationEvent(tracker, mv === 0 || side === null
        ? { kind: "invalidate", reason: "mv-0 / unattributed body" }
        : bodyEvent(hostMoveId(mv, turn), side, leadSpecies(scenario.file.replace(/^\d+-/, "").replace(/-\d+\.json$/, ""), null)));
    });
  }
  return { ...t, skipped };
}

interface ProbeWindow { f: number; C: [number, string][]; D: number[]; F: number[] }
interface ProbeUnit { kind: "gap" | "body"; label: string; F0: number[]; truncated: boolean; windows: ProbeWindow[]; survivorSlots: number[] }
interface ProbeJob { unit: string; base: string; variant?: unknown; units: ProbeUnit[] }

function mv0Event(job: ProbeJob, label: string): SpriteOrderPresentationEvent {
  if (label === "status CONFUSION") return { kind: "status-animation", status: "CONFUSION" };
  if (label === "status PRZ") return { kind: "status-animation", status: "PRZ" };
  if (label === "general mv-0 (leech job)") return { kind: "general-animation", animation: "LEECH_SEED_DRAIN" };
  if (label === "general mv-0 (rain job)") return { kind: "general-animation", animation: "RAIN_CONTINUES" };
  if (label === "general mv-0 (weather job)") return { kind: "general-animation", animation: job.base.includes("sandstorm") ? "SANDSTORM_CONTINUES" : "HAIL_CONTINUES" };
  return { kind: "invalidate", reason: `unidentified mv-0 body (${job.unit})` };
}

function replayProbes(file = "prep43/units.json"): Tally & { jobs: number; perLabel: Record<string, { edgesAfter: number; knownAfter: number }> } {
  const jobs = read(file).jobs as Record<string, ProbeJob>;
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
        if (mv === 91) { turn = occurrences.get(unit.label) ?? 0; occurrences.set(unit.label, turn + 1); }
        if (mv === 280) turn = job.base.includes("-normal-") ? 0 : 1;
        event = bodyEvent(hostMoveId(mv, turn), side, leadSpecies(job.base, job.variant));
      } else event = mv0Event(job, unit.label);
      tracker = applySpriteOrderPresentationEvent(tracker, event);
    });
  }
  return { ...t, jobs: Object.keys(jobs).length, perLabel };
}

const corpus = replayCorpus();
const probes = replayProbes();
const gdgeo = replayProbes("gdgeo/units.json");
const mdgeo = replayProbes("gdgeo/md-units.json");
const out = { schema: "prep43-corpus-replay/v1", corpus, probes, gdgeo, mdgeo };
writeFileSync(process.argv[2]!, JSON.stringify(out, null, 1) + "\n");
const line = (name: string, r: Tally) => `${name}: edges ${r.edges} known ${r.known} exact ${r.exact} mismatched ${r.mismatched}${r.mismatches.length ? " " + JSON.stringify(r.mismatches.slice(0, 6)) : ""}`;
console.log(line("corpus (turn-keyed)", corpus));
console.log(line("prep43 probes", probes));
console.log(line("gdgeo probes", gdgeo));
console.log(line("mdgeo probes", mdgeo));
console.log(JSON.stringify(probes.perLabel));
