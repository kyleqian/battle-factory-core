// plans48: per-frame ROM check of the proposed order plans against the plans48 unit receipts (plans48Extract.py) -- prep45Check.ts's
// method and checkUnit unchanged (copied: that script runs at import): the production plan cursor (applySpriteOrderUnitPlan,
// decodeSpriteOrderPlan) applies the plan prefix through every allocation window from the ROM F at the unit start; created / destroyed
// slots and F must equal the ROM after every window; a single survivor must be destroyed by the very next allocation window (carry).
// Controls: the existing STATUS_SLP plan on the sleep units of the Nightmare jobs.
// usage: node --experimental-strip-types tools/integration/plans48Check.ts <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor } from "../../src/engine/spriteOrderProvider.ts";
import { SPRITE_ORDER_PRODUCTION_ANIMS, SPRITE_ORDER_PRODUCTION_PLANS } from "../../src/engine/spriteOrderProductionPlans.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
interface Job { unit: string; base: string; units: Unit[]; identicalAB: boolean }

const anim = (name: string) => SPRITE_ORDER_PRODUCTION_PLANS[SPRITE_ORDER_PRODUCTION_ANIMS[name]!]!;
/** Proposed plans (label -> plan text). Side-keyed bodies carry `:<side>`; two-turn bodies are keyed by the choosetwoturnanim turn. */
export const PREP48_PLANS: Readonly<Record<string, string>> = Object.freeze({
  "body 8": "Cf;D0;Cffff;Cffff;Cff;D1,4,2,3;D9;D10;D5,8,6,7;Cf;Cf;Cf;Cf;Cf;Cf;Cf;D11;D12;D13;D14;D15;D16;D17;Cf;D18",
  "status NIGHTMARE": "Cf;D0",
  "status SLP (existing)": anim("STATUS_SLP"),
  "status CURSED": "Cf;D0",
  "status FRZ": "Cf;D0",
  "general ITEM_KNOCKOFF": "Cf",
  "body 75": "Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;D0;D2;Cff;D1;D3;D4;D5;D7;D6;D8;D9;D11,10",
  "body 173": "Cffff;D0;D1,3,2;Cffff;D4;D5,7,6",
  "body 165": "Cff;D0,1/P540,540;Cf;D2",
  "body 217 damage": "Cf;D0;Cf;Cf;Cf;D1;Cf;D2;Cf;D3;D4;D5",
  "body 20217 heal": "Cf;D0;Cf;Cf;Cf;Cf;D1;Cf;D2;Cf;D3;Cf;D4;Cf;D5;Cf;D6;D7;D8;D9;Cf;Cf;Cf;D10;Cf;D11;D12;D13",
  "body 288:player": "Cffffff;D3,4,5,2,0,1",
  "body 288:opponent": "Cffffff;D3,2,1,4,5,0",
  "body 13 turn 0 (setup)": "Cfff;D0,2,1",
  "body 13 turn 1 (unleash)": "Cf;Cf;Cf;D0;D1;D2",
  "body 19 turn 0 (setup)": "Cf;D0",
  "body 19 turn 1 (unleash)": "Cf;Cf;D0;D1",
  // Attract: the production plan (A); the ROM also shows B = one rising heart fewer before the frame boundary (attract-prediction.json)
  "body 213": "Cf;D0;Cffffff;D3,5,6,1,4,2;Cff;Cffffff;D7;D8;D9;D11;D10;D12;D14;D13",
  "body 213 (split B)": "Cf;D0;Cffffff;D3,5,6,1,4,2;Cf;Cfffffff;D7;D8;D9;D11;D10;D12;D14;D13",
});

