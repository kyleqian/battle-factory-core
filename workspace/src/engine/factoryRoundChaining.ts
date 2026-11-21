/**
 * In-session Battle Factory round-to-round chaining: the counters a real
 * challenge carries from one round's terminal into the next round's draft
 * (win streak, symbol count, cumulative Battle Points, rents count), and the
 * pure construction of that next draft screen from the live generator
 * (`factoryRoundBattleOrchestrator.ts`'s `generateFactoryRoundDeal`: the six set
 * ids, the first opponent, the six personalities, the ROM's order).
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
import { ANCHOR_FACTORY_METADATA } from "./factoryAnchorSession.ts";
import type { FactoryInitialRentalGenerationResult } from "./factoryRentalGeneration.ts";
import { generateFactoryRoundDeal } from "./factoryRoundBattleOrchestrator.ts";

const STAGES_PER_CHALLENGE = factoryEndingPolicy.constants.stagesPerChallenge;
const MAX_STREAK = factoryEndingPolicy.constants.maxStreak;
const MAX_BATTLE_POINTS = factoryEndingPolicy.constants.maxBattlePoints;

export type FactoryHeardBrainSpeech = Readonly<{ silver: boolean; gold: boolean }>;

export type FactoryCarry = Readonly<{
  /** `GetCurrentFacilityWinStreak()` entering the next round. */
  factoryWinStreak: number;
  factorySymbolsCount: 0 | 1 | 2;
  /** In-session cumulative Battle Points; not the source save's persisted total. */
  battlePoints: number;
  /** Source `factoryRentsCount` for the selected battle/level mode. */
  rentsCount: number;
  playerTrainerId: number;
  /**
   * FRONTIER_DATA_HEARD_BRAIN_SPEECH: the Factory's two `battledBrainFlags` bits (`frontier_util.c:596-605`, 1 << 8 silver, 1 << 9 gold), set
   * when Noland's first speech of that tier is shown (BattleFactoryBattleRoom scripts.inc:118-121, :144-147) and never cleared, so they outlive
   * a lost challenge, like the symbols. Absent = neither heard (a fresh save).
   */
  heardBrainSpeech?: FactoryHeardBrainSpeech;
}>;

/**
 * What a save keeps of the Factory (singles, Level 50) from one challenge to the next, whatever the streak: the symbol count
 * (FLAG_SYS_FACTORY_SILVER / GOLD) and the two heard-speech bits. Absent = a fresh save. The library takes it as a start record and
 * reports it at the end of a replay (src/factoryContract.ts `FactoryFrontierRecord`).
 */
export type FactoryFrontierRecord = Readonly<{ symbols: 0 | 1 | 2; heardBrainSpeech: FactoryHeardBrainSpeech }>;

/**
 * The records a save can hold. The silver symbol is given only after the silver battle, whose first meeting sets the silver bit before the
 * battle (BattleFactoryBattleRoom scripts.inc:118-121); the gold battle is reachable only with the silver symbol (GetFrontierBrainStatus, frontier_util.c:1669-1676)
 * and its first meeting sets the gold bit before the battle (:144-147), and the gold bit is the one read and written once a symbol is held
 * (GetFrontierData / SetFrontierData: hasSymbol, frontier_util.c:846-858). So: a symbol needs the silver bit, two symbols need the gold bit,
 * and the gold bit needs a symbol. Throws on any other record.
 */
export function validateFactoryFrontierRecord(record: FactoryFrontierRecord): FactoryFrontierRecord {
  const { symbols, heardBrainSpeech } = record ?? ({} as FactoryFrontierRecord);
  if (symbols !== 0 && symbols !== 1 && symbols !== 2) throw new Error(`frontier.symbols must be 0, 1 or 2, got ${String(symbols)}`);
  if (typeof heardBrainSpeech?.silver !== "boolean" || typeof heardBrainSpeech?.gold !== "boolean") {
    throw new Error("frontier.heardBrainSpeech must be { silver: boolean, gold: boolean }");
  }
  if (symbols >= 1 && !heardBrainSpeech.silver) throw new Error("frontier: a symbol needs the silver speech heard (it is shown before the silver battle)");
  if (symbols === 2 && !heardBrainSpeech.gold) throw new Error("frontier: two symbols need the gold speech heard (it is shown before the gold battle)");
  if (symbols === 0 && heardBrainSpeech.gold) throw new Error("frontier: the gold speech is only heard with the silver symbol");
  return Object.freeze({ symbols, heardBrainSpeech: Object.freeze({ silver: heardBrainSpeech.silver, gold: heardBrainSpeech.gold }) });
}

