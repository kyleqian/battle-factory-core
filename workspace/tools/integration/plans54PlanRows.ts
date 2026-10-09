// plans54: fixtures/plans54/plan-rows.json (sprite-order-body-plans/rows-v1, the format of fixtures/prep45/plan-rows.json) from the
// proven keyed plans of plans54Check.ts (check.json), for the production table: tools/integration/spriteOrderProductionTable.ts appends it
// after plans51's rows. Fury Cutter's order keys (liveSpriteOrderHost.ts FURY_CUTTER_ORDER_KEYS) on both sides. Eruption is geometry-keyed
// through the seam (eruptionSpriteOrderPlan.ts) and has no row here.
// usage: node --experimental-strip-types tools/integration/plans54PlanRows.ts <check.json> <plan-rows.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";

const check = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as { plans: Record<string, string>; results: Record<string, { instances: number; matched: number; jobs: string[]; sides: string[] }> };
const evidence = (label: string) => {
  const r = check.results[label]!;
  if (r.matched !== r.instances) throw new Error(`${label}: ${r.matched}/${r.instances}`);
  if (r.sides.length !== 2) throw new Error(`${label}: proven on ${r.sides.join("+")} only`);
  return `${r.matched}/${r.instances} instances exact per frame, ${r.jobs.length} jobs, both sides (plans54 check.json "${label}")`;
};
const row = (label: string, rule: string) => ({ verdict: "EXACT-PLAN", rule, tier: "confirmed", evidence: evidence(label), plan: decodeSpriteOrderPlan(check.plans[label]!) });
const bodies: Record<string, unknown> = {};
const both = (move: number, label: string, rule: string) => { for (const side of ["player", "opponent"]) bodies[`${move}:${side}`] = row(label, rule); };
both(210, "body 210", "Fury Cutter, furyCutterCounter 1 (FuryCutterContinue2): the gCuttingSliceSpriteTemplate slice only; either slice direction");
for (const [key, branch] of [[10210, "2 (FuryCutterMedium)"], [20210, "3 (FuryCutterStrong)"], [30210, "4+ (FuryCutterStrongest)"]] as const) {
  both(key, `body ${key}`, `Fury Cutter, furyCutterCounter ${branch}: the slice and the complex_palette_blend controller in one frame; the blend is destroyed first`);
}
writeFileSync(process.argv[3]!, JSON.stringify({ schema: "sprite-order-body-plans/rows-v1",
  note: "plans54 keyed plans (docs/next-adapters-plans54.md; receipts units.json / check.json in this directory).",
  bodies, anims: {} }) + "\n");
console.log(`${Object.keys(bodies).length} bodies`);
