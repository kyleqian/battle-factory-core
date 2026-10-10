// prep64: per-frame ROM check of the proposed SUBSTITUTE_FADE order plan against the prep64 unit receipts (prep64Extract.py) --
// plans51Check.ts's method and checkUnit unchanged (copied: that script runs at import): the production plan cursor
// (applySpriteOrderUnitPlan, decodeSpriteOrderPlan) applies the plan prefix through every allocation window from the ROM F at the unit
// start; created / destroyed slots and F must equal the ROM after every window; a single survivor must be destroyed by the very next
// allocation window (carry). Added here: the order hand-off -- the free order after the fade (plan applied to its F0) must equal the
// F0 of the next unit that allocates, and the next consumer body (the next animation-script body) is checked against its current production row
// (SPRITE_ORDER_PRODUCTION_BODIES, unchanged) from that F0.
// usage: node --experimental-strip-types tools/integration/prep64Check.ts <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor } from "../../src/engine/spriteOrderProvider.ts";
import { SPRITE_ORDER_PRODUCTION_BODIES, SPRITE_ORDER_PRODUCTION_PLANS } from "../../src/engine/spriteOrderProductionPlans.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
interface Trigger { frame: number; holder: string }
interface Job { profile: string; units: Unit[]; identicalAB: boolean; fadeTriggers: Trigger[] }

/** Proposed plan: General_SubstituteFade (monbg, AnimTask_SubstituteFadeToInvisible, two AnimTask_BlendBattleAnimPal,
 * AnimTask_SwapMonSpriteToFromSubstitute; no createsprite, no sprite-creating task): no allocation window. */
export const PREP64_PLANS: Readonly<Record<string, string>> = Object.freeze({ "general SUBSTITUTE_FADE": "" });

const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);

function checkUnit(unit: Unit, next: Unit | undefined, text: string) {
  const plan = decodeSpriteOrderPlan(text);
  const start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
  const problems: string[] = [];
  if (unit.windows.length !== plan.length) problems.push(`window count ${unit.windows.length} != plan ${plan.length}`);
  if (unit.strayFChanges !== 0) problems.push(`${unit.strayFChanges} F changes without allocation`);
  let frames = 0, cursor = start;
  for (let k = 0; k < Math.min(plan.length, unit.windows.length); k++) {
    const before = cursor;
    cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
    const rom = unit.windows[k]!;
    if (!cursor.order.known) { problems.push(`window ${k} f${rom.f}: plan did not resolve`); break; }
    const created = cursor.occupied.filter(slot => !before.occupied.includes(slot));
    const destroyed = before.occupied.filter(slot => !cursor.occupied.includes(slot));
    const romCreated = rom.C.map(([slot]) => slot).sort((l, r) => l - r);
    const romDestroyed = [...rom.D].sort((l, r) => l - r);
    if (!same(created, romCreated) || !same(destroyed, romDestroyed) || !same(cursor.order.free, rom.F)) {
      problems.push(`window ${k} f${rom.f}: created ${created}/${romCreated} destroyed ${destroyed}/${romDestroyed} F ${same(cursor.order.free, rom.F) ? "==" : "!="}`);
    }
    frames += 1;
  }
  const survivors = cursor.order.known ? cursor.occupied.filter(slot => !start.occupied.includes(slot)) : [];
  let carry: string | null = null;
  if (survivors.length === 1) {
    const first = next?.windows[0];
    const carried = applySpriteOrderUnitPlan(cursor, [{ D: [["o", survivors[0]!]] }]);
    if (!first || first.C.length !== 0 || !same(first.D, survivors) || !same(carried.order.free, first.F)) {
      problems.push(`carry: next window ${JSON.stringify(first && { C: first.C, D: first.D })} vs survivor ${survivors}`);
    } else { carry = `f${first.f} D${survivors[0]}`; frames += 1; }
  } else if (survivors.length > 1) problems.push(`${survivors.length} survivors`);
  return { problems, frames, survivors: survivors.length, carry, free: cursor.order.known ? cursor.order.free : null };
}

