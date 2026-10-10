// plans69: fixtures/plans69/plan-rows.json (sprite-order-body-plans/rows-v1, the format of fixtures/plans51/plan-rows.json) from the
// proven plans of plans69Check.ts (check.json), for the production table (the temp patch fixtures/plans69/temp-patch.diff appends it
// after plans54's rows in tools/integration/spriteOrderProductionTable.ts). Bodies of both sides; anims keyed General:B_ANIM_<name>.
// Magnitude 222 is power-keyed: 222 = MagnitudeRegular (gAnimMovePower <= 99), 20222 = MagnitudeIntense (> 99; the host key).
// usage: node --experimental-strip-types tools/integration/plans69PlanRows.ts <check.json> <plan-rows.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";

type Result = { instances: number; matched: number; matchedCreateMerged: number; jobs: string[]; sides: string[] };
const check = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as { plans: Record<string, string>; results: Record<string, Result> };
const evidence = (label: string, createMerged = false) => {
  const r = check.results[label]!;
  const ok = createMerged ? r.matchedCreateMerged : r.matched;
  if (ok !== r.instances) throw new Error(`${label}: ${ok}/${r.instances}`);
  if (r.sides.length !== 2) throw new Error(`${label}: proven on ${r.sides.join("+")} only`);
  return createMerged
    ? `${r.matched}/${r.instances} instances exact per frame, ${r.matchedCreateMerged}/${r.instances} create-merged (same creations, burst split across a frame boundary), ${r.jobs.length} jobs, both sides (plans69 check.json "${label}")`
    : `${r.matched}/${r.instances} instances exact per frame, ${r.jobs.length} jobs, both sides (plans69 check.json "${label}")`;
};
const row = (label: string, rule: string, createMerged = false) => ({ verdict: "EXACT-PLAN", rule, tier: "confirmed", evidence: evidence(label, createMerged),
  plan: decodeSpriteOrderPlan(check.plans[label]!) });
const bodies: Record<string, unknown> = {};
const both = (move: number, r: ReturnType<typeof row>) => { for (const side of ["player", "opponent"]) bodies[`${move}:${side}`] = r; };
both(176, row("body 176", "Conversion 2, both sides identical (16 fixed-argument gConversion2SpriteTemplate sprites; no Random2, no geometry key)"));
// 302:player is already in the base table (sprite-order-body-plans-ext.json) with this very text: only the opponent row is new
bodies["302:opponent"] = row("body 302", "Needle Arm, both sides identical to the base table's 302:player (fixed-argument spikes, hitsplat and fist; no Random2; the 10-sprite burst may straddle a frame boundary)", true);
both(222, row("body 222 power<=99", "Magnitude, gAnimMovePower <= 99 (MagnitudeRegular: tasks only, no allocation)"));
both(20222, row("body 222 power>99", "Magnitude, gAnimMovePower > 99 (MagnitudeIntense: two complex_palette_blend controllers); host key 20222"));
const anims: Record<string, unknown> = {
  "General:B_ANIM_CASTFORM_CHANGE": row("general CASTFORM_CHANGE", "General_CastformChange: tasks only (AnimTask_TransformMon / AnimTask_CastformGfxDataChange), no allocation; Castform on both sides, sun and rain"),
};
writeFileSync(process.argv[3]!, JSON.stringify({ schema: "sprite-order-body-plans/rows-v1",
  note: "plans69 EXACT plans (docs/next-adapters-plans69.md; receipts units.json / check.json in this directory).",
  bodies, anims }) + "\n");
console.log(`${Object.keys(bodies).length} bodies, ${Object.keys(anims).length} anims`);
