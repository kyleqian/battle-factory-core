/**
 * In-session Battle Factory round-to-round chaining: the counters a real
 * challenge carries from one round's terminal into the next round's draft
 * (win streak, symbol count, cumulative Battle Points, rents count), and the
 * pure construction of that next draft screen from the live generator
 * (`factoryRentalGeneration.ts`'s `generateInitialFactoryRentals`).
 *
 * Cross-session persistence (saving) is explicitly out of scope: this carry
 * lives only in `EngineState` for the current app session, exactly like
 * every other in-memory engine field.
 */

import factoryEndingPolicy from "../data/gen/factory-ending-policy.json" with { type: "json" };
import type { FactoryBrainRoundOutcomeResult } from "./factoryBrainRoundOutcome.ts";
import {
  createDraftScreenStateFromRentalRecords,
  type DraftScreenState,
} from "./factoryDraftScreen.ts";
import {
  generateInitialFactoryRentals,
  type FactoryInitialRentalGenerationResult,
} from "./factoryRentalGeneration.ts";

const STAGES_PER_CHALLENGE = factoryEndingPolicy.constants.stagesPerChallenge;
const MAX_STREAK = factoryEndingPolicy.constants.maxStreak;
const MAX_BATTLE_POINTS = factoryEndingPolicy.constants.maxBattlePoints;

export type FactoryCarry = Readonly<{
  /** `GetCurrentFacilityWinStreak()` entering the next round. */
  factoryWinStreak: number;
  factorySymbolsCount: 0 | 1 | 2;
  /** In-session cumulative Battle Points; not the source save's persisted total. */
  battlePoints: number;
  /** Source `factoryRentsCount` for the selected battle/level mode. */
  rentsCount: number;
  playerTrainerId: number;
}>;

export function createInitialFactoryCarry(playerTrainerId: number): FactoryCarry {
  return Object.freeze({
    factoryWinStreak: 0,
    factorySymbolsCount: 0,
    battlePoints: 0,
    rentsCount: 0,
    playerTrainerId,
  });
}

/**
 * `UpdateFacilityWinStreak`-equivalent carry step for the challenge boundary:
 * a completed round banks exactly `STAGES_PER_CHALLENGE` (7) wins onto the
 * streak; a loss resets it to zero. Symbols and cumulative BP come straight
 * from the round's already-computed `applyFactoryBrainRoundOutcome` output;
 * rents count is whatever the just-finished round's facility state ended at,
 * unless the round was lost: source `InitFactoryChallenge`
 * (`battle_factory.c:208-212`) zeroes both `factoryWinStreaks` and
 * `factoryRentsCount` together whenever the win-streak-active flag is off
 * (the loss lobby script clears it), so a loss carries neither forward.
 */
export function advanceFactoryCarry(
  carry: FactoryCarry,
  roundWon: boolean,
  roundOutcome: FactoryBrainRoundOutcomeResult,
  rentsCountAfterRound: number,
): FactoryCarry {
  return Object.freeze({
    factoryWinStreak: roundWon
      ? Math.min(MAX_STREAK, carry.factoryWinStreak + STAGES_PER_CHALLENGE)
      : 0,
    factorySymbolsCount: roundOutcome.newSymbolsCount,
    battlePoints: Math.min(MAX_BATTLE_POINTS, carry.battlePoints + roundOutcome.battlePointsAwarded),
    rentsCount: roundWon ? rentsCountAfterRound : 0,
    playerTrainerId: carry.playerTrainerId,
  });
}

/**
 * Carry for a challenge entered from the Lobby after a loss or a RETIRE-YES.
 * Both end through `WarpToLobbyLost` -> `LostChallenge`, which clears
 * FACTORY_DATA_WIN_STREAK_ACTIVE; the next `factory_init` (`InitFactoryChallenge`,
 * battle_factory.c:208-212) therefore zeroes the win streak and the rents count
 * together. Symbols and Battle Points live in the save and are not touched.
 */
export function carryForNewChallengeAfterLobby(carry: FactoryCarry): FactoryCarry {
  return Object.freeze({ ...carry, factoryWinStreak: 0, rentsCount: 0 });
}

export type FactoryGeneratedChallengeDraft = Readonly<{
  generation: FactoryInitialRentalGenerationResult;
  draftScreen: DraftScreenState;
}>;

/**
 * Builds the next challenge's draft screen from the live generator, given
 * the carried counters and the RNG cursor to generate from (the previous
 * round's orchestrator-ending cursor - see `factoryRoundBattleOrchestrator.
 * test.ts`'s "starts challenge 2 generation from challenge 1's uninterrupted
 * orchestrator cursor": the ROM's Random() is one continuous global, so
 * chaining from that exact cursor is the source-faithful input, not a fresh
 * or arbitrary seed). Species/record shapes flow into the same draft-screen
 * constructor the canonical anchor boot uses - no anchor-record special
 * casing.
 */
export function generateFactoryChallengeDraft(
  carry: FactoryCarry,
  rngValue: number,
): FactoryGeneratedChallengeDraft {
  const generation = generateInitialFactoryRentals({
    rngValue,
    factoryWinStreak: carry.factoryWinStreak,
    rentsCount: carry.rentsCount,
    playerTrainerId: carry.playerTrainerId,
  });
  return Object.freeze({
    generation,
    draftScreen: createDraftScreenStateFromRentalRecords(generation.rentals),
  });
}
