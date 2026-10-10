// plans69: per-frame ROM check of the plans69 order plans against the plans69 unit receipts (plans69Extract.py) -- plans51Check.ts's
// checkUnit unchanged (copied: those scripts run at import): the production plan cursor (applySpriteOrderUnitPlan,
// decodeSpriteOrderPlan) applies the plan prefix through every allocation window from the ROM F at the unit start; created / destroyed
// slots and F must equal the ROM after every window; a single survivor must be destroyed by the very next allocation window (carry).
// A unit that fails per frame is re-checked "create-merged": runs of consecutive create-only windows are merged on both sides (the
// same creations in the same order, split across a frame boundary differently -- e.g. Needle Arm's 10-sprite burst seen as 9 + 1),
// which leaves the order after every destroy, and so after the unit, unchanged. Labels with several observed plans and no proposal
// are listed with their plan classes (the negative results of docs/next-adapters-plans69.md).
// usage: node --experimental-strip-types tools/integration/plans69Check.ts <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, type SpriteOrderPlan } from "../../src/engine/spriteOrderProvider.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[]; power?: number }
interface Job { unit: string; base: string; units: Unit[]; identicalAB: boolean; powerIdenticalAB?: boolean }

/** Proposed plans (label -> plan text). */
export const PLANS69_PLANS: Readonly<Record<string, string>> = Object.freeze({
  // Move_CONVERSION_2: 16 fixed-argument gConversion2SpriteTemplate sprites (AnimConversion2: fixed delays 60..135), destroyed in
  // creation order; no Random2, no geometry key
  "body 176": "Cfffffffffffff;Cfff;D0;D1;D2;D3;D4;D5;D6;D7;D8;D9;D10;D11;D12;D13;D14;D15",
  // Move_NEEDLE_ARM: 12 inward spikes (2-frame steps, 16-frame AnimNeedleArmSpike), then the hitsplat + fist + 8 outward spikes
  "body 302": "Cf;Cf;Cf;Cf;Cf/D0;Cf/D1;Cf/D2;Cf/D3;Cf/D4;Cf/D5;Cf/D6;Cf/D7;D8;D9;D10;D11;Cfffffffff;Cf;D13;D12,18,19,17,16,20,15,21,14",
  // General_CastformChange: tasks only (AnimTask_TransformMon / AnimTask_CastformGfxDataChange), no allocation
  "general CASTFORM_CHANGE": "",
  // Move_MAGNITUDE: AnimTask_IsPowerOver99 -> MagnitudeRegular (tasks only) / MagnitudeIntense (two complex_palette_blend controllers)
  "body 222 power<=99": "",
  "body 222 power>99": "Cf;D0;Cf;D1",
});

function planLabel(unit: Unit): string | null {
  if (unit.label === "general CASTFORM_CHANGE") return unit.label;
  const m = /^body (\d+):(\w+)( power(?:>99|<=99))?$/.exec(unit.label);
  if (!m) return null;
  if (m[1] === "176" || m[1] === "302") return `body ${m[1]}`;
  if (m[1] === "222" && m[3]) return `body 222${m[3]}`;
  return null;
}
/** Labels whose instances are classified (distinct observed plans), not checked against a proposal. */
const CLASSIFIED = /^body (260|310|316):/;

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
    const strict = checkUnit(unit, next, PLANS69_PLANS[label]!, false);
    const merged = strict.problems.length === 0 ? strict : checkUnit(unit, next, PLANS69_PLANS[label]!, true);
    // side: the move body's attacker side; CASTFORM_CHANGE: the Castform's side (the job id's ply / opp)
    const side = unit.label.startsWith("body ") ? unit.label.split(":")[1]!.split(" ")[0]! : name.split("-")[1] === "ply" ? "player" : "opponent";
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
const out = { schema: "plans69-check/v1", jobs: Object.keys(input.jobs).length, notIdenticalAB: notIdentical, plans: PLANS69_PLANS, results, classified: classes };
writeFileSync(process.argv[3]!, JSON.stringify(out, null, 1) + "\n");
console.log(`${out.jobs} jobs, ${notIdentical} A/B differ`);
for (const [label, r] of Object.entries(results)) {
  console.log(`${label}: ${r.matched}/${r.instances} exact per frame, ${r.matchedCreateMerged}/${r.instances} create-merged, ${r.framesChecked} allocation frames, ${r.carries} carries, sides ${r.sides.join("+")}, ${r.species.length} (side, species) jobs`);
  for (const m of r.mismatches) console.log(`   per-frame MISMATCH ${m.job} @${m.frame}: ${m.problems.join(" | ")}`);
}
for (const [label, plans] of Object.entries(classes)) console.log(`${label}: ${plans.length} observed plan(s) over ${plans.reduce((s, p) => s + p.instances, 0)} instances`);
