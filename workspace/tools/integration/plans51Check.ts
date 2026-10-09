// plans51: per-frame ROM check of the proposed order plans against the plans51 unit receipts (plans51Extract.py) -- prep45Check.ts's
// / plans48Check.ts's method and checkUnit unchanged (copied: those scripts run at import): the production plan cursor
// (applySpriteOrderUnitPlan, decodeSpriteOrderPlan) applies the plan prefix through every allocation window from the ROM F at the unit
// start; created / destroyed slots and F must equal the ROM after every window; a single survivor must be destroyed by the very next
// allocation window (carry).
// usage: node --experimental-strip-types tools/integration/plans51Check.ts <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor } from "../../src/engine/spriteOrderProvider.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
interface Job { unit: string; base: string; units: Unit[]; identicalAB: boolean }

/** Proposed plans (label -> plan text), one per unit for both attacker sides. */
export const PLANS51_PLANS: Readonly<Record<string, string>> = Object.freeze({
  // Move_OUTRAGE: 23 flames (9 + 7 + 7 via OutrageFlames), each TranslateSpriteLinearAndFlicker for 30 frames, destroyed in creation order
  "body 200": "Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf;Cf/D0;Cf/D1;D2;D3;Cf;D4;Cf;D5;Cf;D6;Cf;D7;Cf;D8;Cf;Cf;D9;D10;D11;D12;D13;D14;D15;D16;D17;D18;D19;D20;D21;D22",
  // General_FocusBand: two simple_palette_blend controller sprites, then gSlideMonToOriginalPosSpriteTemplate, which survives the
  // script's `end` (carry: destroyed by the next allocation window)
  "general FOCUS_BAND": "Cf;D0;Cf;D1;Cf",
});

/** Which proposed plan a probed unit is checked against (null = not a plans51 plan unit). */
function planLabel(_job: Job, unit: Unit): string | null {
  if (unit.label === "general FOCUS_BAND") return unit.label;
  const m = /^body (\d+):(\w+)$/.exec(unit.label);
  if (!m) return null;
  const mv = Number(m[1]);
  if (mv === 200) return "body 200";
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
const results: Record<string, { instances: number; matched: number; framesChecked: number; sides: string[]; jobs: string[]; mismatches: { job: string; frame: number; observedPlan: string; problems: string[] }[]; carries: number }> = {};
let notIdentical = 0;
for (const [name, job] of Object.entries(input.jobs)) {
  if (!job.identicalAB) notIdentical += 1;
  job.units.forEach((unit, index) => {
    if (unit.kind !== "body" || unit.truncated) return;
    const label = planLabel(job, unit);
    if (label === null) return;
    const entry = results[label] ??= { instances: 0, matched: 0, framesChecked: 0, sides: [], jobs: [], mismatches: [], carries: 0 };
    const next = job.units.slice(index + 1).find(u => u.windows.length > 0);
    const checked = checkUnit(unit, next, PLANS51_PLANS[label]!);
    // a general animation's side: the holder's side (the job id's fb-pla / fb-opp)
    const side = unit.label.includes(":") ? unit.label.split(":")[1]! : name.split("-")[1] === "pla" ? "player" : "opponent";
    entry.instances += 1;
    entry.framesChecked += checked.frames;
    if (checked.carry) entry.carries += 1;
    if (!entry.sides.includes(side)) entry.sides.push(side);
    if (!entry.jobs.includes(name)) entry.jobs.push(name);
    if (checked.problems.length === 0) entry.matched += 1;
    else entry.mismatches.push({ job: name, frame: unit.frame, observedPlan: unit.plan, problems: checked.problems.slice(0, 4) });
  });
}
const out = { schema: "plans51-check/v1", jobs: Object.keys(input.jobs).length, notIdenticalAB: notIdentical, plans: PLANS51_PLANS, results };
writeFileSync(process.argv[3]!, JSON.stringify(out, null, 1) + "\n");
console.log(`${out.jobs} jobs, ${notIdentical} A/B differ`);
for (const [label, r] of Object.entries(results)) {
  console.log(`${label}: ${r.matched}/${r.instances} instances exact, ${r.framesChecked} allocation frames, ${r.carries} carries, sides ${r.sides.join("+")}, jobs ${r.jobs.length}`);
  for (const m of r.mismatches) console.log(`   MISMATCH ${m.job} @${m.frame}: ${m.problems.join(" | ")}`);
}
