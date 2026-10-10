// plans54: the Hail model's PREDICTED sprite-order plans (hailSpriteOrderPlan.ts over hail.ts's own timeline at the live case-258 profile)
// for the plans54Probe.py hail grid, written BEFORE the probes run (fixtures/plans54/hail-predictions.json). Move_HAIL (body 258) and
// General_Hail (HAIL_CONTINUES: `goto Move_HAIL`) target both battlers, never the attacker: one prediction per (player, opponent) species pair,
// for both attacker sides and the end-turn animation.
// usage: node --experimental-strip-types tools/integration/plans54HailPredict.ts <out.json>
import { writeFileSync } from "node:fs";
import { hailSpriteOrderPlanText } from "../../src/animation/hailSpriteOrderPlan.ts";
import { liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { battleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER } from "../../src/engine/spriteOrderProvider.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };

/** (player, opponent) internal species ids: DELIBIRD / ONIX (the scenarios), SNORLAX / GOLBAT both ways (elevated opponent), GLALIE / GOLEM. */
export const PLANS54_HAIL_PAIRS: readonly (readonly [number, number])[] = [[225, 95], [143, 42], [42, 143], [347, 76]];

export function predictedHailPlan(playerSpecies: number, opponentSpecies: number): string {
  const name = (id: number) => (speciesStats as { species: { id: number; name: string }[] }).species.find(s => s.id === id)!.name.replace(/^SPECIES_/, "");
  const mon = (id: number) => ({ species: id, speciesSymbol: name(id), name: name(id), level: 50, hp: 100, maxHP: 100, gender: "male", status: "none" });
  const field = { player: mon(playerSpecies), opponent: mon(opponentSpecies) } as never;
  const presentation = liveMoveAnimationPresentation(battleMoveAnimationRequest(0, 1, ["258", "0", "0", "0", "70", "0"]), field, 0, undefined, undefined,
    { known: true, free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER } as never);
  if (presentation === null) throw new Error(`no hail presentation at ${playerSpecies} / ${opponentSpecies}`);
  return hailSpriteOrderPlanText((presentation.config as { animationProfile: Parameters<typeof hailSpriteOrderPlanText>[0] }).animationProfile);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const predictions = Object.fromEntries(PLANS54_HAIL_PAIRS.map(([p, o]) => [`${p}-${o}`, predictedHailPlan(p, o)]));
  writeFileSync(process.argv[2]!, JSON.stringify({ schema: "plans54-hail-predictions/v1",
    note: "Recorded before the plans54 hail probes ran: hail.ts timeline at the live case-258 profile, known-entry occupancy.", predictions }, null, 1) + "\n");
  for (const [pair, plan] of Object.entries(predictions)) console.log(pair, plan);
}
