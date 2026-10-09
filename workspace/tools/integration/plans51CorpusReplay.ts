// plans51: prep45CorpusReplay.ts's strict probe replay (part b; copied: that script runs at import) over the plans51 probe corpus
// (fixtures/plans51/units.json): from the known entry, every gap through applyGap's verbatim rules (hit-animation / prompt bounce pairs,
// else invalidate; a carried survivor's destroy window is consumed by the unit before it), every body through the production transform
// (move-animation by the attacker side; mv-0 "general FOCUS_BAND" -> general-animation FOCUS_BAND; any other mv-0 body invalidates).
// At every body edge with a known tracker the free order must equal the ROM's F at that edge (exact) — else a mismatch.
// usage: node --experimental-strip-types tools/integration/plans51CorpusReplay.ts <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";

interface Window { f: number; C?: [number, string][]; D?: number[] }
interface ProbeUnit { kind: string; label: string; F0: number[]; truncated: boolean; survivorSlots: number[]; windows: { f: number; C: [number, string][]; D: number[] }[] }
interface ProbeJob { unit: string; base: string; units: ProbeUnit[] }
const same = (l: readonly number[] | undefined, r: readonly number[] | undefined) => JSON.stringify(l) === JSON.stringify(r);

/** spriteOrderCrossBodyCorpusReplay.ts applyGap (verbatim rules, as prep45CorpusReplay.ts). */
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

const jobs = JSON.parse(readFileSync(new URL("./fixtures/plans51/units.json", import.meta.url), "utf8")).jobs as Record<string, ProbeJob>;
const tally = { jobs: 0, edges: 0, known: 0, exact: 0, mismatched: 0, mismatches: [] as { job: string; unit: number; label: string }[] };
const perLabel: Record<string, { edgesAfter: number; knownAfter: number; exactAfter: number }> = {};
for (const [name, job] of Object.entries(jobs)) {
  const first = job.units.find(u => u.kind === "body");
  if (!first || !same(first.F0, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER)) continue;
  tally.jobs += 1;
  let tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  let carried: number | null = null, lastLabel: string | null = null;
  job.units.forEach((unit, index) => {
    if (unit.kind === "gap") {
      let windows: Window[] = unit.windows.map(w => ({ f: w.f, ...(w.C.length ? { C: w.C } : {}), ...(w.D.length ? { D: w.D } : {}) }));
      if (carried !== null && windows[0] && !windows[0].C && same(windows[0].D, [carried])) windows = windows.slice(1);
      carried = null;
      tracker = applyGap(tracker, windows);
      return;
    }
    if (unit.truncated) { tracker = applySpriteOrderPresentationEvent(tracker, { kind: "invalidate", reason: "truncated body" }); return; }
    tally.edges += 1;
    const known = tracker.cursor.order.known, exact = known && same(tracker.cursor.order.free, unit.F0);
    if (known) { tally.known += 1; if (exact) tally.exact += 1; else { tally.mismatched += 1; tally.mismatches.push({ job: name, unit: index, label: unit.label }); } }
    if (lastLabel !== null) {
      const p = perLabel[lastLabel] ??= { edgesAfter: 0, knownAfter: 0, exactAfter: 0 };
      p.edgesAfter += 1;
      if (known) p.knownAfter += 1;
      if (exact) p.exactAfter += 1;
    }
    lastLabel = unit.label.replace(/^body (\d+):.*$/, "body $1");
    carried = unit.survivorSlots.length === 1 ? unit.survivorSlots[0]! : null;
    const body = /^body (\d+):(player|opponent)$/.exec(unit.label);
    const event: SpriteOrderPresentationEvent = body ? { kind: "move-animation", moveId: Number(body[1]), attackerSide: body[2] as "player" | "opponent" }
      : unit.label === "general FOCUS_BAND" ? { kind: "general-animation", animation: "FOCUS_BAND" }
        : { kind: "invalidate", reason: `unidentified mv-0 body (${job.unit})` };
    tracker = applySpriteOrderPresentationEvent(tracker, event);
  });
}
writeFileSync(process.argv[2]!, JSON.stringify({ schema: "plans51-corpus-replay/v1", ...tally, perLabel }, null, 1) + "\n");
console.log(`plans51 probes: jobs ${tally.jobs} edges ${tally.edges} known ${tally.known} exact ${tally.exact} mismatched ${tally.mismatched}${tally.mismatches.length ? " " + JSON.stringify(tally.mismatches.slice(0, 6)) : ""}`);
console.log(JSON.stringify(perLabel));
