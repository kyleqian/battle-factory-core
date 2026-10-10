// plans54: the Water Spout model's PREDICTED sprite-order plans (waterSpoutSpriteOrderPlan.ts over waterSpout.ts's own timeline at the case-323
// inputs, through the production seam liveMoveGeometrySpriteOrderPlanText(323, side, species, field)) per (attacker side, attacker species,
// HP tier) at the known-entry lend, written BEFORE the plans54 Water Spout probes ran (fixtures/plans54/water-spout-predictions.json).
// Fit before: plans' ROM corpus instances (323:player / 323:opponent, scenario "wailmer" = NOSEPASS 320 at full HP) equal the model.
// usage: node --experimental-strip-types tools/integration/plans54WaterSpoutPredict.ts <out.json>
import { writeFileSync } from "node:fs";
import { liveMoveGeometrySpriteOrderPlanText } from "../../src/engine/liveMoveAnimation.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER } from "../../src/engine/spriteOrderProvider.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };

/** Attackers: NOSEPASS 320 (the "wailmer" lab scenarios' lead), KINGDRA 230 (its tier stagings KO the SHUCKLE: never probed) and MAGIKARP
 * 129 (added before its probes); defender SHUCKLE 213. Tier HP over max 200. */
export const PLANS54_WATER_SPOUT_ATTACKERS = [320, 230, 129] as const;
const TIER_HP = [20, 70, 120, 200] as const;

/** The prediction at the known-entry lend; a later body is predicted by the same committed function at its own start order (`lentFree`). */
export function predictedWaterSpoutPlan(side: "player" | "opponent", attacker: number, tier: 0 | 1 | 2 | 3,
  lentFree: readonly number[] = KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER): string | null {
  const name = (id: number) => (speciesStats as { species: { id: number; name: string }[] }).species.find(s => s.id === id)!.name.replace(/^SPECIES_/, "");
  const mon = (id: number, hp: number) => ({ species: id, speciesSymbol: name(id), name: name(id), level: 50, hp, maxHP: 200, gender: "male", status: "none" });
  const field = (side === "player" ? { player: mon(attacker, TIER_HP[tier]), opponent: mon(213, 200) }
    : { player: mon(213, 200), opponent: mon(attacker, TIER_HP[tier]) }) as never;
  return liveMoveGeometrySpriteOrderPlanText(323, side, { playerSpecies: (field as any).player.species, opponentSpecies: (field as any).opponent.species },
    field, lentFree);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const predictions: Record<string, string | null> = {};
  for (const side of ["player", "opponent"] as const) for (const attacker of PLANS54_WATER_SPOUT_ATTACKERS) for (const tier of [0, 1, 2, 3] as const) {
    predictions[`${side}-${attacker}-t${tier}`] = predictedWaterSpoutPlan(side, attacker, tier);
  }
  writeFileSync(process.argv[2]!, JSON.stringify({ schema: "plans54-water-spout-predictions/v1",
    note: "Recorded before the plans54 Water Spout probes ran: waterSpout.ts timeline at the case-323 inputs (production seam).", predictions }, null, 1) + "\n");
  for (const [key, plan] of Object.entries(predictions)) console.log(key, plan === null ? "null" : `${plan.split(";").length} windows`);
}
