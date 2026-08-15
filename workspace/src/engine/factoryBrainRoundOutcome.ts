/**
 * Pure `GiveBattlePoints` + `GiveFacilitySymbol` port
 * (`frontier_util.c:1853-1925`), scoped to Battle Factory Level 50 Singles.
 * Given the streak entering a battle, its win/loss result, and whether that
 * battle was a scheduled Frontier Brain encounter, returns the battle-point
 * award and symbol-grant outcome exactly as the ROM's post-battle Lobby
 * script computes them (`frontier_givepoints`/`frontier_givesymbol`,
 * `data/maps/BattleFrontier_BattleFactoryLobby/scripts.inc:44-46`, gated per
 * `EventScript_DefeatedNolandSilver`/`...Gold`,
 * `BattleFrontier_BattleFactoryBattleRoom/scripts.inc:128-167`).
 *
 * `sBattlePointAwards`'s row index is derived from the streak *after* this
 * win (`factoryWinStreaks[...] / FRONTIER_STAGES_PER_CHALLENGE`, decremented
 * unless zero, clamped to the last row, `frontier_util.c:1876,1886-1889`) --
 * distinct from `FillFactoryBrainParty`'s own `challengeNum`
 * (`factoryBrainOpponentGeneration.ts`), which divides the streak *entering*
 * the battle with neither the decrement nor the +1. The two coincide for
 * every real Brain win because Brain battles only ever land on a round's
 * seventh win, whose entering streak is always ≡6 (mod 7).
 *
 * `GiveFacilitySymbol` itself (`:1918-1925`) is just "silver if the count was
 * 0, else gold" -- the STREAK/STREAK_LONG "no symbol" behavior (audit doc §3)
 * is not a branch inside that function; it comes from the calling script's
 * own guard (`frontier_getsymbols != 0` / `!= 2`) never reaching
 * `frontier_givesymbol` when the brain status is STREAK/STREAK_LONG, since
 * those statuses only fire once both symbols are already held. Encoding the
 * grant as keyed strictly off `frontierBrain.status` reproduces that without
 * re-deriving the guard.
 */
import factoryEndingPolicy from "../data/gen/factory-ending-policy.json" with { type: "json" };
import type { FrontierBrainStatus } from "./frontierBrainStatus.ts";

const STAGES_PER_CHALLENGE = factoryEndingPolicy.constants.stagesPerChallenge;
const FACTORY_SINGLES_BP_BY_CHALLENGE_ROW: readonly number[] =
  factoryEndingPolicy.seventhWin.battlePoints.factorySinglesByAwardRow;
const BRAIN_BP_BONUS = factoryEndingPolicy.seventhWin.battlePoints.brainBonus;

export type FactoryBrainRoundOutcomeInput = Readonly<{
  outcome: "win" | "loss";
  /** `GetCurrentFacilityWinStreak()` entering this battle, before this result applies. */
  factoryWinStreak: number;
  /** `GetPlayerSymbolCountForFacility(FRONTIER_FACILITY_FACTORY)` entering this battle. */
  factorySymbolsCount: 0 | 1 | 2;
  /** Set exactly when `gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN`; mirrors `currentOpponent.frontierBrain`. */
  frontierBrain?: Readonly<{ status: Exclude<FrontierBrainStatus, "not-ready"> }>;
}>;

export type FactoryBrainRoundOutcomeResult = Readonly<{
  battlePointsAwarded: number;
  symbolGranted: boolean;
  newSymbolsCount: 0 | 1 | 2;
}>;

function requireNonnegativeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a nonnegative integer, got ${value}`);
  }
  return value;
}

export function applyFactoryBrainRoundOutcome(
  input: FactoryBrainRoundOutcomeInput,
): FactoryBrainRoundOutcomeResult {
  const factoryWinStreak = requireNonnegativeInteger(input.factoryWinStreak, "factoryWinStreak");

  if (input.outcome === "loss") {
    return Object.freeze({
      battlePointsAwarded: 0,
      symbolGranted: false,
      newSymbolsCount: input.factorySymbolsCount,
    });
  }

  const postWinStreak = factoryWinStreak + 1;
  let challengeNum = Math.floor(postWinStreak / STAGES_PER_CHALLENGE);
  if (challengeNum !== 0) challengeNum -= 1;
  if (challengeNum >= FACTORY_SINGLES_BP_BY_CHALLENGE_ROW.length) {
    challengeNum = FACTORY_SINGLES_BP_BY_CHALLENGE_ROW.length - 1;
  }

  let battlePointsAwarded = FACTORY_SINGLES_BP_BY_CHALLENGE_ROW[challengeNum]!;
  if (input.frontierBrain !== undefined) battlePointsAwarded += BRAIN_BP_BONUS;

  let symbolGranted = false;
  let newSymbolsCount = input.factorySymbolsCount;
  if (input.frontierBrain?.status === "silver") {
    symbolGranted = true;
    newSymbolsCount = 1;
  } else if (input.frontierBrain?.status === "gold") {
    symbolGranted = true;
    newSymbolsCount = 2;
  }

  return Object.freeze({ battlePointsAwarded, symbolGranted, newSymbolsCount });
}
