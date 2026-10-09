// prep47 (B): per-window ROM check of the battle-start order seeds against the prep47 seed receipts (prep47SeedExtract.py).
// Per job: (1) the ROM windows before the first allocation inside an animation script / the prompt pair must be exactly the BattleLab
// ordinary-singles entry stream without its prompt pair (spriteOrderProvider.ts BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS: created
// set, destroy order) and leave F = knownEntryPrePromptSpriteOrderState; (2) the remaining windows are walked with the production
// tracker: an in-script 1-sprite create + paired destroy is a stat copy (stat-animation 22: F after the pair), a 2-sprite `f` create +
// paired destroy is the action-prompt bounce pair (action-prompt / actions-committed: created / destroyed slots and F per window);
// (3) the tracker after the walk must equal the ROM free order at the first move body (F0). (4) The class's battle-start semantic events
// (the census shapes: Intimidate triples and Trace / prevented-Intimidate messages; Intimidate triple first in INTIMIDATE_TRACE, as on
// census seed 0..299) go through the src seedLiveSpriteOrderHostFromBattleStart + the first beginLiveSpriteOrderTurn: "exact" when its
// free order equals F0, "unknown" when the seed is unknown history (master src), "mismatch" otherwise.
// usage: node --experimental-strip-types tools/integration/prep47SeedCheck.ts <seed-units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import type { BattleKernelSemanticEvent } from "../../src/engine/battleDecisionBoundary.ts";
import { beginLiveSpriteOrderTurn, seedLiveSpriteOrderHostFromBattleStart } from "../../src/engine/liveSpriteOrderHost.ts";
import { applySpriteOrderPresentationEvent, createSpriteOrderTracker, type SpriteOrderTracker } from "../../src/engine/spriteOrderEventTransform.ts";
import {
  BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS, knownEntryPrePromptSpriteOrderState, knownEntrySpriteOrderState,
} from "../../src/engine/spriteOrderProvider.ts";

interface Win { f: number; act: boolean; C: [number, string][]; D: number[]; F: number[] }
interface Job { class: string; leads: unknown; identicalAB: boolean; rowsSha256A: string; firstMove: number | null; F0: number[] | null; windows: Win[] }
const [input, output] = process.argv.slice(2) as [string, string];
const jobs = (JSON.parse(readFileSync(input, "utf8")) as { jobs: Record<string, Job> }).jobs;
const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);
const sorted = (xs: readonly number[]) => [...xs].sort((l, r) => l - r);

let sequence = 0;
const ev = (payload: Record<string, unknown>) => ({ sequence: sequence++, payload }) as unknown as BattleKernelSemanticEvent;
const message = (messageId: string) => ev({ kind: "message", messageId, substitutions: [] });
const intimidate = (target: 0 | 1) => [ev({ kind: "stat-stage-change", battler: target, stat: "attack" }),
  ev({ kind: "animation", animationId: "STATS_CHANGE", battler: target, target, arguments: ["22"] }), message("STRINGID_PKMNCUTSATTACKWITH")];
const CLASS_EVENTS: Record<string, BattleKernelSemanticEvent[]> = {
  NONE: [],
  INTIMIDATE_1: intimidate(1),
  TRACE: [message("STRINGID_PKMNTRACED")],
  INTIMIDATE_PREVENTED: [message("STRINGID_PREVENTEDFROMWORKING")],
  INTIMIDATE_BOTH: [...intimidate(1), ...intimidate(0)],
  INTIMIDATE_TRACE: [...intimidate(1), message("STRINGID_PKMNTRACED")],
};
const CLASS_TOKENS: Record<string, string> = { NONE: "P", INTIMIDATE_1: "SP", TRACE: "P", INTIMIDATE_PREVENTED: "P", INTIMIDATE_BOTH: "SSP", INTIMIDATE_TRACE: "SP" };

const entry = BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS.slice(0, BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS.length - 2);
const prePrompt = knownEntryPrePromptSpriteOrderState("battle-lab-ordinary-singles");
const routesAgree = same(prePrompt.free, knownEntryPrePromptSpriteOrderState("ordinary-factory").free)
  && same(knownEntrySpriteOrderState("battle-lab-ordinary-singles").free, knownEntrySpriteOrderState("ordinary-factory").free);
