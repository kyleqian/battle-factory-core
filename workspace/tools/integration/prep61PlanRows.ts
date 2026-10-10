// prep61: fixtures/prep61/plan-rows.json (sprite-order-body-plans/rows-v1, the format of fixtures/prep45/plan-rows.json) from the
// per-frame proven plans of prep61Check.ts (check.json): Fly 19 / Bounce 340 setup bodies and their choosetwoturnanim unleash bodies under
// the host's second-branch keys 10019 / 10340 (TWO_TURN_ANIM_MOVE_IDS + 19, 340 in the prep61 patch). Every row requires exact == instances
// and >= 2 jobs; a key's both sides must be proven. Dive 291 / 10291 is words-dependent: no row.
// For a fold: tools/integration/spriteOrderProductionTable.ts appends this file after plans54's rows (fixtures/prep61/prep61-temp-src.diff).
// usage: node --experimental-strip-types tools/integration/prep61PlanRows.ts <check.json> <plan-rows.json>
import { readFileSync, writeFileSync } from "node:fs";
import { decodeSpriteOrderPlan } from "../../src/engine/spriteOrderEventTransform.ts";

const check = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as {
  plans: Record<string, string>; labels: Record<string, { instances: number; exact: number; frames: number; jobs: string[] }>;
};
const RULES: Record<number, string> = {
  19: "Fly setup (FlySetUp): gFlyBallUpSpriteTemplate only",
  10019: "Fly unleash (FlyUnleash, choosetwoturnanim 2nd branch): the ball, then (delay 20) the basic hitsplat; the ball is destroyed first",
  340: "Bounce setup (BounceSetUp): gBounceBallShrinkSpriteTemplate only",
  10340: "Bounce unleash (BounceUnleash, 2nd branch): the landing ball, then (delay 7) the basic hitsplat; destroy order by side",
};
const bodies: Record<string, unknown> = {};
for (const key of [19, 10019, 340, 10340]) {
  for (const side of ["player", "opponent"]) {
    const label = `body ${key}:${side}`;
    const r = check.labels[label];
    if (r === undefined || r.exact !== r.instances || r.jobs.length < 2) throw new Error(`${label}: ${r ? `${r.exact}/${r.instances}, ${r.jobs.length} jobs` : "absent"}`);
    bodies[`${key}:${side}`] = { verdict: "EXACT-PLAN", rule: RULES[key], tier: "confirmed",
      evidence: `${r.exact}/${r.instances} instances exact per frame (${r.frames} allocation frames), ${r.jobs.length} jobs, 2 attacker species (prep61 check.json "${label}")`,
      plan: decodeSpriteOrderPlan(check.plans[label]!) };
  }
}
writeFileSync(process.argv[3]!, JSON.stringify({ schema: "sprite-order-body-plans/rows-v1",
  note: "prep61 semi-invulnerable two-turn plans (docs/next-adapters-prep61.md; receipts units.json / check.json in this directory).",
  bodies, anims: {} }) + "\n");
console.log(`${Object.keys(bodies).length} bodies`);