const input = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as { jobs: Record<string, Job> };
const instances: Record<string, unknown>[] = [];
const nextConsumers: Record<string, unknown>[] = [];
let notIdentical = 0;
for (const [name, job] of Object.entries(input.jobs)) {
  if (!job.identicalAB) notIdentical += 1;
  job.units.forEach((unit, index) => {
    if (unit.label !== "general SUBSTITUTE_FADE" || unit.truncated) return;
    const next = job.units.slice(index + 1).find(u => u.windows.length > 0);
    const checked = checkUnit(unit, next, PREP64_PLANS[unit.label]!);
    const holder = job.fadeTriggers.find(t => t.frame === unit.frame)?.holder ?? "?";
    // order hand-off: the next allocating unit starts from the fade's resulting free order
    const handoff = next === undefined ? null : checked.free !== null && same(checked.free, next.F0);
    if (handoff === false) checked.problems.push(`hand-off: next unit ${next!.label} @${next!.frame} F0 != free order after the fade`);
    instances.push({ job: name, profile: job.profile, holder, frame: unit.frame, matched: checked.problems.length === 0, framesChecked: checked.frames,
      problems: checked.problems, nextAllocatingUnit: next ? { label: next.label, frame: next.frame, handoffExact: handoff } : null });
    const body = job.units.slice(index + 1).find(u => u.kind === "body" && !u.truncated);
    const m = body && /^body (\d+):(player|opponent)$/.exec(body.label);
    if (body && m) {
      const row = SPRITE_ORDER_PRODUCTION_BODIES[`${m[1]}:${m[2]}`];
      const after = job.units.slice(job.units.indexOf(body) + 1).find(u => u.windows.length > 0);
      // units between the fade and that body (gaps: hit effect / healthbox / prompt sprites) are not this check's subject
      const res = row === undefined ? null : checkUnit(body, after, SPRITE_ORDER_PRODUCTION_PLANS[row]!);
      nextConsumers.push({ job: name, profile: job.profile, fadeFrame: unit.frame, body: body.label, frame: body.frame, observedPlan: body.plan,
        productionRow: row ?? null, exact: res ? res.problems.length === 0 : null, problems: res?.problems ?? ["no production row"] });
    }
  });
}
const sides = [...new Set(instances.map(i => `${i.profile}:${i.holder}`))].sort();
const out = { schema: "prep64-check/v1", jobs: Object.keys(input.jobs).length, notIdenticalAB: notIdentical, plans: PREP64_PLANS,
  result: { instances: instances.length, matched: instances.filter(i => i.matched).length,
    handoffsExact: instances.filter(i => (i.nextAllocatingUnit as { handoffExact: boolean } | null)?.handoffExact).length, sides },
  nextConsumerResult: { bodies: nextConsumers.length, exact: nextConsumers.filter(c => c.exact).length },
  instances, nextConsumers };
writeFileSync(process.argv[3]!, JSON.stringify(out, null, 1) + "\n");
console.log(`${out.jobs} jobs, ${notIdentical} A/B differ`);
console.log(`general SUBSTITUTE_FADE: ${out.result.matched}/${out.result.instances} exact, hand-offs exact ${out.result.handoffsExact}, sides ${sides.join(" ")}`);
for (const i of instances) if (!i.matched) console.log(`   MISMATCH ${i.job} @${i.frame}: ${(i.problems as string[]).join(" | ")}`);
console.log(`next consumer bodies: ${out.nextConsumerResult.exact}/${out.nextConsumerResult.bodies} exact on their production rows`);
for (const c of nextConsumers) console.log(`   ${c.job} ${c.body} @${c.frame} row ${c.productionRow} [${c.observedPlan}] ${c.exact ? "EXACT" : (c.problems as string[]).join(" | ")}`);
