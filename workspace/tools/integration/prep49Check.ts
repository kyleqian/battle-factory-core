// prep49: per-window ROM check of the order-host stop classes (prep49Extract.py units) against the production unit plans, unit by unit
// (prep45Check / prep47AiSwitchCheck method): from the unit's start cursor apply the unit plan prefix through each allocation window;
// created / destroyed slots and the free order F must equal the ROM window. Between units the PRODUCTION transform
// (applySpriteOrderPresentationEvent) is applied to the same event; it must stay known and equal the plan cursor's free order
// ("production consistent"), and after the span its free order must equal the ROM free order at the next body edge.
//   BP_PLY   party-menu-reset (the party menu's exit ResetSpriteData; ROM F0 = identity), battle-reshow (both), forced-switch-out
//            {player} (Cmd_returntoball: skipAnim `D o<slot>`), switch-in-start / -finish {player}; edge = the next body.
//   BP_OPP   from the ROM free order after the Baton Pass body's last anim-script window: forced-switch-out {opponent},
//            switch-in-start / -finish {opponent}; edge = the next body.
//   EXP_*    party-menu-reset, battle-reshow (neither battler: "Cfee;Cfee;Cf"), switch-in-start / -finish {player}, party-summary-next,
//            party-summary-hide, next-mon-send-out, action-prompt (the next turn's prompt pair create): every window to the prompt.
// usage: node --experimental-strip-types tools/integration/prep49Check.ts <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, SPRITE_ORDER_UNIT_PLAN_TEXTS,
  type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan } from "../../src/engine/spriteOrderProvider.ts";

interface Win { f: number; act: number; mv: number; C: [number, string][]; D: number[]; F: number[] }
interface Job { class: string; identicalAB: boolean; F0: number[]; windows: Win[]; edges: { f: number; mv: number; F: number[] }[] }
const [input, output] = process.argv.slice(2) as [string, string];
const jobs = (JSON.parse(readFileSync(input, "utf8")) as { jobs: Record<string, Job> }).jobs;
const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);
const sorted = (xs: readonly number[]) => [...xs].sort((l, r) => l - r);
const T = SPRITE_ORDER_UNIT_PLAN_TEXTS;
const RESHOW_NEITHER = "Cfee;Cfee;Cf";

type Unit = { event: SpriteOrderPresentationEvent; plan: (t: SpriteOrderTracker) => string };
const forced = (side: "player" | "opponent"): Unit => ({ event: { kind: "forced-switch-out", side }, plan: (t) => `Do${t.battlerSlots[side]}` });
const switchIn = (side: "player" | "opponent"): Unit[] => [
  { event: { kind: "switch-in-start", side }, plan: () => T.switchInStart }, { event: { kind: "switch-in-finish", side }, plan: () => T.switchInParticles }];
const SEQUENCES: Record<string, Unit[]> = {
  BP_PLY: [{ event: { kind: "battle-reshow", playerBattlerPresent: true }, plan: () => T.reshowBoth }, forced("player"), ...switchIn("player")],
  BP_OPP: [forced("opponent"), ...switchIn("opponent")],
  EXP: [{ event: { kind: "battle-reshow", playerBattlerPresent: false, opponentBattlerPresent: false } as SpriteOrderPresentationEvent, plan: () => RESHOW_NEITHER },
    ...switchIn("player"), { event: { kind: "party-summary-next" }, plan: () => T.summary }, { event: { kind: "party-summary-hide" }, plan: () => "" },
    { event: { kind: "next-mon-send-out" }, plan: () => T.nextSendOut }, { event: { kind: "action-prompt" }, plan: () => "Cff" }],
};

