// The save's Factory record across challenges (library start record `frontier`, docs/parity-mac/frontier-record.md). The real save keeps the
// symbol count (FLAG_SYS_FACTORY_SILVER / GOLD) and the two heard-speech bits (battledBrainFlags, FRONTIER_DATA_HEARD_BRAIN_SPEECH) whatever the
// streak; the streak and the rent count reset on a loss (InitFactoryChallenge). GetFrontierBrainStatus (frontier_util.c:1656-1693) with the
// Factory's {21, 42, 21} (+1): no symbol, silver Noland at battle 21; one symbol, an ordinary trainer at 21 and gold Noland at 42; two symbols,
// the return battles at 21 (silver lines) and 42, 63, ... (gold lines), with no first speech and no symbol (BattleFactoryBattleRoom
// scripts.inc:113-117, DefeatedNolandSilver / DefeatedNolandGold :128-130, :154-156).
import { describe, expect, it } from "vitest";
import { battleRoomStateForOpponent } from "../src/engine/battleRoom.ts";
import { createFactoryRoundBattleOrchestrator } from "../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  advanceFactoryCarry, carryForNewChallengeAfterLobby, createInitialFactoryCarry, validateFactoryFrontierRecord, type FactoryCarry, type FactoryFrontierRecord,
} from "../src/engine/factoryRoundChaining.ts";
import { FactorySession } from "../src/factorySession.ts";
import { replayChallenge } from "../src/headless.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";
import { driveGeneratedRoundToCompletion, PLAYER_TRAINER_ID, stateAtDecidedRound } from "../tools/compare/factoryRoundCarrier.ts";

const NONE = { silver: false, gold: false };
const rec = (symbols: 0 | 1 | 2, silver: boolean, gold: boolean): FactoryFrontierRecord => ({ symbols, heardBrainSpeech: { silver, gold } });

describe("the start record: only what a save can hold", () => {
  it("accepts every record the game can reach and refuses the rest", () => {
    for (const ok of [rec(0, false, false), rec(0, true, false), rec(1, true, false), rec(1, true, true), rec(2, true, true)]) {
      expect(validateFactoryFrontierRecord(ok)).toEqual(ok);
    }
    // a symbol without the silver speech; two symbols without the gold speech; the gold speech without a symbol; out of range
    for (const bad of [rec(1, false, false), rec(2, true, false), rec(2, false, true), rec(0, false, true), rec(0, true, true)]) {
      expect(() => validateFactoryFrontierRecord(bad)).toThrow(/frontier/);
    }
    expect(() => validateFactoryFrontierRecord({ symbols: 3 as never, heardBrainSpeech: NONE })).toThrow(/symbols/);
    expect(() => validateFactoryFrontierRecord({ symbols: 1, heardBrainSpeech: { silver: true } as never })).toThrow(/heardBrainSpeech/);
    expect(() => new FactorySession({ battleScene: "off", frontier: rec(2, true, false) })).toThrow(/gold speech/);
  });

  it("every start takes it into the carry (the anchor draft, a seeded draft, after-save); absent is a fresh save", () => {
    const record = rec(1, true, false);
    for (const options of [{}, { gameplaySeed: 42 }, { start: "after-save" as const }, { start: "after-save" as const, gameplaySeed: 7 }]) {
      const session = new FactorySession({ battleScene: "off", ...options, frontier: record });
      expect(session.state.factoryCarry.factorySymbolsCount).toBe(1);
      expect(session.state.factoryCarry.heardBrainSpeech).toEqual(record.heardBrainSpeech);
      expect(session.frontierRecord()).toEqual(record);
      const fresh = new FactorySession({ battleScene: "off", ...options });
      expect(fresh.frontierRecord()).toEqual(rec(0, false, false));
    }
  });
});

