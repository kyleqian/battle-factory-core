// prep45: per-frame ROM check of the proposed order plans against the prep45 unit receipts (prep45Extract.py) -- prep43Check.ts's
// method and checkUnit unchanged (copied: that script runs at import): the production plan cursor (applySpriteOrderUnitPlan,
// decodeSpriteOrderPlan) applies the plan prefix through every allocation window from the ROM F at the unit start; created / destroyed
// slots and F must equal the ROM after every window; a single survivor must be destroyed by the very next allocation window (carry).
// Also checks the existing HELD_ITEM_EFFECT plan on the Leftovers units the TURN_TRAP jobs contain.
// usage: node --experimental-strip-types tools/integration/prep45Check.ts <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor } from "../../src/engine/spriteOrderProvider.ts";
import { SPRITE_ORDER_PRODUCTION_ANIMS, SPRITE_ORDER_PRODUCTION_PLANS } from "../../src/engine/spriteOrderProductionPlans.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
interface Job { unit: string; base: string; units: Unit[]; identicalAB: boolean }

const anim = (name: string) => SPRITE_ORDER_PRODUCTION_PLANS[SPRITE_ORDER_PRODUCTION_ANIMS[name]!]!;
/** Proposed plans (label -> plan text). Side-keyed bodies carry `:<side>`; Solar Beam is keyed by the choosetwoturnanim turn. */
export const PREP45_PLANS: Readonly<Record<string, string>> = Object.freeze({
  "status BRN": "Cf;Cf;Cf;D0;D1",
  "general TURN_TRAP FIRE_SPIN": "Cf;Cf;Cf;Cf;Cf;Cf;Cf;D1;Cf;D2;D0;Cf;Cf;D3;Cf;D4;Cf;D7;D5;D8;D6;D9;D10",
  "general TURN_TRAP WHIRLPOOL": "Cff;Cf;Cf;Cf;Cf;Cf;D0;Cf;Cf;Cf;Cf;Cf;Cf;D2;D3;D1;D4;Cf/D5;D8;D6;D9;D7;D10;D13;D11;D12",
  "general TURN_TRAP SAND_TOMB": "Cff;Cf;Cf;Cf;Cf;Cf;D0;Cf;D2;Cf;D3;D1;Cf;Cf;D4;Cf;D5;Cf;D8;D6;D9;D7;D10;D11;Cf;D12",
  "general INGRAIN_HEAL": anim("LEECH_SEED_DRAIN"),
  "general HELD_ITEM_EFFECT (existing)": anim("HELD_ITEM_EFFECT"),
  "body 56": "Cff;Cff;Cff;Cff;Cff;Cff;Cffff;Cff;Cff;Cff;D12,13;D1,0;Cffff;D3,2;Cff;D5,4;Cff;D7,6;Cff;D22,23;D9,8;Cffff;D11,10;Cff;D15,14;Cff;D17,16;Cff;D32,33;D18,19;Cffff;D20,21;Cff;D24,25;Cff;D26,27;Cff;D42,43;D28,29;Cff;D30,31;D34,35;Cff;D36,37;D52,53;D38,39;D40,41;D54,55;D44,45;D46,47;D48,49;D50,51",
  "body 179": "Cf;D0;Cffffff;D3,2,1,4,5,6;Cf;Cfff;D7;D8;D10;D9",
  "body 345": "Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;D0;D2;Cff;D1;D3;D4;D5;D7;D6;D8;D9;Cff;D13,12;D11,10",
  "body 76 turn 0 (setup)": "Cf;Cf;Cf;Cf;Cf;D0;Cf;D1;Cf;D2;Cf;D3;Cf;D4;Cf;D5;Cf;D6;Cf;D7;Cf;D8;Cf;D9;D10;D11;D12;D13",
  "body 76 turn 1 (unleash)": "Cff;Cff;Cf;Cf;Cf;Cf;D1;Cf;Cf;D4;Cf;Cf;D6;Cf;Cf;D8;Cff;D9;Cf;Cf;D11;Cf;Cf;D13;Cf;Cf;D16;Cf;Cf;D0;D18;Cf;Cf;D3;D20;Cff;D21,5;Cf;Cf;D23;D7;Cf;D25;D2;Cf;D26;Cf/D10;D28;Cf;D12;D30;D15;D31;D32,17;D33;D19;D14;D22;D24;D27;D29",
  "body 135": "Cff;Cff;Cf;D3,2;D4;D1,0;Cf;Cf;Cf;D5;Cf;D6;D7;D8",
  "body 315": "Cf;D0;Cf;D1;Cffffffff;Cffffffff;Cffffffff;D4,3,5,2,6,9,7,8;D12,13,11,14,10,17,15,16;D20,19,21,18,22,23,25,24;Cf;Cf;D26;D27;Cf;D28;Cf;Cf;D29;D30;Cf;D31;Cf;D32",
  "body 195": "Cffffffffffffff;Cfff;Cf;D17;D14,13,15,12,11,10,0,9,1,8,2,7,3,4,6,5;D16;Cf;D18",
  "body 349:player": "Cfffff;Cf;D2,5,1,3,0,4",
  "body 349:opponent": "Cfffff;Cf;D0,4,2,5,1,3",
  // tier 2
  "general WISH_HEAL": "Cf;Cf;D0;D1;Cf;Cf;Cf;D2;Cf;D3;D4",
  "general TURN_TRAP BIND": "Cf;Cf;D0,1",
  "general FUTURE_SIGHT_HIT": "",
  "body 236": "Cf;D0;Cf;Cf;Cf;Cf;Cf;Cf;D2,3,4,5,6,1;Cf;Cf;Cf;D7;Cf;D8;D9;D10",
});

