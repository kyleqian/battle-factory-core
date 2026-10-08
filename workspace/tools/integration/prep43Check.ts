// prep43: per-frame ROM check of the proposed order plans against the prep43 unit receipts (prep43Extract.py), with the production
// plan cursor (src/engine/spriteOrderProvider.ts applySpriteOrderUnitPlan, plan text decoded by spriteOrderEventTransform.ts
// decodeSpriteOrderPlan). For every probed unit with a proposed plan: start from the ROM free order F at the unit's first frame, apply
// the plan prefix through window k and require the created slots, the destroyed slots and the free order after window k to equal the
// ROM window k (every allocation frame; prep43Extract.py separately counts F changes on non-allocation frames, required 0). A plan
// whose unit leaves one survivor also checks the carry: the first allocation window after the unit must destroy exactly that survivor
// (the production CARRY D[c1,0]) and match F after it. Output: per (label, plan) instances / frames / mismatches.
// usage: node --experimental-strip-types tools/integration/prep43Check.ts <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor } from "../../src/engine/spriteOrderProvider.ts";
import { SPRITE_ORDER_PRODUCTION_ANIMS, SPRITE_ORDER_PRODUCTION_BODIES, SPRITE_ORDER_PRODUCTION_PLANS } from "../../src/engine/spriteOrderProductionPlans.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
interface Job { unit: string; base: string; units: Unit[]; identicalAB: boolean }

const production = (key: string) => SPRITE_ORDER_PRODUCTION_PLANS[SPRITE_ORDER_PRODUCTION_BODIES[key]!]!;
/** Proposed plans (label -> plan text). `status PRZ` is the production plan (index SPRITE_ORDER_PRODUCTION_ANIMS.STATUS_PRZ) + carry. */
export const PREP43_PLANS: Readonly<Record<string, string>> = Object.freeze({
  "status CONFUSION": "Cfffff;D1,2,0,3,4",
  "status PRZ": SPRITE_ORDER_PRODUCTION_PLANS[SPRITE_ORDER_PRODUCTION_ANIMS.STATUS_PRZ!]!,
  "general LEECH_SEED_DRAIN": "Cf;D0;Cf;Cf;Cf;Cf;Cf;D1;Cf;D2;Cf;Cf;D3;D5;D4;D6;D7;D8;Cf;Cf;Cf;D9;Cf;D10;D11;D12",
  "general SANDSTORM_CONTINUES": production("201:player"),
  "body 91 turn 0 (setup)": "Cff;Cffff;D3,2,5,4;Cffff;D7,6,9,8;Cffff;D11,10,13,12;Cffff;D15,14,17,16;Cffff;D19,18,21,20;D1,0",
  "body 91 turn 1 (unleash)": "Cff;Cf;D2;D1,0",
  "body 280 normal": "Cf;Cf/D0;D1;Cf;Cf;D2;D3;Cf;D4;Cff;D5;D6;Cf;D7",
  "body 280 screen": "Cf;Cf;Cf/D0;D2;Cf;Cf;D3;D4;Cf;D5;Cff;D1;D6;D7;Cffff;D10,11,8,9;Cf;D12",
  // Giga Drain: the plan of the majority of instances (one instance differs: reported, not adopted)
  "body 202": "Cf;D0;Cf;D1;Cfff;Cfff;Cfff;Cfff;Cfff;D2;Cfff;D5,6;D3;Cfff;D8,10;D4;Cfff;D12,13;D7,9;D16;D11;D17,19;D14;D15;D21;D18;D23,24;D20;D22;D25;Cf;Cf;Cf;D26;Cf;D27;D28;D29;Cf;D30",
});

/** Which proposed plan a probed unit is checked against (null = not a prep43 unit). */
function planLabel(job: Job, unit: Unit, seen: Map<string, number>): string | null {
  const count = (key: string) => { const n = seen.get(key) ?? 0; seen.set(key, n + 1); return n; };
  if (unit.label === "status CONFUSION" || unit.label === "status PRZ") return unit.label;
  if (unit.label === "general mv-0 (leech job)") return "general LEECH_SEED_DRAIN";
  if (job.unit === "WEATHER_VAR" && job.base.includes("sandstorm") && unit.label === "general mv-0 (weather job)") return "general SANDSTORM_CONTINUES";
  if (unit.label.startsWith("body 91:")) return count(unit.label) === 0 ? "body 91 turn 0 (setup)" : "body 91 turn 1 (unleash)";
  if (unit.label.startsWith("body 280:")) return job.base.includes("-normal-") ? "body 280 normal" : "body 280 screen";
  if (unit.label.startsWith("body 202:")) return "body 202";
  return null;
}

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
    // a slot destroyed and re-created in the same window is invisible to the mask diff on both sides: compare net change
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
const results: Record<string, { instances: number; matched: number; framesChecked: number; jobs: string[]; mismatches: { job: string; frame: number; observedPlan: string; problems: string[] }[]; carries: number }> = {};
let notIdentical = 0;
for (const [name, job] of Object.entries(input.jobs)) {
  if (!job.identicalAB) notIdentical += 1;
  const seen = new Map<string, number>();
  job.units.forEach((unit, index) => {
    if (unit.kind !== "body" || unit.truncated) return;
    const label = planLabel(job, unit, seen);
    if (label === null) return;
    const entry = results[label] ??= { instances: 0, matched: 0, framesChecked: 0, jobs: [], mismatches: [], carries: 0 };
    const checked = checkUnit(unit, job.units[index + 1], PREP43_PLANS[label]!);
    entry.instances += 1;
    entry.framesChecked += checked.frames;
    if (checked.carry) entry.carries += 1;
    if (!entry.jobs.includes(name)) entry.jobs.push(name);
    if (checked.problems.length === 0) entry.matched += 1;
    else entry.mismatches.push({ job: name, frame: unit.frame, observedPlan: unit.plan, problems: checked.problems.slice(0, 4) });
  });
}
const out = { schema: "prep43-check/v1", jobs: Object.keys(input.jobs).length, notIdenticalAB: notIdentical, plans: PREP43_PLANS, results };
writeFileSync(process.argv[3]!, JSON.stringify(out, null, 1) + "\n");
for (const [label, r] of Object.entries(results)) {
  console.log(`${label}: ${r.matched}/${r.instances} instances exact, ${r.framesChecked} allocation frames, ${r.carries} carries, jobs ${r.jobs.length}`);
  for (const m of r.mismatches) console.log(`   MISMATCH ${m.job} @${m.frame}: ${m.problems.join(" | ")}`);
}
