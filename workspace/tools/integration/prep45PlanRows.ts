// prep45: fixtures/prep45/plan-rows.json (sprite-order-body-plans/rows-v1, the format of fixtures/prep43/plan-rows.json) from the
// proven plans of prep45Check.ts (check.json), for a production fold: tools/integration/spriteOrderProductionTable.ts appends such row
// sets after the base table. Bodies of both sides (side-keyed Dragon Dance: opponent only, the player plan is already in the base
// table; the other one-sided bodies 135 / 236 / 315 / 345 add the missing side with the base table's identical plan text); anims
// keyed General:B_ANIM_<name> / Status:B_ANIM_STATUS_<name> as the generator maps them. Plans are decodeSpriteOrderPlan's windows.
// usage: node --experimental-strip-types tools/integration/prep45PlanRows.ts <check.json> <plan-rows.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";

const check = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as { plans: Record<string, string>; results: Record<string, { instances: number; matched: number; jobs: string[] }> };
const evidence = (label: string) => { const r = check.results[label]!; return `${r.matched}/${r.instances} instances exact per frame, ${r.jobs.length} jobs (prep45 check.json "${label}")`; };
const row = (label: string, rule: string) => ({ verdict: "EXACT-PLAN", rule, tier: "confirmed", evidence: evidence(label), plan: decodeSpriteOrderPlan(check.plans[label]!) });
const bodies: Record<string, unknown> = {};
const both = (move: number, label: string, rule: string) => { for (const side of ["player", "opponent"]) bodies[`${move}:${side}`] = row(label, rule); };
both(56, "body 56", "Hydro Pump, both sides identical");
both(179, "body 179", "Reversal, both sides identical");
both(76, "body 76 turn 0 (setup)", "Solar Beam charge (choosetwoturnanim turn 0)");
both(10076, "body 76 turn 1 (unleash)", "Solar Beam unleash (choosetwoturnanim turn 1; liveSpriteOrderHost maps an odd turn of 76 to 10076)");
both(195, "body 195", "Perish Song, both sides identical");
bodies["349:opponent"] = row("body 349:opponent", "Dragon Dance, opponent attacker (side-keyed; the player plan is already in the base table)");
for (const [key, label, rule] of [["135:opponent", "body 135", "Softboiled: the base table's 135:player plan, identical on the opponent side"],
  ["315:player", "body 315", "Overheat: the base table's 315:opponent plan, identical on the player side"],
  ["345:opponent", "body 345", "Magical Leaf: the base table's 345:player plan, identical on the opponent side"],
  ["236:opponent", "body 236", "Moonlight: the base table's 236:player plan, identical on the opponent side"]] as const) bodies[key] = row(label, rule);
const anims: Record<string, unknown> = {
  "Status:B_ANIM_STATUS_BRN": row("status BRN", "Status_Burn: 3x BurnFlame; the third flame survives the unit (carry)"),
  "General:B_ANIM_TURN_TRAP_FIRE_SPIN": row("general TURN_TRAP FIRE_SPIN", "General_TurnTrap -> Status_FireSpin (wrapped move 83)"),
  "General:B_ANIM_TURN_TRAP_WHIRLPOOL": row("general TURN_TRAP WHIRLPOOL", "General_TurnTrap -> Status_Whirlpool (wrapped move 250)"),
  "General:B_ANIM_TURN_TRAP_SAND_TOMB": row("general TURN_TRAP SAND_TOMB", "General_TurnTrap -> Status_SandTomb (wrapped move 328)"),
  "General:B_ANIM_TURN_TRAP_BIND": row("general TURN_TRAP BIND", "General_TurnTrap -> Status_BindWrap (wrapped move Bind 20 / Wrap 35)"),
  "General:B_ANIM_WISH_HEAL": row("general WISH_HEAL", "General_WishHeal"),
  "General:B_ANIM_INGRAIN_HEAL": row("general INGRAIN_HEAL", "General_IngrainHeal -> AbsorbEffect (the LEECH_SEED_DRAIN orb core)"),
  "General:B_ANIM_FUTURE_SIGHT_HIT": row("general FUTURE_SIGHT_HIT", "General_FutureSightHit: visual tasks only, no sprite allocation (empty plan)"),
};
writeFileSync(process.argv[3]!, JSON.stringify({ schema: "sprite-order-body-plans/rows-v1",
  note: "prep45 EXACT plans (docs/next-adapters-prep45.md; receipts units.json / check.json in this directory). 10076 = Solar Beam's odd choosetwoturnanim turn (liveSpriteOrderHost TWO_TURN_ANIM_MOVE_IDS + 76). TURN_TRAP_<branch> = General_TurnTrap's branch by the trapped battler's wrapped move (the host maps the TURN_TRAP event argument; the kernel event must carry wrappedMove).",
  bodies, anims }) + "\n");
console.log(`${Object.keys(bodies).length} bodies, ${Object.keys(anims).length} anims`);