/** Which proposed plan a probed unit is checked against (null = not a prep45 plan unit). */
function planLabel(job: Job, unit: Unit, seen: Map<string, number>): string | null {
  const count = (key: string) => { const n = seen.get(key) ?? 0; seen.set(key, n + 1); return n; };
  if (["status BRN", "general INGRAIN_HEAL", "general WISH_HEAL", "general FUTURE_SIGHT_HIT"].includes(unit.label)) return unit.label;
  if (unit.label === "general TURN_TRAP") {
    // Leftovers (General_HeldItemEffect, ENDTURN_ITEMS1) precedes the trap damage in the Sand Tomb jobs: check it against the existing plan.
    if (unit.plan === PREP45_PLANS["general HELD_ITEM_EFFECT (existing)"]) return "general HELD_ITEM_EFFECT (existing)";
    return `general TURN_TRAP ${job.base.includes("fire-spin") ? "FIRE_SPIN" : job.base.includes("whirlpool") ? "WHIRLPOOL"
      : job.base.includes("sand-tomb") ? "SAND_TOMB" : "BIND"}`;
  }
  const m = /^body (\d+):(\w+)$/.exec(unit.label);
  if (!m) return null;
  const mv = Number(m[1]);
  if ([56, 179, 345, 135, 315, 195, 236].includes(mv)) return `body ${mv}`;
  if (mv === 349) return `body 349:${m[2]}`;
  if (mv === 76) return count("76") === 0 ? "body 76 turn 0 (setup)" : "body 76 turn 1 (unleash)";
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
    const checked = checkUnit(unit, job.units[index + 1], PREP45_PLANS[label]!);
    entry.instances += 1;
    entry.framesChecked += checked.frames;
    if (checked.carry) entry.carries += 1;
    if (!entry.jobs.includes(name)) entry.jobs.push(name);
    if (checked.problems.length === 0) entry.matched += 1;
    else entry.mismatches.push({ job: name, frame: unit.frame, observedPlan: unit.plan, problems: checked.problems.slice(0, 4) });
  });
}
const out = { schema: "prep45-check/v1", jobs: Object.keys(input.jobs).length, notIdenticalAB: notIdentical, plans: PREP45_PLANS, results };
writeFileSync(process.argv[3]!, JSON.stringify(out, null, 1) + "\n");
for (const [label, r] of Object.entries(results)) {
  console.log(`${label}: ${r.matched}/${r.instances} instances exact, ${r.framesChecked} allocation frames, ${r.carries} carries, jobs ${r.jobs.length}`);
  for (const m of r.mismatches) console.log(`   MISMATCH ${m.job} @${m.frame}: ${m.problems.join(" | ")}`);
}
