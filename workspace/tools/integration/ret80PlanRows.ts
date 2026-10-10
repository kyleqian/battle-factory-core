// ret80: fixtures/ret80/plan-rows.json (sprite-order-body-plans/rows-v1, the format of fixtures/plans69/plan-rows.json) from the
// proven plan of ret80Check.ts (check.json), for the production table (tools/integration/spriteOrderProductionTable.ts appends it after
// plans69's rows). Return 216 is power-keyed (AnimTask_GetReturnPowerLevel on gAnimFriendship): 216 stays plan 117 (ReturnMedium,
// 61..91, re-checked here); 30216 = ReturnStrongest (> 200; the host key). Weak / Strong keep invalidating (one pair each: no row).
// usage: node --experimental-strip-types tools/integration/ret80PlanRows.ts <check.json> <plan-rows.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";

type Result = { instances: number; matched: number; jobs: string[]; sides: string[] };
const check = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as { notIdenticalAB: number; plans: Record<string, string>; results: Record<string, Result> };
if (check.notIdenticalAB !== 0) throw new Error(`${check.notIdenticalAB} jobs differ A / B`);
const label = "body 216 strongest";
const r = check.results[label]!;
if (r.matched !== r.instances || r.sides.length !== 2) throw new Error(`${label}: ${r.matched}/${r.instances}, sides ${r.sides.join("+")}`);
const row = { verdict: "EXACT-PLAN", tier: "confirmed",
  rule: "Return, gAnimFriendship > 200 (ReturnStrongest: 31 creates -- dips, hitsplats and AnimTask_TraceMonBlended copies; one plan over 3 species pairs x 2 lab seeds per side); host key 30216",
  evidence: `${r.matched}/${r.instances} instances exact per frame, ${r.jobs.length} jobs (3 species pairs x 2 lab seeds per side), both sides (ret80 check.json "${label}")`,
  plan: decodeSpriteOrderPlan(check.plans[label]!) };
writeFileSync(process.argv[3]!, JSON.stringify({ schema: "sprite-order-body-plans/rows-v1",
  note: "ret80 EXACT plan (docs/ret80-return-order.md; receipts units.json / check.json in this directory).",
  bodies: { "30216:player": row, "30216:opponent": row }, anims: {} }) + "\n");
console.log("2 bodies, 0 anims");
