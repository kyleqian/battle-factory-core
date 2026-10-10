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

/** liveSpriteOrderHost.ts's MOVE_ANIMATION key: an odd choosetwoturnanim turn of Razor Wind / Fly / Solar Beam / Sky Attack / Dig / Brick Break /
 * Bounce is 10000 + move id (Fly / Bounce: fly63, docs/next-adapters-prep61.md; Dive 291 keeps one key). */
function hostMoveId(mv: number, turn: number): number {
  return (turn & 1) === 1 && (mv === 13 || mv === 19 || mv === 76 || mv === 91 || mv === 143 || mv === 280 || mv === 340) ? 10000 + mv : mv;
}

/**
 * `turnKeyed` (prep43, docs/next-adapters-prep43.md): the move-animation event carries the host's choosetwoturnanim key. The tables
 * have no request turn, so Dig's turn is its occurrence parity per attacker side in the scenario (setup, unleash, ...) and Brick
 * Break's is "a screen was broken" = not a `-normal-` scenario. Without it (the original replay) Dig's unleash is fed the setup plan.
 * prep45 (docs/next-adapters-prep45.md): Solar Beam (76) is keyed like Dig, by occurrence parity per attacker side.
 * plans48 (docs/next-adapters-plans48.md): Razor Wind (13) likewise.
 */
export function replayCrossBodyCorpus(options: Readonly<{ turnKeyed?: boolean }> = {}) {
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
    const occurrences = new Map<string, number>();
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
      let turn = 0;
      if (options.turnKeyed && side !== null && (mv === 13 || mv === 19 || mv === 76 || mv === 91 || mv === 340)) {
        turn = occurrences.get(`${mv}:${side}`) ?? 0;
        occurrences.set(`${mv}:${side}`, turn + 1);
      }
      if (options.turnKeyed && mv === 280) turn = scenario.file.includes("-normal-") ? 0 : 1;
      // plans48: the host keys Present's PresentHeal branch (MOVE_ANIMATION damage <= 0) as 20217; the corpus has no damage argument,
      // so the branch is read from the body's own allocation count (PresentDamage creates 6 sprites).
      const presentHeal = options.turnKeyed && mv === 217 && unit.windows.reduce((n, w) => n + (w.C?.length ?? 0), 0) !== 6;
      // plans69: Magnitude's gAnimMovePower > 99 branch is 20222; the intense body creates sprites, the normal one is the empty plan.
      const magnitudeIntense = options.turnKeyed && mv === 222 && unit.windows.reduce((n, w) => n + (w.C?.length ?? 0), 0) > 0;
      tracker = applySpriteOrderPresentationEvent(tracker, mv === 0 || side === null
        ? { kind: "invalidate", reason: "mv-0 / unattributed body" }
        : { kind: "move-animation", moveId: presentHeal ? 20217 : magnitudeIntense ? 20222 : hostMoveId(mv, turn), attackerSide: side });
    });
  }
  return { scenarios: scenarios.length, skipped, edges, firstEdges, known, laterKnown, exact, mismatched, mismatches, gapShapes, otherSamples };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = replayCrossBodyCorpus({ turnKeyed: process.argv.includes("--turn-keyed") });
  const { otherSamples, ...summary } = result;
  console.log(JSON.stringify({ ...summary, mismatches: result.mismatches.slice(0, 10) }));
  const counts = new Map<string, number>();
  for (const sample of otherSamples) counts.set(sample.replace(/\d+/g, "s"), (counts.get(sample.replace(/\d+/g, "s")) ?? 0) + 1);
  console.log([...counts].sort((a, b) => b[1] - a[1]).slice(0, 8));
}
