// plans48: the Dream Eater (138) geometry-keyed plan PREDICTIONS for the prep48Probe.py BODY138 species grid, written BEFORE those probes
// ran (fixtures/plans48/dream-eater-prediction.json), from the production seam (liveMoveAnimation.ts liveMoveGeometrySpriteOrderPlanText
// -> dreamEater.ts dreamEaterSpriteOrderPlanText -> absorptionOrbSpriteOrderPlan.ts, the renderer's own timeline). Pairs = attacker-defender.
// usage: node --experimental-strip-types tools/integration/prep48DreamEaterPredict.ts <out.json>
import { writeFileSync } from "node:fs";
import { liveMoveGeometrySpriteOrderPlanText } from "../../src/engine/liveMoveAnimation.ts";

export const DREAM_EATER_GRID: Readonly<Record<"player" | "opponent", readonly (readonly [number, number])[]>> = Object.freeze({
  player: [[40, 95], [50, 42], [172, 131], [208, 50]],
  opponent: [[40, 95], [50, 143], [172, 42], [143, 172], [40, 131], [50, 95], [95, 42], [208, 131]],
});
export const dreamEaterPredicted = (side: "player" | "opponent", attacker: number, defender: number) =>
  liveMoveGeometrySpriteOrderPlanText(138, side, side === "player" ? { playerSpecies: attacker, opponentSpecies: defender }
    : { playerSpecies: defender, opponentSpecies: attacker });

if (import.meta.url === `file://${process.argv[1]}`) {
  const predictions: Record<string, string | null> = {};
  for (const side of ["player", "opponent"] as const) for (const [a, d] of DREAM_EATER_GRID[side]) predictions[`de-${side === "player" ? "ply" : "opp"}-${a}-${d}`] = dreamEaterPredicted(side, a, d);
  const distinct = [...new Set(Object.values(predictions))];
  writeFileSync(process.argv[2]!, JSON.stringify({ schema: "plans48-dream-eater-prediction/v1",
    recordedBefore: "the plans48 Dream Eater species-grid probes (prep48Probe.py BODY138 jobs) were run",
    plans: distinct, predictions: Object.fromEntries(Object.entries(predictions).map(([job, text]) => [job, distinct.indexOf(text)])) }, null, 1) + "\n");
  console.log(Object.keys(predictions).length, "pairs,", distinct.length, "distinct predicted plans");
}