export function createInitialFactoryCarry(playerTrainerId: number, frontier?: FactoryFrontierRecord): FactoryCarry {
  const record = frontier === undefined ? null : validateFactoryFrontierRecord(frontier);
  return Object.freeze({
    factoryWinStreak: 0,
    factorySymbolsCount: record?.symbols ?? 0,
    battlePoints: 0,
    rentsCount: 0,
    playerTrainerId,
    ...(record === null ? {} : { heardBrainSpeech: record.heardBrainSpeech }),
  });
}

/** The carry's frontier record (absent bits read as not heard). */
export function factoryFrontierRecordOf(carry: FactoryCarry): FactoryFrontierRecord {
  return Object.freeze({
    symbols: carry.factorySymbolsCount,
    heardBrainSpeech: Object.freeze({ silver: carry.heardBrainSpeech?.silver ?? false, gold: carry.heardBrainSpeech?.gold ?? false }),
  });
}

/** Both heard-speech records OR'd: the bits are only ever set (SetFrontierData, frontier_util.c:881-882). */
export function mergeFactoryHeardBrainSpeech(
  a: FactoryHeardBrainSpeech | undefined,
  b: FactoryHeardBrainSpeech | undefined,
): FactoryHeardBrainSpeech | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Object.freeze({ silver: a.silver || b.silver, gold: a.gold || b.gold });
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
  /** The round's heard-speech bits (its facility state): they stay, win or loss (the save keeps them). */
  heardBrainSpeechAfterRound?: FactoryHeardBrainSpeech,
): FactoryCarry {
  const heardBrainSpeech = mergeFactoryHeardBrainSpeech(carry.heardBrainSpeech, heardBrainSpeechAfterRound);
  return Object.freeze({
    factoryWinStreak: roundWon
      ? Math.min(MAX_STREAK, carry.factoryWinStreak + STAGES_PER_CHALLENGE)
      : 0,
    // Symbols are flags in the save: never taken back (a round built without the carry's count must not lower it).
    factorySymbolsCount: Math.max(carry.factorySymbolsCount, roundOutcome.newSymbolsCount) as 0 | 1 | 2,
    battlePoints: Math.min(MAX_BATTLE_POINTS, carry.battlePoints + roundOutcome.battlePointsAwarded),
    rentsCount: roundWon ? rentsCountAfterRound : 0,
    playerTrainerId: carry.playerTrainerId,
    ...(heardBrainSpeech === undefined ? {} : { heardBrainSpeech }),
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
 *
 * fop1 (docs/fop1-first-opponent-order.md): the draft's personalities are the
 * deal's, drawn after the round's first opponent (the ROM rolls it right after
 * the six set ids, PreBattleRoom scripts.inc:30-31), so the deal is the
 * round's own (`generateFactoryRoundDeal`, with the same inputs
 * `createPendingRoundOrchestrator` in core.ts gives the round's
 * orchestrator). `generation.rngValue` is the cursor at the end of the deal.
 */
export function generateFactoryChallengeDraft(
  carry: FactoryCarry,
  rngValue: number,
): FactoryGeneratedChallengeDraft {
  const { rentals: generation } = generateFactoryRoundDeal({
    rngValue,
    factoryWinStreak: carry.factoryWinStreak,
    rentsCount: carry.rentsCount,
    playerTrainerId: carry.playerTrainerId,
    factorySymbolsCount: carry.factorySymbolsCount,
    battleTowerLevel50WinStreak: ANCHOR_FACTORY_METADATA.battleTowerLevel50WinStreak,
  });
  return Object.freeze({
    generation,
    draftScreen: createDraftScreenStateFromRentalRecords(generation.rentals),
  });
}
