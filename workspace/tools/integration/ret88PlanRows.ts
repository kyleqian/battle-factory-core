// ret88: fixtures/ret88/plan-rows.json (sprite-order-body-plans/rows-v1, the format of fixtures/ret80/plan-rows.json) from the proven
// plan of ret88Check.ts (check.json), for the production table (tools/integration/spriteOrderProductionTable.ts appends it after ret80's
// rows). Return 216 is power-keyed (AnimTask_GetReturnPowerLevel on gAnimFriendship): 40216 = ReturnWeak (< 61; the kernel's
// friendship 0). Strong keeps invalidating (one pair per side: no row).
// usage: node --experimental-strip-types tools/integration/ret88PlanRows.ts <check.json> <plan-rows.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";

type Result = { instances: number; matched: number; jobs: string[]; sides: string[]; carries: number };
const check = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as { notIdenticalAB: number; plans: Record<string, string>; results: Record<string, Result> };
if (check.notIdenticalAB !== 0) throw new Error(`${check.notIdenticalAB} jobs differ A / B`);
const label = "body 216 weak";
const r = check.results[label]!;
if (r.matched !== r.instances || r.sides.length !== 2) throw new Error(`${label}: ${r.matched}/${r.instances}, sides ${r.sides.join("+")}`);
const row = { verdict: "EXACT-PLAN", tier: "confirmed",
  rule: "Return, gAnimFriendship < 61 (ReturnWeak: dip, dip, hitsplat; one plan over 3 species pairs x 2 lab seeds per side, first and later bodies); host key 40216",
  evidence: `${r.matched}/${r.instances} instances exact per frame, ${r.jobs.length} jobs (3 species pairs x 2 lab seeds per side, 2 bodies each), both sides (ret88 check.json "${label}")`,
  plan: decodeSpriteOrderPlan(check.plans[label]!) };
writeFileSync(process.argv[3]!, JSON.stringify({ schema: "sprite-order-body-plans/rows-v1",
  note: "ret88 EXACT plan (docs/ret88-return-weak.md; receipts units.json / check.json in this directory).",
  bodies: { "40216:player": row, "40216:opponent": row }, anims: {} }) + "\n");
console.log("2 bodies, 0 anims");