/** Which proposed plan a probed unit is checked against (null = not a plans48 plan unit). */
function planLabel(job: Job, unit: Unit, seen: Map<string, number>): string | null {
  const count = (key: string) => { const n = seen.get(key) ?? 0; seen.set(key, n + 1); return n; };
  if (unit.label === "status NIGHTMARE") return unit.plan === PREP48_PLANS["status SLP (existing)"] ? "status SLP (existing)" : "status NIGHTMARE";
  if (["status CURSED", "status FRZ", "general ITEM_KNOCKOFF"].includes(unit.label)) return unit.label;
  const m = /^body (\d+):(\w+)$/.exec(unit.label);
  if (!m) return null;
  const mv = Number(m[1]);
  if ([8, 75, 165, 173].includes(mv)) return `body ${mv}`;
  // Present: the two branches allocate differently (PresentDamage's explosions / PresentHeal's sparkles); each instance is checked
  // against the branch its allocation count shows (the ROM's gAnimMoveDmg is not in the probe rows)
  if (mv === 217) return unit.windows.reduce((n, w) => n + w.C.length, 0) === 6 ? "body 217 damage" : "body 20217 heal";
  if (mv === 213) return "body 213";
  if (mv === 138 && job.unit === "BODY138") return "body 138 (predicted)";
  if (mv === 288) return `body 288:${m[2]}`;
  if (mv === 13 || mv === 19) return count(String(mv)) === 0 ? `body ${mv} turn 0 (setup)` : `body ${mv} turn 1 (unleash)`;
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
const dreamEater = JSON.parse(readFileSync(new URL("./fixtures/plans48/dream-eater-prediction.json", import.meta.url), "utf8")) as { plans: string[]; predictions: Record<string, number> };
const dreamEaterResults: { job: string; predicted: number; exact: boolean }[] = [];
const attract: { job: string; split: string; endStateEqualsA: boolean; schedule: string }[] = [];
for (const [name, job] of Object.entries(input.jobs)) {
  if (!job.identicalAB) notIdentical += 1;
  const seen = new Map<string, number>();
  job.units.forEach((unit, index) => {
    if (unit.kind !== "body" || unit.truncated) return;
    const label = planLabel(job, unit, seen);
    if (label === null) return;
    const entry = results[label] ??= { instances: 0, matched: 0, framesChecked: 0, jobs: [], mismatches: [], carries: 0 };
    // the carry's next allocation window is in the gap unit or the next body: search the following units
    const next = job.units.slice(index + 1).find(u => u.windows.length > 0);
    // Dream Eater: each instance against the plan PREDICTED for its species pair before the probes ran (dream-eater-prediction.json)
    const text = label === "body 138 (predicted)" ? dreamEater.plans[dreamEater.predictions[name]!]! : PREP48_PLANS[label]!;
    let checked = checkUnit(unit, next, text);
    if (label === "body 138 (predicted)") dreamEaterResults.push({ job: name, predicted: dreamEater.predictions[name]!, exact: checked.problems.length === 0 });
    if (label === "body 213") {
      // per-frame exact against A or B; the free order after the unit must equal plan A's (the production plan) from the ROM start
      const start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
      const endA = applySpriteOrderUnitPlan(start, decodeSpriteOrderPlan(PREP48_PLANS["body 213"]!));
      const romEnd = unit.windows.at(-1)!.F;
      const split = checked.problems.length === 0 ? "A" : (checked = checkUnit(unit, next, PREP48_PLANS["body 213 (split B)"]!)).problems.length === 0 ? "B" : "none";
      const schedule = unit.windows.map(w => w.f - unit.frame).join(",");
      attract.push({ job: name, split, endStateEqualsA: same(endA.order.free, romEnd), schedule });
      if (!same(endA.order.free, romEnd)) checked.problems.push("free order after the unit != plan A's");
    }
    entry.instances += 1;
    entry.framesChecked += checked.frames;
    if (checked.carry) entry.carries += 1;
    if (!entry.jobs.includes(name)) entry.jobs.push(name);
    if (checked.problems.length === 0) entry.matched += 1;
    else entry.mismatches.push({ job: name, frame: unit.frame, observedPlan: unit.plan, problems: checked.problems.slice(0, 4) });
  });
}
// Attract: A and B are boundary-equivalent from any start order (every ROM start order, and 200 random permutations of its free slots)
let starts = 0, equivalent = 0, seed = 48;
const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
for (const job of Object.values(input.jobs)) for (const unit of job.units) {
  if (unit.label !== "body 213:None" && !unit.label.startsWith("body 213:")) continue;
  for (let k = 0; k <= 200; k++) {
    const free = [...unit.F0];
    if (k > 0) for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [free[i], free[j]] = [free[j]!, free[i]!]; }
    const start = createSpriteOrderPlanCursor({ known: true, free, pendingDestroyed: [] });
    const a = applySpriteOrderUnitPlan(start, decodeSpriteOrderPlan(PREP48_PLANS["body 213"]!));
    const b = applySpriteOrderUnitPlan(start, decodeSpriteOrderPlan(PREP48_PLANS["body 213 (split B)"]!));
    starts += 1;
    if (a.order.known && b.order.known && same(a.order.free, b.order.free) && same(a.occupied, b.occupied)) equivalent += 1;
  }
}
const out = { schema: "prep48-check/v1", jobs: Object.keys(input.jobs).length, notIdenticalAB: notIdentical, plans: PREP48_PLANS, results,
  attract: { instances: attract, boundaryEquivalence: { starts, equivalent } },
  dreamEater: { reached: dreamEaterResults, notReached: Object.keys(dreamEater.predictions).filter(job => !dreamEaterResults.some(r => r.job === job)) } };
writeFileSync(process.argv[3]!, JSON.stringify(out, null, 1) + "\n");
for (const [label, r] of Object.entries(results)) {
  console.log(`${label}: ${r.matched}/${r.instances} instances exact, ${r.framesChecked} allocation frames, ${r.carries} carries, jobs ${r.jobs.length}`);
  for (const m of r.mismatches) console.log(`   MISMATCH ${m.job} @${m.frame}: ${m.problems.join(" | ")}`);
}
console.log(`Dream Eater: ${dreamEaterResults.filter(r => r.exact).length}/${dreamEaterResults.length} instances exact against the pre-recorded prediction (predicted plan 1 = the flip: ${dreamEaterResults.filter(r => r.predicted === 1).map(r => r.job).join(",")}); not reached: ${out.dreamEater.notReached.join(",") || "none"}`);
console.log(`Attract: splits ${JSON.stringify(Object.fromEntries(["A", "B", "none"].map(k => [k, attract.filter(a => a.split === k).length])))}, end state == A ${attract.filter(a => a.endStateEqualsA).length}/${attract.length}, schedules ${new Set(attract.map(a => a.schedule.split(",").slice(0, 4).join(","))).size} distinct (first 4 windows), A == B at the boundary ${equivalent}/${starts} starts`);