const totals = { jobs: 0, identicalAB: 0, entryPrefixExact: 0, windowsChecked: 0, windowsExact: 0, edgeExact: 0, tokensAsClass: 0,
  seed: { exact: 0, unknown: 0, mismatch: 0 } };
const result: Record<string, unknown> = {};
for (const [id, job] of Object.entries(jobs).sort(([l], [r]) => l.localeCompare(r))) {
  totals.jobs += 1; if (job.identicalAB) totals.identicalAB += 1;
  const problems: string[] = [];
  const w = job.windows;
  const prefixOk = w.length >= entry.length && entry.every(([created, destroyed], k) =>
    same(sorted(w[k]!.C.map(([s]) => s)), sorted(created)) && same(w[k]!.D, destroyed)) && same(w[entry.length - 1]!.F, prePrompt.free);
  if (prefixOk) totals.entryPrefixExact += 1; else problems.push("entry prefix != BattleLab entry stream without the prompt pair");
  let tracker: SpriteOrderTracker = createSpriteOrderTracker(prePrompt);
  let tokens = "";
  for (let k = entry.length; k < w.length;) {
    const a = w[k]!, b = w[k + 1];
    const made = a.C.map(([s]) => s);
    const paired = b !== undefined && b.C.length === 0 && a.D.length === 0 && same(sorted(b.D), sorted(made)) && a.C.every(([, m]) => m === "f");
    if (paired && made.length === 1 && a.act) {
      tokens += "S"; totals.windowsChecked += 2;
      tracker = applySpriteOrderPresentationEvent(tracker, { kind: "stat-animation", argument: 22 });
      if (tracker.cursor.order.known && same(tracker.cursor.order.free, b!.F)) totals.windowsExact += 2; else problems.push(`f${a.f} stat copy F`);
    } else if (paired && made.length === 2 && !a.act) {
      tokens += "P"; totals.windowsChecked += 2;
      const before = sorted(tracker.cursor.occupied);
      tracker = applySpriteOrderPresentationEvent(tracker, { kind: "action-prompt" });
      const created = sorted(tracker.cursor.occupied).filter((s) => !before.includes(s));
      if (tracker.cursor.order.known && same(created, sorted(made)) && same(tracker.cursor.order.free, a.F)) totals.windowsExact += 1;
      else problems.push(`f${a.f} action-prompt`);
      tracker = applySpriteOrderPresentationEvent(tracker, { kind: "actions-committed" });
      if (tracker.cursor.order.known && same(tracker.cursor.order.free, b!.F)) totals.windowsExact += 1; else problems.push(`f${b!.f} actions-committed`);
    } else { tokens += `?(f${a.f})`; problems.push(`f${a.f} unclassified window`); break; }
    k += 2;
  }
  const edge = job.F0 !== null && tracker.cursor.order.known && same(tracker.cursor.order.free, job.F0);
  if (edge) totals.edgeExact += 1; else problems.push("first move edge != tracker");
  if (tokens === CLASS_TOKENS[job.class]) totals.tokensAsClass += 1; else problems.push(`tokens ${tokens} != class ${CLASS_TOKENS[job.class]}`);
  const seeded = beginLiveSpriteOrderTurn(seedLiveSpriteOrderHostFromBattleStart(CLASS_EVENTS[job.class]!), 1, true).tracker;
  const seed = !seeded.cursor.order.known ? "unknown" : job.F0 !== null && same(seeded.cursor.order.free, job.F0) ? "exact" : "mismatch";
  totals.seed[seed] += 1;
  result[id] = { class: job.class, leads: job.leads, identicalAB: job.identicalAB, rowsSha256A: job.rowsSha256A, windows: w.length,
    tokens, firstMove: job.firstMove, seed, seedInvalidReason: seeded.invalidReason, problems };
}
writeFileSync(output, JSON.stringify({ schema: "prep47-seed-check/v1", routesAgree, entryWindows: entry.length, totals, jobs: result }, null, 1) + "\n");
console.log(JSON.stringify({ routesAgree, ...totals }));
