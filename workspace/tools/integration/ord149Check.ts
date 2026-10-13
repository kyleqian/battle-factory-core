// ord149 (docs/ord149-astonish-extrasensory.md): per-window ROM check of the Astonish 310 words law (fixtures/ord149/ord149-prediction.md)
// against direct-mGBA unit receipts (ord149Extract.py). Per body: the droplets' rises (oam.y at creation - oam.y on the frame before the
// destroy; the creation row already shows the first step, a constant 3 px for every word) give the plan text
// `Cf;D0;Cff;D1,2/P<rise1>,<rise2>`; the production cursor (applySpriteOrderUnitPlan over decodeSpriteOrderPlan) runs it from the ROM F at
// the unit start and must equal the ROM created / destroyed slots and free order F after every allocation window (ord124Check.ts method).
// Controls: the static texts `D1,2`, `D2,1` and the production 310:opponent row (`D1,2/P537,537`, tied: the lend order).
// usage: node --experimental-strip-types tools/integration/ord149Check.ts <out.json> <units.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor } from "../../src/engine/spriteOrderProvider.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Drop { slot: number; prioWord: number; yBorn: number; yLast: number; rise: number }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[];
  astonish?: { createF: number; destroyF: number; steps: number; droplets: Drop[]; romPair: number[] } | null }
interface Job { identicalAB: boolean; units: Unit[] }

/** Source (AnimSprayWaterDroplet_Step): the droplet's rise after `steps` steps from its v2 word (data[1] = 896 +/- v2, -32 per step). */
export function ord149DropletRise(v2: number, steps = 30): number {
  let data1 = v2 % 2 ? 896 + v2 : 896 - v2, rise = 0;
  for (let k = 0; k < steps; k++, data1 -= 32) rise += data1 >> 8;
  return rise;
}
export const ORD149_RISE_CLASSES: readonly number[] = [...new Set(Array.from({ length: 128 }, (_, v2) => ord149DropletRise(v2)))].sort((l, r) => l - r);
/** The words law's plan text (rises after the 30 sorted steps). */
export const ord149PlanText = (rise1: number, rise2: number) => `Cf;D0;Cff;D1,2/P${rise1},${rise2}`;

const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);
export function ord149CheckUnit(unit: Pick<Unit, "F0" | "windows" | "strayFChanges">, text: string): string[] {
  const plan = decodeSpriteOrderPlan(text);
  const start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
  const problems: string[] = [];
  if (unit.windows.length !== plan.length) problems.push(`window count ${unit.windows.length} != plan ${plan.length}`);
  if (unit.strayFChanges !== 0) problems.push(`${unit.strayFChanges} F changes without allocation`);
  let cursor = start;
  for (let k = 0; k < Math.min(plan.length, unit.windows.length); k++) {
    const before = cursor;
    cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
    const rom = unit.windows[k]!;
    if (!cursor.order.known) { problems.push(`window ${k}: plan did not resolve`); break; }
    const created = cursor.occupied.filter(slot => !before.occupied.includes(slot));
    const destroyed = before.occupied.filter(slot => !cursor.occupied.includes(slot));
    if (!same(created, rom.C.map(([slot]) => slot).sort((l, r) => l - r)) || !same(destroyed, [...rom.D].sort((l, r) => l - r))
      || !same(cursor.order.free, rom.F)) problems.push(`window ${k} f${rom.f}: F ${same(cursor.order.free, rom.F) ? "==" : "!="}`);
  }
  return problems;
}

const CONTROLS = { "static D1,2": "Cf;D0;Cff;D1,2", "static D2,1": "Cf;D0;Cff;D2,1", "row 310:opponent (tied P537)": "Cf;D0;Cff;D1,2/P537,537" };
if (process.argv[1]?.endsWith("ord149Check.ts")) {
  const out: Record<string, unknown> = { schema: "ord149-check/v1", riseClasses30: ORD149_RISE_CLASSES };
  const bodies: Record<string, { instances: number; exact: number; firstBodies: number; laterBodies: number; ties: number; byLend: Record<string, number>;
    riseClassesObserved: number[]; controlsExact: Record<string, number>; mismatches: string[] }> = {};
  let notIdentical = 0;
  const input = JSON.parse(readFileSync(process.argv[3]!, "utf8")) as { jobs: Record<string, Job> };
  for (const [name, job] of Object.entries(input.jobs)) {
    if (!job.identicalAB) notIdentical += 1;
    let seen = 0;
    for (const unit of job.units) {
      const m = /^body 310:(player|opponent)$/.exec(unit.label);
      if (unit.kind !== "body" || unit.truncated || !m) continue;
      const entry = bodies[m[1]!] ??= { instances: 0, exact: 0, firstBodies: 0, laterBodies: 0, ties: 0, byLend: {}, riseClassesObserved: [],
        controlsExact: Object.fromEntries(Object.keys(CONTROLS).map(k => [k, 0])), mismatches: [] };
      entry.instances += 1;
      if (seen++ === 0) entry.firstBodies += 1; else entry.laterBodies += 1;
      const a = unit.astonish;
      if (!a || a.steps !== 30 || a.droplets.length !== 2) { entry.mismatches.push(`${name}@${unit.frame}: no droplet record`); continue; }
      // the creation row shows the first step already (3 px for every word): the 30-step rise is the observed rise + 3
      const [r1, r2] = a.droplets.map(d => d.rise + 3) as [number, number];
      for (const r of [r1, r2]) if (!entry.riseClassesObserved.includes(r)) entry.riseClassesObserved.push(r);
      if (r1 === r2) entry.ties += 1;
      const lend = `F0 [${unit.F0.slice(0, 2).join(",")},..] ${r1 === r2 ? "tie" : r1 < r2 ? "rise1<rise2" : "rise1>rise2"} -> ${unit.plan.split(";")[3]}`;
      entry.byLend[lend] = (entry.byLend[lend] ?? 0) + 1;
      const problems = [...(ORD149_RISE_CLASSES.includes(r1) && ORD149_RISE_CLASSES.includes(r2) ? [] : [`rise ${r1},${r2} not a source class`]),
        ...ord149CheckUnit(unit, ord149PlanText(r1, r2))];
      if (problems.length === 0) entry.exact += 1; else entry.mismatches.push(`${name}@${unit.frame}: ${problems.join(" | ")}`);
      for (const [k, text] of Object.entries(CONTROLS)) if (ord149CheckUnit(unit, text).length === 0) entry.controlsExact[k]! += 1;
    }
  }
  for (const e of Object.values(bodies)) e.riseClassesObserved.sort((l, r) => l - r);
  out.notIdenticalAB = notIdentical;
  out.bodies = bodies;
  writeFileSync(process.argv[2]!, JSON.stringify(out, null, 1) + "\n");
  console.log(`${notIdentical} jobs with A != B; source rise classes ${ORD149_RISE_CLASSES.join(",")}`);
  for (const [side, e] of Object.entries(bodies)) {
    console.log(`body 310:${side}: law ${e.exact}/${e.instances} exact per window (first ${e.firstBodies}, later ${e.laterBodies}, ties ${e.ties}); controls ${JSON.stringify(e.controlsExact)}`);
    for (const m of e.mismatches) console.log(`   MISMATCH ${m}`);
  }
}