describe("the carry keeps the record from one challenge to the next", () => {
  const outcome = (newSymbolsCount: 0 | 1 | 2) => ({ battlePointsAwarded: 0, symbolGranted: false, newSymbolsCount }) as never;
  it("a won or lost round keeps the symbols and ORs the heard bits; a new challenge after a loss keeps both", () => {
    const carry: FactoryCarry = createInitialFactoryCarry(PLAYER_TRAINER_ID, rec(1, true, false));
    const won = advanceFactoryCarry({ ...carry, factoryWinStreak: 35 }, true, outcome(2), 3, { silver: false, gold: true });
    expect([won.factorySymbolsCount, won.heardBrainSpeech]).toEqual([2, { silver: true, gold: true }]);
    // a round built without the carry's count (outcome 0) does not take a symbol back
    const lost = advanceFactoryCarry(carry, false, outcome(0), 0, undefined);
    expect([lost.factoryWinStreak, lost.rentsCount, lost.factorySymbolsCount, lost.heardBrainSpeech]).toEqual([0, 0, 1, { silver: true, gold: false }]);
    const next = carryForNewChallengeAfterLobby({ ...lost, factoryWinStreak: 14, rentsCount: 9 });
    expect([next.factoryWinStreak, next.rentsCount, next.factorySymbolsCount, next.heardBrainSpeech]).toEqual([0, 0, 1, { silver: true, gold: false }]);
  });

  it("the app builds the first round from the record (a seeded draft and the anchor draft)", () => {
    const record = rec(1, true, true);
    for (const options of [{ gameplaySeed: 42 }, {}]) {
      const session = new FactorySession({ battleScene: "off", ...options, frontier: record });
      const player = new RandomPlayer(new Rng(3), new ActionLog(false), "winning");
      for (let frame = 0; frame < 20_000 && session.state.factoryRoundBattleOrchestrator === null; frame += 1) session.tick(player.decide(session.state));
      const round = session.state.factoryRoundBattleOrchestrator!;
      expect(round.config.factorySymbolsCount).toBe(1);
      expect(round.facilityState.heardBrainSpeech).toEqual({ silver: true, gold: true });
    }
  });
});

// The round itself, from a carry (the orchestrator the app builds every round with). The curated strong trio wins these rounds.
function roundAt(streak: number, symbols: 0 | 1 | 2, seed: number) {
  const carry: FactoryCarry = { ...createInitialFactoryCarry(PLAYER_TRAINER_ID), factoryWinStreak: streak, factorySymbolsCount: symbols };
  const round = driveGeneratedRoundToCompletion(carry, seed);
  expect(round.round.rules.phase, `streak ${streak} symbols ${symbols} seed ${seed}`).toBe("roundComplete");
  return { round, carry, seventh: round.opponentGenerations[6]! };
}
// The battle at streak s (battle s + 1) as the round's next battle: what the schedule makes of it, without winning the battles before.
function battleAt(streak: number, symbols: 0 | 1 | 2) {
  const state = createFactoryRoundBattleOrchestrator({
    id: `frontier-${streak}-${symbols}`, rngValue: 9, factoryWinStreak: streak, playerTrainerId: PLAYER_TRAINER_ID, battleTowerLevel50WinStreak: 0,
    factorySymbolsCount: symbols, facilityState: { rentsCount: 0 }, rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  });
  const first = state.opponentGenerations[0]!;
  return { first, opponent: state.round.rules.currentOpponent, status: first.kind === "frontier-brain" ? first.status : "ordinary" };
}

