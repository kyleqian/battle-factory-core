// plans48: fixtures/plans48/plan-rows.json (sprite-order-body-plans/rows-v1, the format of fixtures/prep45/plan-rows.json) from the
// proven plans of prep48Check.ts (check.json), for the production table: tools/integration/spriteOrderProductionTable.ts appends it
// after prep45's rows. Bodies of both sides (Grudge: player only, the opponent plan is already in the base table; Razor Leaf: opponent
// only, the player plan is already there with the identical text); anims keyed Status:B_ANIM_STATUS_<name> / General:B_ANIM_<name>.
// usage: node --experimental-strip-types tools/integration/prep48PlanRows.ts <check.json> <plan-rows.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";

const check = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as { plans: Record<string, string>; results: Record<string, { instances: number; matched: number; jobs: string[] }> };
const evidence = (label: string) => {
  const r = check.results[label]!;
  if (r.matched !== r.instances) throw new Error(`${label}: ${r.matched}/${r.instances}`);
  return `${r.matched}/${r.instances} instances exact per frame, ${r.jobs.length} jobs (plans48 check.json "${label}")`;
};
const row = (label: string, rule: string) => ({ verdict: "EXACT-PLAN", rule, tier: "confirmed", evidence: evidence(label), plan: decodeSpriteOrderPlan(check.plans[label]!) });
const bodies: Record<string, unknown> = {};
const both = (move: number, label: string, rule: string) => { for (const side of ["player", "opponent"]) bodies[`${move}:${side}`] = row(label, rule); };
both(8, "body 8", "Ice Punch, both sides identical");
bodies["75:opponent"] = row("body 75", "Razor Leaf: the base table's 75:player plan, identical on the opponent side");
both(173, "body 173", "Snore, both sides identical");
bodies["288:player"] = row("body 288:player", "Grudge, player attacker (side-keyed: AnimTask_GrudgeFlames orbit; the opponent plan is already in the base table)");
both(13, "body 13 turn 0 (setup)", "Razor Wind charge (choosetwoturnanim turn 0)");
both(10013, "body 13 turn 1 (unleash)", "Razor Wind unleash (choosetwoturnanim turn 1; liveSpriteOrderHost maps an odd turn of 13 to 10013)");
const anims: Record<string, unknown> = {
  "Status:B_ANIM_STATUS_FRZ": row("status FRZ", "Status_Freeze: AnimTask_FrozenIceCube, one ice cube sprite"),
  "Status:B_ANIM_STATUS_NIGHTMARE": row("status NIGHTMARE", "Status_Nightmare: one gNightmareDevilSpriteTemplate sprite"),
  "Status:B_ANIM_STATUS_CURSED": row("status CURSED", "Status_Curse: one gCurseGhostSpriteTemplate sprite"),
  "General:B_ANIM_ITEM_KNOCKOFF": row("general ITEM_KNOCKOFF", "General_ItemKnockoff: one gKnockOffItemSpriteTemplate sprite; it survives the unit (carry)"),
};
writeFileSync(process.argv[3]!, JSON.stringify({ schema: "sprite-order-body-plans/rows-v1",
  note: "plans48 EXACT plans (docs/next-adapters-plans48.md; receipts units.json / check.json in this directory). 10013 = Razor Wind's odd choosetwoturnanim turn (liveSpriteOrderHost TWO_TURN_ANIM_MOVE_IDS + 13).",
  bodies, anims }) + "\n");
console.log(`${Object.keys(bodies).length} bodies, ${Object.keys(anims).length} anims`);
