// prep47 (C): per-window ROM check of the Factory AI's voluntary switch span (prep47AiSwitchExtract.py) against candidate production
// plans, with the production plan cursor (spriteOrderProvider.ts applySpriteOrderUnitPlan; plan text decoded by decodeSpriteOrderPlan):
// start from the span's ROM free order F0, apply the plan prefix through window k and require created / destroyed slots and F after
// window k to equal the ROM window k; the tracker after the span must equal the next body's first-frame free order.
//   recall(o8)+summary+send-in: the opponent analogue of the player's recall plan (spriteOrderRecallPlanText with the opponent battler,
//     slot 8 at the known entry) with the next-mon summary (SPRITE_ORDER_UNIT_PLAN_TEXTS.summary) created in the window of its 5th
//     destroy, then the observed send-in tail;
//   ...+nextSendOut: the same recall + summary, then the existing post-KO SPRITE_ORDER_UNIT_PLAN_TEXTS.nextSendOut (control).
// usage: node --experimental-strip-types tools/integration/prep47AiSwitchCheck.ts <ai-switch-units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan, SPRITE_ORDER_UNIT_PLAN_TEXTS, spriteOrderRecallPlanText } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor } from "../../src/engine/spriteOrderProvider.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Job { identicalAB: boolean; F0?: number[]; windows?: Win[]; plan?: string; nextBodyF0?: number[] }
const [input, output] = process.argv.slice(2) as [string, string];
const jobs = (JSON.parse(readFileSync(input, "utf8")) as { jobs: Record<string, Job> }).jobs;
const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);

/** Shift every n-index of a unit plan text by `offset` (c1.k summary references become absolute n-indices of the summary unit). */
const shift = (text: string, offset: number, summaryAt: number) => text.split(";").map((part) => part.replace(/(c1\.)?(\d+)/g,
  (m, c, n) => (c ? `${summaryAt + Number(n)}` : `${offset + Number(n)}`))).join(";");
const recall = spriteOrderRecallPlanText(8).split(";");
// recall windows 0..19 = Cf x16, D0, D1, D2,o8, D3; the summary (n16..n22) is created in the window of D4.
const recallWithSummary = [...recall.slice(0, 20), `${SPRITE_ORDER_UNIT_PLAN_TEXTS.summary}/${recall[20]}`, ...recall.slice(21)].join(";");
const observedSendIn = "Cff;Cf;Dc1.6,c1.5,c1.4,c1.3,c1.2,c1.1,c1.0;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;D0;D3;D4;D5;D6;D7;D8;D9;D10;D11;D12;D13;D14;D15;D2;D16;D17";
const CANDIDATES: Record<string, string> = {
  "recall(o8)+summary+send-in": `${recallWithSummary};${shift(observedSendIn, 23, 16)}`,
  "recall(o8)+summary+nextSendOut": `${recallWithSummary};${shift(SPRITE_ORDER_UNIT_PLAN_TEXTS.nextSendOut, 23, 16)}`,
};

function check(job: Job, text: string) {
  const plan = decodeSpriteOrderPlan(text);
  const start = createSpriteOrderPlanCursor({ known: true, free: job.F0!, pendingDestroyed: [] });
  const windows = job.windows!;
  let exact = 0, firstMismatch: number | null = null, cursor = start;
  for (let k = 0; k < Math.min(plan.length, windows.length); k++) {
    const before = cursor;
    cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
    const rom = windows[k]!;
    if (!cursor.order.known) { firstMismatch ??= k; break; }
    const created = cursor.occupied.filter((s) => !before.occupied.includes(s)).sort((l, r) => l - r);
    const destroyed = before.occupied.filter((s) => !cursor.occupied.includes(s)).sort((l, r) => l - r);
    const ok = same(created, rom.C.map(([s]) => s).sort((l, r) => l - r)) && same(destroyed, [...rom.D].sort((l, r) => l - r)) && same(cursor.order.free, rom.F);
    if (ok) exact += 1; else firstMismatch ??= k;
  }
  const edge = cursor.order.known && plan.length === windows.length && same(cursor.order.free, job.nextBodyF0!);
  return { windows: windows.length, planWindows: plan.length, exact, firstMismatch, nextBodyEdgeExact: edge };
}

const result: Record<string, unknown> = {};
const totals: Record<string, { jobs: number; allWindowsExact: number; edgeExact: number }> = {};
for (const [id, job] of Object.entries(jobs).sort(([l], [r]) => l.localeCompare(r))) {
  if (!job.windows) { result[id] = { reached: false }; continue; }
  const checks: Record<string, unknown> = {};
  for (const [name, text] of Object.entries(CANDIDATES)) {
    const c = check(job, text);
    checks[name] = c;
    const t = (totals[name] ??= { jobs: 0, allWindowsExact: 0, edgeExact: 0 });
    t.jobs += 1; if (c.exact === c.windows && c.planWindows === c.windows) t.allWindowsExact += 1; if (c.nextBodyEdgeExact) t.edgeExact += 1;
  }
  result[id] = { reached: true, identicalAB: job.identicalAB, observedEqualsCandidate: job.plan === CANDIDATES["recall(o8)+summary+send-in"], checks };
}
writeFileSync(output, JSON.stringify({ schema: "prep47-ai-switch-check/v1", candidates: CANDIDATES, totals, jobs: result }, null, 1) + "\n");
console.log(JSON.stringify(totals));
