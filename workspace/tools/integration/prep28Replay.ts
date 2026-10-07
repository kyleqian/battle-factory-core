// prep28: production event-transform replay over the committed + ext + prep28 body-event tables (the spriteOrderCrossBodyCorpusReplay.ts recipe, strict per scenario),
// with per-(move, side) tallies.  Run against master src (before) and against the temporary prep28 src patch (after); Sky Attack bodies are keyed
// 10143 on odd occurrences (the strike) as the patched host does (request.turn === 1).
//   run: node --experimental-strip-types tools/integration/prep28Replay.ts <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { applySpriteOrderPresentationEvent, createSpriteOrderTracker, type SpriteOrderTracker } from "../../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";

interface Window { f: number; C?: [number, string][]; D?: number[] }
interface Unit { kind: "gap" | "body"; windows: Window[]; mv?: number; observedFreeAtEdge?: number[]; truncated?: boolean }
interface Scenario { file: string; move: number | null; side: "player" | "opponent" | null; freeAtFirstEdge: number[]; units: Unit[] }
const read = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")) as { scenarios: Scenario[] };
const ownerSide = (s: Scenario, mv: number) => s.side === null ? null : mv === s.move ? s.side : s.side === "opponent" ? "player" : "opponent";

function applyGap(tracker: SpriteOrderTracker, windows: readonly Window[]): SpriteOrderTracker {
  let next = tracker;
  for (let index = 0; index < windows.length;) {
    const w = windows[index]!, following = windows[index + 1];
    const created = (w.C ?? []).map(([slot]) => slot);
    const pairs = following && !following.C && following.D && !w.D && following.D.length === created.length && created.every(slot => following.D!.includes(slot));
    if (created.length === 1 && w.C![0]![1] === "f" && pairs) { next = applySpriteOrderPresentationEvent(next, { kind: "hit-animation", targetVisible: true }); index += 2; }
    else if (created.length === 2 && w.C!.every(([, m]) => m === "f") && pairs) {
      next = applySpriteOrderPresentationEvent(applySpriteOrderPresentationEvent(next, { kind: "action-prompt" }), { kind: "actions-committed" }); index += 2;
    } else return applySpriteOrderPresentationEvent(next, { kind: "invalidate", reason: "unclassified gap window" });
  }
  return next;
}

const scenarios = [...read("sprite-order-body-events.json").scenarios, ...read("sprite-order-body-events-ext.json").scenarios, ...read("prep28/body-events.json").scenarios];
const perKey: Record<string, { edges: number; known: number; exact: number; mismatched: number }> = {};
const perFile: Record<string, { edge: string; known: boolean; exact: boolean | null }[]> = {};
const total = { scenarios: scenarios.length, skipped: 0, edges: 0, known: 0, exact: 0, mismatched: 0 };
const mismatches: { file: string; unit: number; key: string }[] = [];
for (const scenario of scenarios) {
  if (JSON.stringify(scenario.freeAtFirstEdge) !== JSON.stringify(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER)) { total.skipped += 1; continue; }
  let tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  const occurrence: Record<string, number> = {};
  const rows: { edge: string; known: boolean; exact: boolean | null }[] = (perFile[scenario.file] = []);
  scenario.units.forEach((unit, index) => {
    if (unit.kind === "gap") { tracker = applyGap(tracker, unit.windows); return; }
    const mv = unit.mv ?? 0;
    if (unit.truncated) { tracker = applySpriteOrderPresentationEvent(tracker, { kind: "invalidate", reason: "truncated body" }); return; }
    const side = ownerSide(scenario, mv);
    const n = (occurrence[`${mv}:${side}`] = (occurrence[`${mv}:${side}`] ?? -1) + 1);
    const eventMove = mv === 143 && n % 2 === 1 ? 10143 : mv;
    const key = `${eventMove}:${side}`;
    const stat = (perKey[key] ??= { edges: 0, known: 0, exact: 0, mismatched: 0 });
    stat.edges += 1; total.edges += 1;
    const known = tracker.cursor.order.known;
    let exact: boolean | null = null;
    if (known) {
      stat.known += 1; total.known += 1;
      exact = JSON.stringify(tracker.cursor.order.free) === JSON.stringify(unit.observedFreeAtEdge);
      if (exact) { stat.exact += 1; total.exact += 1; } else { stat.mismatched += 1; total.mismatched += 1; mismatches.push({ file: scenario.file, unit: index, key }); }
    }
    rows.push({ edge: key, known, exact });
    tracker = applySpriteOrderPresentationEvent(tracker, mv === 0 || side === null ? { kind: "invalidate", reason: "mv-0 / unattributed body" }
      : { kind: "move-animation", moveId: eventMove, attackerSide: side });
  });
}
const out = { total, mismatches: mismatches.slice(0, 20), perKey, perFile };
writeFileSync(process.argv[2]!, JSON.stringify(out) + "\n");
console.log(JSON.stringify({ ...total, mismatches: mismatches.slice(0, 5) }));
