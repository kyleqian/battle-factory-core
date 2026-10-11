// ret88: per-frame ROM check of Return 216's ReturnWeak order plan (friendship 0 = AnimTask_GetReturnPowerLevel level 0) against the
// ret88 unit receipts (ret88Extract.py) -- ret80Check.ts's checkUnit unchanged (copied: those scripts run at import): the production plan
// cursor (applySpriteOrderUnitPlan, decodeSpriteOrderPlan) applies the plan prefix through every allocation window from the ROM F at the
// unit start; created / destroyed slots and F must equal the ROM after every window; a single survivor must be destroyed by the very next
// allocation window (carry). The plan is fixtures/ret88/predictions.json's (committed before the probes ran).
// usage: node --experimental-strip-types tools/integration/ret88Check.ts <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, type SpriteOrderPlan } from "../../src/engine/spriteOrderProvider.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
interface Job { unit: string; base: string; units: Unit[]; identicalAB: boolean; powerIdenticalAB?: boolean }

/** Proposed plans (label -> plan text): fixtures/ret88/predictions.json, Move_RETURN's ReturnWeak (battle_anim_scripts.s:8939-8948). */
export const RET88_PLANS: Readonly<Record<string, string>> = Object.freeze({
  // ReturnWeak (< 61, the kernel's friendship 0): dip 1, (waitforvisualfinish) dip 2, hitsplat (destroyed first), dip 2 -- host key 40216
  "body 216 weak": "Cf;D0;Cf;Cf;D2;D1",
});

function planLabel(unit: Unit): string | null {
  const m = /^body 216:\w+ (weak)$/.exec(unit.label);
  return m ? `body 216 ${m[1]}` : null;
}
/** Labels whose instances are classified (distinct observed plans), not checked against a proposal. */
const CLASSIFIED = /^body 216:\w+ (medium|strong|strongest)$/;

const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);

function mergeRomCreates(windows: readonly Win[]): Win[] {
  const out: Win[] = [];
  for (const w of windows) {
    const last = out[out.length - 1];
    if (last && last.D.length === 0 && w.D.length === 0 && last.C.length > 0 && w.C.length > 0) out[out.length - 1] = { ...w, f: last.f, C: [...last.C, ...w.C] };
    else out.push(w);
  }
  return out;
}

function mergePlanCreates(plan: SpriteOrderPlan): SpriteOrderPlan {
  const out: { C?: readonly (readonly ["n", number, "f" | "e"])[]; D?: unknown; pw?: unknown }[] = [];
  for (const w of plan) {
    const last = out[out.length - 1];
    if (last && last.C && !last.D && !last.pw && w.C && !w.D && !w.pw) out[out.length - 1] = { C: [...last.C, ...w.C] };
    else out.push(w as never);
  }
  return out as unknown as SpriteOrderPlan;
}

function checkUnit(unit: Unit, next: Unit | undefined, text: string, merged: boolean) {
  const plan = merged ? mergePlanCreates(decodeSpriteOrderPlan(text)) : decodeSpriteOrderPlan(text);
  const windows = merged ? mergeRomCreates(unit.windows) : unit.windows;
  const start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
  const problems: string[] = [];
  if (windows.length !== plan.length) problems.push(`window count ${windows.length} != plan ${plan.length}`);
  if (unit.strayFChanges !== 0) problems.push(`${unit.strayFChanges} F changes without allocation`);
  let frames = 0, cursor = start;
  for (let k = 0; k < Math.min(plan.length, windows.length); k++) {
    const before = cursor;
    cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
    const rom = windows[k]!;
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
  return { problems, frames, survivors: survivors.length, carry };
}

const input = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as { jobs: Record<string, Job> };
type Result = { instances: number; matched: number; matchedCreateMerged: number; framesChecked: number; carries: number; sides: string[];
  species: string[]; jobs: string[]; mismatches: { job: string; frame: number; observedPlan: string; problems: string[] }[] };
const results: Record<string, Result> = {};
const classified: Record<string, Record<string, string[]>> = {};
let notIdentical = 0;
for (const [name, job] of Object.entries(input.jobs)) {
  if (!job.identicalAB || job.powerIdenticalAB === false) notIdentical += 1;
  job.units.forEach((unit, index) => {
    if (unit.kind !== "body" || unit.truncated) return;
    if (CLASSIFIED.test(unit.label)) ((classified[unit.label] ??= {})[unit.plan] ??= []).push(name);
    const label = planLabel(unit);
    if (label === null) return;
    const entry = results[label] ??= { instances: 0, matched: 0, matchedCreateMerged: 0, framesChecked: 0, carries: 0, sides: [], species: [], jobs: [], mismatches: [] };
    const next = job.units.slice(index + 1).find(u => u.windows.length > 0);
    const strict = checkUnit(unit, next, RET88_PLANS[label]!, false);
    const merged = strict.problems.length === 0 ? strict : checkUnit(unit, next, RET88_PLANS[label]!, true);
    // side: the move body's attacker side; a general animation: the job id's ply / opp (Castform's / Ninjask's side)
    const side = unit.label.startsWith("body ") ? unit.label.split(":")[1]!.split(" ")[0]! : /-ply-/.test(name) ? "player" : "opponent";
    const species = name.replace(/^[a-z0-9-]*?-(ply|opp)-/, "$1-");
    entry.instances += 1;
    entry.framesChecked += strict.frames;
    if (strict.carry) entry.carries += 1;
    if (!entry.sides.includes(side)) entry.sides.push(side);
    if (!entry.species.includes(species)) entry.species.push(species);
    if (!entry.jobs.includes(name)) entry.jobs.push(name);
    if (strict.problems.length === 0) entry.matched += 1;
    if (merged.problems.length === 0) entry.matchedCreateMerged += 1;
    if (strict.problems.length !== 0) entry.mismatches.push({ job: name, frame: unit.frame, observedPlan: unit.plan, problems: strict.problems.slice(0, 3) });
  });
}
const classes = Object.fromEntries(Object.entries(classified).sort().map(([label, plans]) => [label,
  Object.entries(plans).map(([plan, jobs]) => ({ plan, instances: jobs.length, jobs }))]));
const out = { schema: "ret88-check/v1", jobs: Object.keys(input.jobs).length, notIdenticalAB: notIdentical, plans: RET88_PLANS, results, classified: classes };
writeFileSync(process.argv[3]!, JSON.stringify(out, null, 1) + "\n");
console.log(`${out.jobs} jobs, ${notIdentical} A/B differ`);
for (const [label, r] of Object.entries(results)) {
  console.log(`${label}: ${r.matched}/${r.instances} exact per frame, ${r.matchedCreateMerged}/${r.instances} create-merged, ${r.framesChecked} allocation frames, ${r.carries} carries, sides ${r.sides.join("+")}, ${r.species.length} (side, species) jobs`);
  for (const m of r.mismatches) console.log(`   per-frame MISMATCH ${m.job} @${m.frame}: ${m.problems.join(" | ")}`);
}
for (const [label, plans] of Object.entries(classes)) console.log(`${label}: ${plans.length} observed plan(s) over ${plans.reduce((s, p) => s + p.instances, 0)} instances`);
