// plans51: fixtures/plans51/plan-rows.json (sprite-order-body-plans/rows-v1, the format of fixtures/prep45/plan-rows.json) from the
// proven plans of plans51Check.ts (check.json), for the production table: tools/integration/spriteOrderProductionTable.ts appends it
// after plans48's rows. Bodies of both sides.
// usage: node --experimental-strip-types tools/integration/plans51PlanRows.ts <check.json> <plan-rows.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";

const check = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as { plans: Record<string, string>; results: Record<string, { instances: number; matched: number; jobs: string[]; sides: string[] }> };
const evidence = (label: string) => {
  const r = check.results[label]!;
  if (r.matched !== r.instances) throw new Error(`${label}: ${r.matched}/${r.instances}`);
  if (r.sides.length !== 2) throw new Error(`${label}: proven on ${r.sides.join("+")} only`);
  return `${r.matched}/${r.instances} instances exact per frame, ${r.jobs.length} jobs, both sides (plans51 check.json "${label}")`;
};
const row = (label: string, rule: string) => ({ verdict: "EXACT-PLAN", rule, tier: "confirmed", evidence: evidence(label), plan: decodeSpriteOrderPlan(check.plans[label]!) });
const bodies: Record<string, unknown> = {};
const both = (move: number, label: string, rule: string) => { for (const side of ["player", "opponent"]) bodies[`${move}:${side}`] = row(label, rule); };
both(200, "body 200", "Outrage, both sides identical (fixed-argument flames, 30-frame TranslateSpriteLinearAndFlicker; no Random2, no geometry key)");
const anims: Record<string, unknown> = {};
writeFileSync(process.argv[3]!, JSON.stringify({ schema: "sprite-order-body-plans/rows-v1",
  note: "plans51 EXACT plans (docs/next-adapters-plans51.md; receipts units.json / check.json in this directory).",
  bodies, anims }) + "\n");
console.log(`${Object.keys(bodies).length} bodies, ${Object.keys(anims).length} anims`);
