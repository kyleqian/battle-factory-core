// usage: npx vite-node tools/integration/s10aRouteSeedSearch.ts MOVEID [maxSeed] [streaks]
// Ordinary generated-rental battles (generatedCommandAnimationReplay's orchestrator recipe) whose lead player mon knows MOVEID; prints the
// lead's and the opponent lead's moves (route-test seed search, S10A Ice Ball / Dive).
import { beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator } from "../../src/engine/factoryRoundBattleOrchestrator.ts";
const [moveId, max = "200", streaks = "0,7,14,21"] = process.argv.slice(2);
for (const streak of streaks.split(",").map(Number)) for (let seed = 0; seed < Number(max); seed += 1) {
  const state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-animation-generated-${seed}`, rngValue: seed, battleScene: "on", factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 }, rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] } }));
  const parties = (state as unknown as { battleStartIntro: { command: { parties: Record<string, { species: number; moves: number[] }[]> } } })
    .battleStartIntro.command.parties;
  const lead = parties.player![0]!;
  if (lead.moves.includes(Number(moveId))) console.log("seed", seed, "streak", streak, "species", lead.species, "moves", lead.moves.join(","),
    "slot", lead.moves.indexOf(Number(moveId)), "opponent", parties.opponent![0]!.species, parties.opponent![0]!.moves.join(","));
}
