// sw67 (docs/next-adapters-sw67.md): Shock Wave 351's geometry classes. For each side, every Factory Shock Wave user as the attacker against
// every Factory species as the target (internal species ids), the seam plan (liveMoveGeometrySpriteOrderPlanText 351 at the known-entry
// first-action order) grouped by plan text. Picks the probe grid's coverage; the grid itself is fixed in sw67Predict.ts.
// usage: node --experimental-strip-types tools/integration/sw67Classes.ts <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER } from "../../src/engine/spriteOrderProvider.ts";
import { sw67SeamPlan } from "./sw67ShockWaveFit.ts";

const speciesH = readFileSync(new URL("../../reference/pokeemerald/include/constants/species.h", import.meta.url), "utf8");
export const SPECIES_ID = new Map([...speciesH.matchAll(/#define (SPECIES_\w+) (\d+)/g)].map(m => [m[1]!, Number(m[2])]));
const mons = JSON.parse(readFileSync(new URL("../../src/data/gen/battle-frontier-mons.json", import.meta.url), "utf8")).entries as { species: string; moves: string[] }[];
export const FACTORY_SPECIES = [...new Set(mons.map(m => SPECIES_ID.get(m.species)!))].sort((l, r) => l - r);
export const SHOCK_WAVE_USERS = [...new Set(mons.filter(m => m.moves.includes("MOVE_SHOCK_WAVE")).map(m => SPECIES_ID.get(m.species)!))].sort((l, r) => l - r);

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2];
  const result: Record<string, { classes: { plan: string; windows: number; pairs: [number, number][] }[] }> = {};
  for (const side of ["player", "opponent"] as const) {
    const byPlan = new Map<string, [number, number][]>();
    for (const attacker of SHOCK_WAVE_USERS) for (const target of FACTORY_SPECIES) {
      const [player, opponent] = side === "player" ? [attacker, target] : [target, attacker];
      const plan = sw67SeamPlan(side, player, opponent, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER) ?? "null";
      byPlan.set(plan, [...(byPlan.get(plan) ?? []), [attacker, target]]);
    }
    result[side] = { classes: [...byPlan.entries()].sort((l, r) => r[1].length - l[1].length)
      .map(([plan, pairs]) => ({ plan, windows: plan === "null" ? 0 : plan.split(";").length, pairs })) };
    console.log(side, result[side]!.classes.map(c => `${c.windows}w x${c.pairs.length} attackers {${[...new Set(c.pairs.map(p => p[0]))].join(",")}}`).join(" | "));
  }
  if (out) writeFileSync(out, `${JSON.stringify({ schema: "sw67-classes-v1", users: SHOCK_WAVE_USERS, factorySpecies: FACTORY_SPECIES.length, ...result })}\n`);
}
