/**
 * fop1 (docs/fop1-first-opponent-order.md "The census keeps its battles"): tools/integration/censusRound.ts builds a census seed's
 * battle as the orchestrator's `generateInitial` round built it before fop1: the six rentals from the seed (set ids, then
 * personalities), the first opponent from the cursor after them, the round's battle cursor after the opponent. Checked against the
 * pre-fop1 orchestrator on 3,200 (seed, streak) pairs when it was written (scratch, not committed); this pins the same construction.
 */
import { describe, expect, it } from "vitest";
import { generateFactoryOpponent } from "../src/engine/factoryOpponentGeneration.ts";
import { generateInitialFactoryRentals } from "../src/engine/factoryRentalGeneration.ts";
import { createFactoryRoundBattleOrchestrator } from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { CENSUS_PLAYER_TRAINER_ID, censusDeal, censusRentals } from "../tools/integration/censusRound.ts";

describe("fop1: the census seed's battle (censusRound.ts)", () => {
  for (const [seed, streak] of [[0, 0], [17, 21], [134, 4], [549, 0], [950, 13], [0xdead_beef, 42]] as const) {
    it(`seed ${seed}, streak ${streak}: six rentals then the opponent from the cursor after their personalities`, () => {
      const rentals = generateInitialFactoryRentals({ rngValue: seed, factoryWinStreak: streak, rentsCount: 0, playerTrainerId: CENSUS_PLAYER_TRAINER_ID });
      expect(censusRentals({ seed, factoryWinStreak: streak })).toEqual(rentals);
      const opponent = generateFactoryOpponent({
        rngValue: rentals.rngValue, factoryWinStreak: streak, battleIndex: 0, storedTrainerIds: [],
        savedRentalSetIds: rentals.rentals.map((rental) => rental.setId), playerTrainerId: CENSUS_PLAYER_TRAINER_ID, battleTowerLevel50WinStreak: 0,
      });
      const state = createFactoryRoundBattleOrchestrator({
        id: `census-${seed}`, battleScene: "on", factoryWinStreak: streak, playerTrainerId: CENSUS_PLAYER_TRAINER_ID,
        battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 }, ...censusDeal({ seed, factoryWinStreak: streak }),
      });
      expect(state.opponentGenerations[0]!.generation).toEqual(opponent);
      expect(state.round.rules.playerRentalRecords).toEqual(rentals.rentals.slice(0, 3));
      expect(state.round.rules.rngValue).toBe(opponent.rngValue);
      expect(state.initialRentalGeneration).toBeNull();
    });
  }

  it("takes other picks and refuses a bad one", () => {
    const rentals = censusRentals({ seed: 7 });
    const deal = censusDeal({ seed: 7, selectedRentalIndexes: [5, 0, 3] });
    expect(deal.rentals.type === "currentRecords" && deal.rentals.playerRentalRecords).toEqual([5, 0, 3].map((index) => rentals.rentals[index]));
    expect(() => censusDeal({ seed: 7, selectedRentalIndexes: [1, 1, 2] })).toThrow(/three distinct slots/);
  });
});
