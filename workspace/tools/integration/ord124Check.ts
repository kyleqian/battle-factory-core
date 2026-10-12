// ord124 (docs/ord124-order-plans.md): per-window ROM check of the ord124 plan rows (computed Odor Sleuth 316, observed False Swipe 206) (fixtures/ord124/ord124-plan-rows.json,
// rendered to text exactly as spriteOrderProductionTable.ts does) against direct-mGBA unit receipts (plans69Extract.py / ord124Extract.py):
// the production cursor (applySpriteOrderUnitPlan over decodeSpriteOrderPlan) runs from the ROM F at the unit start, and the created /
// destroyed slots and the free order F must equal the ROM after every allocation window (plans69Check.ts checkUnit, per frame, no merging).
// Also lists the Hyper Beam 63 bodies' observed plan classes and the units between a Hyper Beam body and the next body (recharge turn).
// usage: node --experimental-strip-types tools/integration/ord124Check.ts <out.json> <units.json>...
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, type SpriteOrderPlan } from "../../src/engine/spriteOrderProvider.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
interface Job { identicalAB: boolean; units: Unit[] }
type Token = readonly ["n", number] | readonly ["c", number, number] | readonly ["o", number];
interface Window { readonly C?: readonly (readonly ["n", number, "f" | "e"])[]; readonly D?: readonly Token[]; readonly pw?: readonly number[] }

// spriteOrderProductionTable.ts planText (copied: that script writes the table at import)
const tokenText = (t: Token) => t[0] === "n" ? `${t[1]}` : t[0] === "c" ? `c${t[1]}.${t[2]}` : `o${t[1]}`;
const planText = (plan: readonly Window[]) => plan.map((window) => {
  const parts: string[] = [];
  if (window.C) parts.push(`C${window.C.map(([, , mode]) => mode).join("")}`);
  if (window.D) parts.push(`D${window.D.map(tokenText).join(",")}`);
  if (window.pw) parts.push(`P${window.pw.join(",")}`);
  return parts.join("/");
}).join(";");

const rows = JSON.parse(readFileSync("tools/integration/fixtures/ord124/ord124-plan-rows.json", "utf8")) as { bodies: Record<string, { plan: Window[] }> };
const texts = Object.fromEntries(Object.entries(rows.bodies).map(([key, row]) => [key, planText(row.plan)]));
const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);

function checkUnit(unit: Unit, text: string): string[] {
  const plan: SpriteOrderPlan = decodeSpriteOrderPlan(text);
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
      || !same(cursor.order.free, rom.F)) problems.push(`window ${k} f${rom.f}: created ${created} destroyed ${destroyed} F ${same(cursor.order.free, rom.F) ? "==" : "!="}`);
  }
  return problems;
}

const out: Record<string, unknown> = { schema: "ord124-check/v1", planTexts: texts };
const bodies: Record<string, { instances: number; exact: number; firstBodies: number; laterBodies: number; byLend: Record<string, number>;
  observed: Record<string, number>; mismatches: string[] }> = {};
const hyperBeam: Record<string, string[]> = {};
const recharge: string[] = [];
let notIdentical = 0;
for (const file of process.argv.slice(3)) {
  const input = JSON.parse(readFileSync(file, "utf8")) as { jobs: Record<string, Job> };
  for (const [name, job] of Object.entries(input.jobs)) {
    if (!job.identicalAB) notIdentical += 1;
    let seen = 0;
    job.units.forEach((unit, index) => {
      if (unit.kind !== "body" || unit.truncated) return;
      const m = /^body (\d+):(player|opponent)$/.exec(unit.label);
      if (!m || (m[1] !== "63" && texts[`${m[1]}:${m[2]}`] === undefined)) return;
      const key = `${m[1]}:${m[2]}`;
      if (m[1] === "63") {
        (hyperBeam[key] ??= []).push(`${name}@${unit.frame}`);
        const next = job.units.slice(index + 1).filter(u => u.windows.length > 0).slice(0, 3).map(u => `${u.kind} ${u.label} ${u.plan}`);
        recharge.push(`${name}@${unit.frame} -> ${next.join(" | ")}`);
        return;
      }
      const entry = bodies[key] ??= { instances: 0, exact: 0, firstBodies: 0, laterBodies: 0, byLend: {}, observed: {}, mismatches: [] };
      const problems = checkUnit(unit, texts[key]!);
      entry.instances += 1;
      if (seen++ === 0) entry.firstBodies += 1; else entry.laterBodies += 1;
      const lend = `F0 [${unit.F0.slice(0, 2).join(",")},..]${m[1] === "316" ? ` -> ${unit.plan.split(";")[5]}` : ""}`;
      entry.byLend[lend] = (entry.byLend[lend] ?? 0) + 1;
      entry.observed[unit.plan] = (entry.observed[unit.plan] ?? 0) + 1;
      if (problems.length === 0) entry.exact += 1; else entry.mismatches.push(`${file.split("/").pop()} ${name}@${unit.frame}: ${problems.join(" | ")}`);
    });
  }
}
out.notIdenticalAB = notIdentical;
out.bodies = bodies;
out.hyperBeamPlanClasses = Object.fromEntries(Object.entries(hyperBeam).map(([k, v]) => [k, v.length]));
out.hyperBeamNextUnits = recharge;
writeFileSync(process.argv[2]!, JSON.stringify(out, null, 1) + "\n");
console.log(`${notIdentical} jobs with A != B`);
for (const [key, e] of Object.entries(bodies)) {
  console.log(`body ${key}: ${e.exact}/${e.instances} exact per window (first ${e.firstBodies}, later ${e.laterBodies}); ${JSON.stringify(e.byLend)}`);
  for (const m of e.mismatches) console.log(`   MISMATCH ${m}`);
}
for (const line of recharge) console.log(`hyper beam ${line.slice(0, 200)}`);
