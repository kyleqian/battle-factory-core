/**
 * prep46 chain check (s10aLendChainCheck.ts precedent, generalized to ANY next consumer): start from a words body's ROM activation free order,
 * carry it through the body with the body's RAM-read words (prep46Carry.ts models), then apply the PRODUCTION tracker's existing plans
 * (applySpriteOrderPresentationEvent) for every following unit, and compare at every unit boundary with the ROM free order, ending at the next
 * consumer (the next move body: its activation free order = the order a seam-resolved deferred lend would hand it, spriteOrderTrackerLend).
 * A General_Rain (RAIN_CONTINUES) body in the chain is itself carried with its words (generalRainModel), the s2 design.
 * Gap units are mapped to production events from their ROM allocation windows: one create destroyed by the next window = the hit-animation
 * blip; a pair create = action-prompt; destroying that pair = actions-committed. mv-0 bodies are named by job (Sand / Mud: the accuracy -1
 * stat animation, class 1 argument 20; Rain: General_Rain).
 * usage: node --experimental-strip-types tools/integration/prep46Chain.ts <units.json> <out.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { applySpriteOrderPresentationEvent, createSpriteOrderTracker, spriteOrderTrackerLend, type SpriteOrderPresentationEvent } from "../../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, spriteOrderWithOccupiedPrefix } from "../../src/engine/spriteOrderProvider.ts";
import { compareBody, dirtModel, generalRainModel, rainDanceModel, type Job, type Unit } from "./prep46Carry.ts";

const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);
const full = (free: readonly number[]) => spriteOrderWithOccupiedPrefix({ known: true as const, free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);

function gapEvents(unit: Unit): SpriteOrderPresentationEvent[] | string {
  const out: SpriteOrderPresentationEvent[] = [];
  let pair: number[] | null = null;
  for (let k = 0; k < unit.windows.length; k += 1) {
    const w = unit.windows[k]!, next = unit.windows[k + 1];
    if (w.C.length === 1 && w.D.length === 0 && next && next.C.length === 0 && same(next.D, [w.C[0]![0]])) {
      out.push({ kind: "hit-animation", targetVisible: true }); k += 1;
    } else if (w.C.length === 2 && w.D.length === 0 && pair === null) {
      out.push({ kind: "action-prompt" }); pair = w.C.map(([s]) => s);
    } else if (w.C.length === 0 && pair !== null && same([...w.D].sort((a, b) => a - b), [...pair].sort((a, b) => a - b))) {
      out.push({ kind: "actions-committed" }); pair = null;
    } else return `unclassified window f${w.f} C${JSON.stringify(w.C)} D${JSON.stringify(w.D)}`;
  }
  return out;
}

const jobs = JSON.parse(readFileSync(process.argv[2]!, "utf8")).jobs as Record<string, Job>;
const rows: Record<string, unknown>[] = [];
for (const [name, job] of Object.entries(jobs)) {
  job.units.forEach((unit, index) => {
    if (unit.kind !== "body" || ![28, 189, 240].includes(unit.mv!)) return;
    const steps: string[] = [];
    const act = full(unit.F0)!;
    const model = unit.mv === 240 ? rainDanceModel(unit, act, 0) : dirtModel(job, unit, act);
    let free: readonly number[] = compareBody(unit, model).postFree;
    let tracker = createSpriteOrderTracker({ known: true, free, pendingDestroyed: [] });
    let verdict = "no consumer in trace", consumer: string | null = null, boundaries = 0, boundaryMismatch = 0;
    steps.push(`carry ${unit.mv}`);
    for (let j = index + 1; j < job.units.length; j += 1) {
      const u = job.units[j]!;
      const lend = spriteOrderTrackerLend(tracker);
      if (lend === null) { verdict = `tracker unknown before ${u.kind} f${u.frame} (${tracker.invalidReason})`; break; }
      boundaries += 1;
      if (!same(lend, u.F0)) boundaryMismatch += 1;
      if (u.kind === "body" && u.mv !== 0) {
        consumer = `body ${u.mv} f${u.frame}`;
        verdict = same(lend, u.F0) ? "EXACT" : "diff";
        break;
      }
      if (!same(lend, u.F0)) { verdict = `boundary diff before ${u.kind} f${u.frame}`; break; }
      if (u.kind === "gap") {
        const ev = gapEvents(u);
        if (typeof ev === "string") { verdict = ev; break; }
        for (const e of ev) tracker = applySpriteOrderPresentationEvent(tracker, e);
        if (ev.length) steps.push(ev.map((e) => e.kind).join("+"));
      } else if (job.unit === "BODY240") {
        // General_Rain: the words unit carried with its own RAM-read words (no production plan exists)
        const m = generalRainModel(u, full(lend)!);
        free = compareBody(u, m).postFree;
        tracker = createSpriteOrderTracker({ known: true, free, pendingDestroyed: [] });
        steps.push("carry General_Rain");
      } else {
        tracker = applySpriteOrderPresentationEvent(tracker, { kind: "stat-animation", argument: 20 });
        steps.push("stat-animation 20");
      }
    }
    rows.push({ job: name, body: `${unit.mv} f${unit.frame}`, identicalAB: job.identicalAB, steps, boundaries, boundaryMismatch, consumer, verdict });
    console.log(name, unit.mv, unit.frame, "->", consumer, verdict, `boundaries ${boundaries - boundaryMismatch}/${boundaries}`, steps.join(" > "));
  });
}
writeFileSync(process.argv[3]!, `${JSON.stringify({ schema: "prep46-chain/v1", chains: rows }, null, 1)}\n`);
