// BattleLab corpus replay of the production presentation-event transform (src/engine/spriteOrderEventTransform.ts) over the
// committed + ext body-event tables (tools/integration/fixtures/sprite-order-body-events{,-ext}.json; the corpus of
// docs/sprite-order-plan-coverage.md: 1366 edges / 1053 exact by spriteOrderBodyPlansExt.py's keyed gap plans).
// The event tables record raw sort windows, not presentation events, so each gap is classified by shape into transform
// events where the event table allows: [C one][D it] = hit-animation blip, [C two][D both] = prompt cycle, empty = none;
// any other gap shape, and every mv-0 (non-move animation, identity not in the table) body, invalidates. Bodies drive the
// production body table by (move, owner side). Strict per scenario (no resync), compared at every body activation edge.
import { readFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";

interface Window { f: number; C?: [number, string][]; D?: number[] }
interface Unit { kind: "gap" | "body"; windows: Window[]; mv?: number; observedFreeAtEdge?: number[]; truncated?: boolean }
interface Scenario {
  file: string; move: number | null; side: "player" | "opponent" | null; entryMatchesProvider: boolean; freeAtFirstEdge: number[]; units: Unit[];
}

const read = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")) as { scenarios: Scenario[] };

function ownerSide(scenario: Scenario, mv: number): "player" | "opponent" | null {
  if (scenario.side === null) return null;
  if (mv === scenario.move) return scenario.side;
  return scenario.side === "opponent" ? "player" : "opponent";
}

function applyGap(tracker: SpriteOrderTracker, windows: readonly Window[]): { tracker: SpriteOrderTracker; shape: string } {
  let next = tracker;
  const shape: string[] = [];
  for (let index = 0; index < windows.length;) {
    const window = windows[index]!, following = windows[index + 1];
    const created = (window.C ?? []).map(([slot]) => slot);
    const pairsWith = following && !following.C && following.D && !window.D
      && following.D.length === created.length && created.every(slot => following.D!.includes(slot));
    if (created.length === 1 && window.C![0]![1] === "f" && pairsWith) {
      next = applySpriteOrderPresentationEvent(next, { kind: "hit-animation", targetVisible: true });
      shape.push("blip");
      index += 2;
    } else if (created.length === 2 && window.C!.every(([, mode]) => mode === "f") && pairsWith) {
      next = applySpriteOrderPresentationEvent(applySpriteOrderPresentationEvent(next, { kind: "action-prompt" }),
        { kind: "actions-committed" });
      shape.push("prompt");
      index += 2;
    } else {
      next = applySpriteOrderPresentationEvent(next, { kind: "invalidate", reason: "unclassified gap window" });
      shape.push("other");
      break;
    }
  }
  return { tracker: next, shape: shape.join("+") || "empty" };
}

export function replayCrossBodyCorpus() {
  const scenarios = [...read("sprite-order-body-events.json").scenarios, ...read("sprite-order-body-events-ext.json").scenarios];
  let edges = 0, known = 0, exact = 0, mismatched = 0, firstEdges = 0, laterKnown = 0, skipped = 0;
  const mismatches: { file: string; unit: number; mv: number }[] = [];
  const gapShapes: Record<string, number> = {};
  const otherSamples: string[] = [];
  for (const scenario of scenarios) {
    // As spriteOrderBodyPlans.py: a scenario whose first-edge free order differs from the known entry is skipped (its
    // entry is not the modelled one); entry-window timing differences with the same first-edge order are kept.
    if (JSON.stringify(scenario.freeAtFirstEdge) !== JSON.stringify(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER)) { skipped += 1; continue; }
    let tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
    let firstEdge = true;
    scenario.units.forEach((unit, index) => {
      if (unit.kind === "gap") {
        const applied = applyGap(tracker, unit.windows);
        tracker = applied.tracker;
        gapShapes[applied.shape] = (gapShapes[applied.shape] ?? 0) + 1;
        if (applied.shape.endsWith("other") && otherSamples.length < 400) otherSamples.push(JSON.stringify(unit.windows.map(w => [w.C?.map(c => c[0]) ?? [], w.D ?? []])));
        return;
      }
      const mv = unit.mv ?? 0;
      // A truncated body (trace ended inside it) is not an activation edge in spriteOrderBodyPlans.py either.
      if (unit.truncated) {
        firstEdge = false;
        tracker = applySpriteOrderPresentationEvent(tracker, { kind: "invalidate", reason: "truncated body" });
        return;
      }
      edges += 1;
      if (firstEdge) firstEdges += 1;
      if (tracker.cursor.order.known) {
        known += 1;
        if (!firstEdge) laterKnown += 1;
        if (JSON.stringify(tracker.cursor.order.free) === JSON.stringify(unit.observedFreeAtEdge)) exact += 1;
        else { mismatched += 1; mismatches.push({ file: scenario.file, unit: index, mv }); }
      }
      firstEdge = false;
      const side = ownerSide(scenario, mv);
      tracker = applySpriteOrderPresentationEvent(tracker, mv === 0 || side === null
        ? { kind: "invalidate", reason: "mv-0 / unattributed body" }
        : { kind: "move-animation", moveId: mv, attackerSide: side });
    });
  }
  return { scenarios: scenarios.length, skipped, edges, firstEdges, known, laterKnown, exact, mismatched, mismatches, gapShapes, otherSamples };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = replayCrossBodyCorpus();
  const { otherSamples, ...summary } = result;
  console.log(JSON.stringify({ ...summary, mismatches: result.mismatches.slice(0, 10) }));
  const counts = new Map<string, number>();
  for (const sample of otherSamples) counts.set(sample.replace(/\d+/g, "s"), (counts.get(sample.replace(/\d+/g, "s")) ?? 0) + 1);
  console.log([...counts].sort((a, b) => b[1] - a[1]).slice(0, 8));
}