function check(job: Job) {
  const cls = job.class.startsWith("EXP") ? "EXP" : job.class;
  let tracker: SpriteOrderTracker, windows: Win[], edgeF: number[] | null;
  if (cls === "BP_OPP") {
    const body = job.edges[0]!;
    const after = job.windows.findIndex((w) => w.f > body.f && !w.act);
    const lastBody = job.windows[after - 1]!;
    tracker = createSpriteOrderTracker({ known: true, free: lastBody.F, pendingDestroyed: [] });
    windows = job.windows.slice(after).filter((w) => w.f < job.edges[1]!.f);
    edgeF = job.edges[1]!.F;
  } else {
    tracker = applySpriteOrderPresentationEvent(createSpriteOrderTracker({ known: true, free: job.F0, pendingDestroyed: [] }), { kind: "party-menu-reset" });
    windows = job.edges.length > 0 ? job.windows.filter((w) => w.f < job.edges[0]!.f) : job.windows;
    edgeF = job.edges[0]?.F ?? null;
  }
  const units: unknown[] = [];
  let w = 0, exact = 0, firstMismatch: number | null = null, productionKnown = true;
  for (const unit of SEQUENCES[cls]!) {
    const text = unit.plan(tracker);
    const plan = text === "" ? [] : decodeSpriteOrderPlan(text);
    const start = tracker.cursor;
    let prev = start, unitExact = 0;
    for (let k = 0; k < plan.length; k++, w++) {
      const cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
      const rom = windows[w];
      const created = cursor.occupied.filter((s) => !prev.occupied.includes(s));
      const destroyed = prev.occupied.filter((s) => !cursor.occupied.includes(s));
      const ok = rom !== undefined && cursor.order.known && same(sorted(created), sorted(rom.C.map(([s]) => s))) && same(sorted(destroyed), sorted(rom.D))
        && same(cursor.order.free, rom.F);
      if (ok) { exact++; unitExact++; } else firstMismatch ??= w;
      prev = cursor;
    }
    const whole = applySpriteOrderUnitPlan(start, plan);
    tracker = applySpriteOrderPresentationEvent(tracker, unit.event);
    const consistent = tracker.cursor.order.known && whole.order.known && same(tracker.cursor.order.free, whole.order.free);
    if (!tracker.cursor.order.known) productionKnown = false;
    // Unit edge: the first ROM window from the unit's start whose free order equals the production tracker after the unit (the ROM
    // may merge plan windows: the switch-in particles' in-window group order is unobservable); the next unit starts after it.
    let edgeAt: number | null = null;
    if (plan.length > 0 && tracker.cursor.order.known) {
      for (let j = w - plan.length; j < windows.length; j++) if (j >= 0 && same(windows[j]!.F, tracker.cursor.order.free)) { edgeAt = j; break; }
      if (edgeAt !== null) w = edgeAt + 1;
    }
    units.push({ event: unit.event.kind + ("side" in unit.event && unit.event.side ? `:${unit.event.side}` : ""), plan: text, windows: plan.length, exact: unitExact,
      productionConsistent: consistent, unitEdge: plan.length === 0 ? "no windows" : edgeAt === null ? "not found" : `exact at ROM window ${edgeAt} (f ${windows[edgeAt]!.f})`,
      ...(tracker.cursor.order.known ? {} : { productionInvalid: tracker.invalidReason }) });
    if (!tracker.cursor.order.known) break;
  }
  const unitEdges = units.filter((u) => (u as { unitEdge: string }).unitEdge.startsWith("exact")).length;
  const withWindows = units.filter((u) => (u as { windows: number }).windows > 0).length;
  return { class: job.class, identicalAB: job.identicalAB, spanWindows: windows.length, consumedWindows: w, exact, firstMismatch,
    allWindowsExact: exact === w && w === windows.length, unitEdges: `${unitEdges}/${withWindows}`, everyUnitEdgeExact: unitEdges === withWindows && w === windows.length, productionKnown,
    edge: edgeF === null ? "none in trace (span ends at the prompt create)" : productionKnown && same(tracker.cursor.order.free, edgeF) ? "exact" : "mismatch",
    units };
}

const result: Record<string, ReturnType<typeof check>> = {};
for (const [id, job] of Object.entries(jobs).sort(([l], [r]) => l.localeCompare(r))) result[id] = check(job);
const totals = Object.values(result).reduce((t, r) => {
  const c = (t[r.class] ??= { jobs: 0, identicalAB: 0, allWindowsExact: 0, everyUnitEdgeExact: 0, windows: 0, exactWindows: 0, productionKnown: 0, edgeExact: 0 });
  c.jobs++; if (r.identicalAB) c.identicalAB++; if (r.allWindowsExact) c.allWindowsExact++; if (r.everyUnitEdgeExact) c.everyUnitEdgeExact++;
  c.windows += r.spanWindows; c.exactWindows += r.exact;
  if (r.productionKnown && r.units.every((u) => (u as { productionConsistent: boolean }).productionConsistent)) c.productionKnown++;
  if (r.edge === "exact") c.edgeExact++;
  return t;
}, {} as Record<string, { jobs: number; identicalAB: number; allWindowsExact: number; everyUnitEdgeExact: number; windows: number; exactWindows: number; productionKnown: number; edgeExact: number }>);
writeFileSync(output, JSON.stringify({ schema: "prep49-check/v1", reshowNeither: RESHOW_NEITHER, totals, jobs: result }, null, 1) + "\n");
console.log(JSON.stringify(totals));
