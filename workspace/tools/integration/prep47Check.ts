// prep47 (A): per-window ROM check of the order events a retained locked-action continuation applies at its turn boundary, against
// the prep47 unit receipts (prep47Extract.py). For every gap unit of every job: start the production tracker
// (spriteOrderEventTransform.ts createSpriteOrderTracker / applySpriteOrderPresentationEvent) from the ROM free order at the gap's
// first frame and walk its allocation windows: a 2-sprite `f` create window whose two slots the next window destroys is the
// action-prompt bounce pair (apply action-prompt: created slots + F must equal that window; actions-committed: destroyed slots + F
// must equal the next), a 1-sprite create + paired destroy is the hit blip (hit-animation; F after the pair). Anything else stops the
// gap ("other"). The tracker's free order after the gap must equal the next unit's first-frame ROM free order (edge exact).
// Spans: between consecutive bodies of the job's locked move on the locked side, the number of prompt pairs (P) and the gap tokens.
// usage: node --experimental-strip-types tools/integration/prep47Check.ts <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; windows: Win[] }
interface Job { unit: string; move: number; base: string; variant: unknown; units: Unit[]; identicalAB: boolean; rowsSha256A: string }

const [input, output] = process.argv.slice(2) as [string, string];
const jobs = (JSON.parse(readFileSync(input, "utf8")) as { jobs: Record<string, Job> }).jobs;
const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);
const sorted = (xs: readonly number[]) => [...xs].sort((l, r) => l - r);
const occupiedOf = (t: SpriteOrderTracker) => sorted(t.cursor.occupied);

const result: Record<string, unknown> = {};
const totals = { jobs: 0, identicalAB: 0, gaps: 0, promptPairs: 0, promptPairsExact: 0, hitBlips: 0, hitBlipsExact: 0, otherWindows: 0,
  edgesChecked: 0, edgesExact: 0, spans: 0, spansAsExpected: 0 };
for (const [id, job] of Object.entries(jobs).sort(([l], [r]) => l.localeCompare(r))) {
  totals.jobs += 1; if (job.identicalAB) totals.identicalAB += 1;
  const lockedSide = job.unit.startsWith("OPP_") ? "opponent" : "player";
  const tokens: string[] = [];
  const problems: string[] = [];
  const gapPairs: number[] = [];
  job.units.forEach((unit, index) => {
    if (unit.kind === "body") {
      tokens.push(`${unit.label.replace("body ", "B").replace(":opponent", "o").replace(":player", "p")}${unit.truncated ? "(truncated)" : ""}`);
      return;
    }
    totals.gaps += 1;
    let tracker = createSpriteOrderTracker({ known: true, free: unit.F0, pendingDestroyed: [] });
    let text = "", pairs = 0, stopped = false;
    const step = (event: SpriteOrderPresentationEvent, rom: Win, check: "created" | "destroyed") => {
      const before = occupiedOf(tracker);
      tracker = applySpriteOrderPresentationEvent(tracker, event);
      const after = occupiedOf(tracker);
      const created = after.filter((s) => !before.includes(s)), destroyed = before.filter((s) => !after.includes(s));
      const ok = tracker.cursor.order.known && same(tracker.cursor.order.free, rom.F)
        && (check === "created" ? same(created, sorted(rom.C.map(([s]) => s))) && destroyed.length === 0
          : same(destroyed, sorted(rom.D)) && created.length === 0);
      if (!ok) problems.push(`gap ${index} f${rom.f} ${event.kind}: created ${created} destroyed ${destroyed} F ${tracker.cursor.order.known ? "!=" : "unknown"}`);
      return ok;
    };
    for (let k = 0; k < unit.windows.length && !stopped;) {
      const w = unit.windows[k]!, n = unit.windows[k + 1];
      const made = w.C.map(([s]) => s);
      const paired = n !== undefined && n.C.length === 0 && w.D.length === 0 && same(sorted(n.D), sorted(made)) && w.C.every(([, m]) => m === "f");
      if (paired && made.length === 2) {
        totals.promptPairs += 1; pairs += 1; text += "P";
        const a = step({ kind: "action-prompt" }, w, "created");
        const b = step({ kind: "actions-committed" }, n!, "destroyed");
        if (a && b) totals.promptPairsExact += 1;
        k += 2;
      } else if (paired && made.length === 1) {
        totals.hitBlips += 1; text += "H";
        const before = tracker;
        tracker = applySpriteOrderPresentationEvent(tracker, { kind: "hit-animation", targetVisible: true });
        if (tracker.cursor.order.known && same(tracker.cursor.order.free, n!.F)) totals.hitBlipsExact += 1;
        else problems.push(`gap ${index} f${w.f} hit-animation: F ${tracker.cursor.order.known ? "!=" : "unknown"}`);
        void before;
        k += 2;
      } else {
        totals.otherWindows += 1; text += `?(f${w.f} C${JSON.stringify(made)} D${JSON.stringify(w.D)})`; stopped = true;
      }
    }
    const next = job.units[index + 1];
    if (!stopped && next !== undefined) {
      totals.edgesChecked += 1;
      if (tracker.cursor.order.known && same(tracker.cursor.order.free, next.F0)) totals.edgesExact += 1;
      else problems.push(`gap ${index}: edge free order != next unit F0`);
    }
    gapPairs[index] = pairs;
    tokens.push(`[${text}]`);
  });
  // Spans between consecutive bodies of the job's move on the locked side: prompt pairs inside the span.
  const locked = job.units.map((u, i) => [u, i] as const).filter(([u]) => u.kind === "body" && u.label === `body ${job.move}:${lockedSide}`).map(([, i]) => i);
  const spans = locked.slice(1).map((end, k) => {
    const start = locked[k]!;
    let pairs = 0;
    for (let i = start + 1; i < end; i++) pairs += gapPairs[i] ?? 0;
    return { from: start, to: end, promptPairs: pairs, between: tokens.slice(start + 1, end).join(" ") };
  });
  // Expected: opponent locked -> the player is prompted once per turn boundary (1; Hyper Beam's span also holds the bodyless recharge
  // turn: two boundaries, 2); player locked -> the first locked span has none (0).
  const expected = lockedSide === "opponent" ? spans.map(() => job.unit === "OPP_HYPER_BEAM" ? 2 : 1) : spans.slice(0, 1).map(() => 0);
  const asExpected = expected.map((e, k) => spans[k]!.promptPairs === e);
  totals.spans += expected.length; totals.spansAsExpected += asExpected.filter(Boolean).length;
  result[id] = { class: job.unit, move: job.move, variant: job.variant, identicalAB: job.identicalAB, rowsSha256A: job.rowsSha256A,
    sequence: tokens.join(" "), spans, spansExpected: expected, spansAsExpected: asExpected, problems };
}
writeFileSync(output, JSON.stringify({ schema: "prep47-check/v1", totals, jobs: result }, null, 1) + "\n");
console.log(JSON.stringify(totals));