describe("what the record changes: Noland's battles", () => {
  it("the schedule: battles 21, 42, 63 by the symbol count", () => {
    expect([battleAt(20, 0).status, battleAt(41, 0).status]).toEqual(["silver", "ordinary"]);
    expect([battleAt(20, 1).status, battleAt(41, 1).status, battleAt(62, 1).status]).toEqual(["ordinary", "gold", "ordinary"]);
    expect([battleAt(20, 2).status, battleAt(41, 2).status, battleAt(62, 2).status, battleAt(83, 2).status, battleAt(55, 2).status])
      .toEqual(["streak", "streak-long", "streak-long", "streak-long", "ordinary"]);
  });

  it("1 symbol: battle 21 is an ordinary trainer; battle 42 is gold Noland with his first speech, and beating him gives the gold symbol", () => {
    expect(roundAt(14, 1, 3).seventh.kind).toBe("ordinary");
    const gold = roundAt(35, 1, 14);
    expect(gold.seventh.kind === "frontier-brain" && gold.seventh.status).toBe("gold");
    expect(gold.round.roundOutcome).toMatchObject({ symbolGranted: true, newSymbolsCount: 2 });
    const opponent = gold.round.round.rules.currentOpponent;
    expect([battleRoomStateForOpponent(opponent, undefined, false).brainSpeechFirstEncounter, battleRoomStateForOpponent(opponent).brainSpeechTier])
      .toEqual([true, "gold"]);
  });

  it("2 symbols: battles 21, 42 and 63 are return battles, with no first speech and no symbol", () => {
    for (const [streak, seed, status] of [[14, 3, "streak"], [35, 14, "streak-long"]] as const) {
      const { round, seventh } = roundAt(streak, 2, seed);
      expect(seventh.kind === "frontier-brain" && seventh.status, `battle ${streak + 7}`).toBe(status);
      expect(round.roundOutcome).toMatchObject({ symbolGranted: false, newSymbolsCount: 2 });
    }
    for (const [streak, tier] of [[20, "silver"], [41, "gold"], [62, "gold"]] as const) {
      const room = battleRoomStateForOpponent(battleAt(streak, 2).opponent, undefined, false);
      expect([room.brainSpeechFirstEncounter, room.brainSpeechTier], `battle ${streak + 1}`).toEqual([false, tier]);
    }
  });

  it("no symbol: silver Noland at battle 21 gives the silver symbol; with his speech heard it is skipped", () => {
    const { round, seventh } = roundAt(14, 0, 3);
    expect(seventh.kind === "frontier-brain" && seventh.status).toBe("silver");
    expect(round.roundOutcome).toMatchObject({ symbolGranted: true, newSymbolsCount: 1 });
    const opponent = round.round.rules.currentOpponent;
    expect(battleRoomStateForOpponent(opponent, undefined, false).brainSpeechFirstEncounter).toBe(true);
    expect(battleRoomStateForOpponent(opponent, undefined, true).brainSpeechFirstEncounter).toBe(false);
  });
});

describe("replay and the result's record", () => {
  it("a replay with the same record reproduces the game and reports the record", () => {
    const record = rec(1, true, false);
    const session = new FactorySession({ battleScene: "off", gameplaySeed: 5, frontier: record });
    const player = new RandomPlayer(new Rng(5), new ActionLog(false), "winning");
    for (let frame = 0; frame < 40_000 && session.battles.length < 2 && session.ended === null; frame += 1) session.tick(player.decide(session.state));
    expect(session.battles.length).toBeGreaterThan(0);
    const replay = replayChallenge({ battleScene: "off", gameplaySeed: 5, frontier: record, segments: session.trace() });
    const atTraceEnd = new FactorySession({ battleScene: "off", gameplaySeed: 5, frontier: record });
    atTraceEnd.resume(session.trace());
    expect(replay).toEqual({ frames: atTraceEnd.frame, streak: atTraceEnd.streak, ended: atTraceEnd.ended, battles: atTraceEnd.battles,
      digest: atTraceEnd.digest(), frontier: record });
  });

  it("the result's record has what the challenge earned: a symbol as soon as its round ends, with the speech it implies", () => {
    const silver = roundAt(14, 0, 3);
    expect(silver.round.roundOutcome).toMatchObject({ symbolGranted: true, newSymbolsCount: 1 });
    const session = new FactorySession({ battleScene: "off" });
    session.state = { ...stateAtDecidedRound(silver.round, silver.carry) };
    expect(session.frontierRecord()).toEqual(rec(1, true, false));
    // a return battle earns nothing new
    const back = roundAt(14, 2, 3);
    session.state = { ...stateAtDecidedRound(back.round, { ...back.carry, heardBrainSpeech: { silver: true, gold: true } }) };
    expect(session.frontierRecord()).toEqual(rec(2, true, true));
  });
});
