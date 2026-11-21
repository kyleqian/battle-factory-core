/**
 * fop1 (docs/fop1-first-opponent-order.md): a new challenge's deal in the ROM's order.
 *
 * BattleFrontier_BattleFactoryPreBattleRoom_EventScript_EnterRoom (scripts.inc:30-31) runs `factory_generaterentalmons` (the six set
 * ids) and then `factory_generateopponentmons` (the first trainer and its three sets) in one script run; the six personalities are drawn
 * later, when the select screen opens (CreateFrontierFactorySelectableMons). The engine used to draw the ids, the personalities, then
 * the opponent. These tests pin the order (ids, first opponent, personalities, back to back) on every path that rolls a round's first
 * opponent: the orchestrator's `generateInitial` round, the draft screen it must match, the PreBattleRoom briefing, and a seeded
 * challenge played to battle 1's first action menu.
 */

import { describe, expect, it } from "vitest";
import { createChallengeState } from "../src/factorySession.ts";
import {
  ANCHOR_BATTLE_1_SELECTION_END_RNG_VALUE,
  ANCHOR_BATTLE_1_SELECTION_RNG_VALUE,
  ANCHOR_BATTLE_1_SET_IDS,
  ANCHOR_FACTORY_METADATA,
  ANCHOR_SAVED_RENTAL_SET_IDS,
} from "../src/engine/factoryAnchorSession.ts";
import { getFactoryOpponentCommentary } from "../src/engine/factoryCommentary.ts";
import { createFactoryCorpusParty } from "../src/engine/factoryCorpusParty.ts";
import { generateFactoryOpponent } from "../src/engine/factoryOpponentGeneration.ts";
import { generateInitialFactoryRentals } from "../src/engine/factoryRentalGeneration.ts";
import {
  createFactoryRoundBattleOrchestrator,
  generateFactoryRoundDeal,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { createInitialFactoryCarry, generateFactoryChallengeDraft, type FactoryCarry } from "../src/engine/factoryRoundChaining.ts";
import { buildBriefingMessages, dealPrebattleEntry } from "../src/engine/prebattleEntry.ts";
import type { EngineState } from "../src/engine/core.ts";
import { createStartCarryState, runSeed } from "../tools/soak/randomRoundSoakDriver.ts";
import type { SoakCoverageCollector } from "../tools/soak/randomRoundSoakCoverage.ts";

const PLAYER_TRAINER_ID = ANCHOR_FACTORY_METADATA.playerTrainerId;

function generatedRound(rngValue: number, carry: FactoryCarry = createInitialFactoryCarry(PLAYER_TRAINER_ID)): FactoryRoundBattleOrchestratorState {
  // The config core.ts's createPendingRoundOrchestrator builds for a generated round.
  return createFactoryRoundBattleOrchestrator({
    id: `fop1-${rngValue}`,
    rngValue,
    factoryWinStreak: carry.factoryWinStreak,
    playerTrainerId: carry.playerTrainerId,
    battleTowerLevel50WinStreak: ANCHOR_FACTORY_METADATA.battleTowerLevel50WinStreak,
    factorySymbolsCount: carry.factorySymbolsCount,
    facilityState: { rentsCount: carry.rentsCount },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  });
}

function firstOpponentOf(state: FactoryRoundBattleOrchestratorState) {
  const scheduled = state.opponentGenerations[0]!;
  return {
    trainerId: scheduled.trainerId,
    setIds: scheduled.generation.opponents.map((opponent) => opponent.setId),
    firstDrawRngBefore: scheduled.generation.drawLedger[0]!.rngBefore,
    selectionRngValue: scheduled.kind === "ordinary" ? scheduled.generation.selectionRngValue : null,
  };
}

describe("fop1: the first opponent against the ROM's own deals", () => {
  it("round 1 (the anchor's deal): from the ROM's GenerateInitialRentalMons cursor the engine rolls the ROM's trainer 50 and sets", () => {
    // docs/anchor-draft-cursor-receipt.md section 3: GenerateInitialRentalMons' entry cursor 145179184 (frame 5796); its return cursor
    // 1172530733 is where trainer 50 DESTIN's selection starts (factoryAnchorSession.ts's ROM-probed ledger), same frame, no gap.
    const state = generatedRound(145_179_184);
    expect(state.initialRentalGeneration!.rentals.map((rental) => rental.setId)).toEqual([...ANCHOR_SAVED_RENTAL_SET_IDS]);
    expect(state.initialRentalGeneration!.selectionRngValue).toBe(ANCHOR_BATTLE_1_SELECTION_RNG_VALUE);
    expect(firstOpponentOf(state)).toEqual({
      trainerId: 50,
      setIds: [...ANCHOR_BATTLE_1_SET_IDS],
      firstDrawRngBefore: ANCHOR_BATTLE_1_SELECTION_RNG_VALUE,
      selectionRngValue: ANCHOR_BATTLE_1_SELECTION_END_RNG_VALUE,
    });
  });

  it("a Lobby new challenge (lbre-prebattle-c-off): from the ROM's deal cursor the engine rolls the ROM's trainer 13 and sets", () => {
    // tools/probe/lbre-deal-ram.py over tools/compare/traces/lbre-prebattle-c-off.json: gRngValue 0xdb35a7d8 at frame 6659 (the cursor
    // tests/lbre.test.ts pins as the engine's rngValueBefore), and at frame 6660 rentalMons' set ids 150, 173, 123, 168, 132, 124,
    // gTrainerBattleOpponent_A 13 (trainerIds[0] 13), gFrontierTempParty 133, 189, 137 and gRngValue 0xf6e707e7 (the cursor right after
    // the opponent's three sets: nothing else was drawn in that frame after the deal). The old order rolled trainer 28 (194, 197, 129).
    const state = generatedRound(0xdb35a7d8);
    expect(state.initialRentalGeneration!.rentals.map((rental) => rental.setId)).toEqual([150, 173, 123, 168, 132, 124]);
    expect(firstOpponentOf(state)).toMatchObject({ trainerId: 13, setIds: [133, 189, 137], selectionRngValue: 0xf6e707e7 });
  });
});

describe("fop1: the deal's order (six ids, first opponent, six personalities)", () => {
  const CURSORS = [0, 1, 0x1234_5678, 0xdead_beef, 3_677_726_680] as const;
  const CARRIES: readonly FactoryCarry[] = [
    createInitialFactoryCarry(PLAYER_TRAINER_ID),
    // a won round carried (challenge 1, rental rank 1)
    Object.freeze({ ...createInitialFactoryCarry(PLAYER_TRAINER_ID), factoryWinStreak: 7, rentsCount: 15 }),
  ];

  for (const carry of CARRIES) {
    for (const cursor of CURSORS) {
      it(`streak ${carry.factoryWinStreak}, cursor ${cursor}: the opponent is rolled after the ids, the personalities after it`, () => {
        const ids = generateInitialFactoryRentals({
          rngValue: cursor,
          factoryWinStreak: carry.factoryWinStreak,
          rentsCount: carry.rentsCount,
          playerTrainerId: PLAYER_TRAINER_ID,
        });
        const opponent = generateFactoryOpponent({
          rngValue: ids.selectionRngValue,
          factoryWinStreak: carry.factoryWinStreak,
          battleIndex: 0,
          storedTrainerIds: [],
          savedRentalSetIds: ids.rentals.map((rental) => rental.setId),
          playerTrainerId: PLAYER_TRAINER_ID,
          battleTowerLevel50WinStreak: ANCHOR_FACTORY_METADATA.battleTowerLevel50WinStreak,
        });
        const rentals = generateInitialFactoryRentals({
          rngValue: cursor,
          factoryWinStreak: carry.factoryWinStreak,
          rentsCount: carry.rentsCount,
          playerTrainerId: PLAYER_TRAINER_ID,
          constructionRngValue: opponent.rngValue,
        });

        const state = generatedRound(cursor, carry);
        // The first opponent is generateFactoryOpponent at the cursor after the six ids, whole (trainer, sets, personalities, ledger).
        expect(state.opponentGenerations[0]!.generation).toEqual(opponent);
        expect(state.round.rules.currentOpponent.rentalRecords?.map((record) => record.setId))
          .toEqual(opponent.opponents.map((member) => member.setId));
        // The six personalities come after it: the first personality draw starts at the opponent's end cursor.
        expect(state.initialRentalGeneration).toEqual(rentals);
        const firstConstruction = rentals.drawLedger.find((draw) => draw.phase === "personality")!;
        expect(firstConstruction.rngBefore).toBe(opponent.rngValue);
        // The set ids do not depend on the order; the personalities do (this cursor's old order drew them from the ids' end).
        expect(rentals.rentals.map((rental) => rental.setId)).toEqual(ids.rentals.map((rental) => rental.setId));
        // The round's battle cursor is the end of the deal; the three segments are contiguous, in the ROM's order.
        expect(state.round.rules.rngValue).toBe(rentals.rngValue);
        expect(state.rngSegments.map((segment) => [segment.kind, segment.rngBefore, segment.rngAfter])).toEqual([
          ["initial-rental-selection", cursor >>> 0, ids.selectionRngValue],
          ["opponent-generation", ids.selectionRngValue, opponent.rngValue],
          ["initial-rental-construction", opponent.rngValue, rentals.rngValue],
        ]);
        for (let index = 1; index < state.rngSegments.length; index += 1) {
          expect(state.rngSegments[index]!.callStart).toBe(state.rngSegments[index - 1]!.callEnd);
        }
        expect(state.facilityRngCalls).toBe(rentals.drawLedger.length + opponent.drawLedger.length);
        // The one shared deal function says the same.
        const deal = generateFactoryRoundDeal({
          rngValue: cursor,
          factoryWinStreak: carry.factoryWinStreak,
          rentsCount: carry.rentsCount,
          playerTrainerId: PLAYER_TRAINER_ID,
          factorySymbolsCount: carry.factorySymbolsCount,
          battleTowerLevel50WinStreak: ANCHOR_FACTORY_METADATA.battleTowerLevel50WinStreak,
        });
        expect(deal.rentals).toEqual(rentals);
        expect(deal.firstOpponent.generation).toEqual(opponent);
      });
    }
  }

  it("a staged round whose first battle is the Frontier Brain's keeps his party after the personalities (built at the battle's start)", () => {
    // Test-only streak 20 (battle 21, silver): FillFactoryBrainParty runs from FillFactoryTrainerParty at the battle's start.
    const carry: FactoryCarry = Object.freeze({ ...createInitialFactoryCarry(PLAYER_TRAINER_ID), factoryWinStreak: 20 });
    const state = generatedRound(0x1234_5678, carry);
    const rentals = state.initialRentalGeneration!;
    const brain = state.opponentGenerations[0]!;
    expect(brain.kind).toBe("frontier-brain");
    expect(rentals).toEqual(generateInitialFactoryRentals({ rngValue: 0x1234_5678, factoryWinStreak: 20, rentsCount: 0, playerTrainerId: PLAYER_TRAINER_ID }));
    expect(brain.generation.drawLedger[0]!.rngBefore).toBe(rentals.rngValue);
    expect(state.rngSegments.map((segment) => segment.kind))
      .toEqual(["initial-rental-selection", "initial-rental-construction", "opponent-generation"]);
    expect(state.round.rules.rngValue).toBe(brain.generation.rngValue);
  });

  it("the draft screen shows the deal's rentals (personalities after the opponent), and the cursor goes on from the deal's end", () => {
    for (const carry of CARRIES) {
      for (const cursor of CURSORS) {
        const state = generatedRound(cursor, carry);
        const draft = generateFactoryChallengeDraft(carry, cursor);
        expect(draft.generation).toEqual(state.initialRentalGeneration);
        expect(draft.draftScreen.rentals.map((rental) => [rental.source.setId, rental.source.personality]))
          .toEqual(state.initialRentalGeneration!.rentals.map((rental) => [rental.setId, rental.personality]));
        expect(draft.generation.rngValue).toBe(state.round.rules.rngValue);
      }
    }
  });

  it("the PreBattleRoom briefing describes the round's first opponent (the one the battle brings)", () => {
    for (const carry of CARRIES) {
      for (const cursor of CURSORS) {
        const state = generatedRound(cursor, carry);
        const commentary = getFactoryOpponentCommentary(createFactoryCorpusParty(
          state.round.rules.currentOpponent.rentalRecords as Parameters<typeof createFactoryCorpusParty>[0],
        ));
        const messages = buildBriefingMessages(carry, cursor);
        expect(messages[1]![0]!.lines).toEqual(commentary.favoriteTypeLines ?? []);
        expect(messages[2]![0]!.lines).toEqual(commentary.battleStyleLines ?? []);
        const dealt = dealPrebattleEntry(carry, cursor);
        expect(dealt.messages).toEqual(messages);
        expect(dealt.draft.generation).toEqual(state.initialRentalGeneration);
      }
    }
  });

  it("a seeded challenge (start: draft) shows the deal's six and the live cursor goes on from the end of the deal", () => {
    const state = createChallengeState({ battleScene: "off", gameplaySeed: 0x1234_5678 });
    const round = generatedRound(0x1234_5678);
    expect(state.draftScreen.rentals.map((rental) => rental.source.personality))
      .toEqual(round.initialRentalGeneration!.rentals.map((rental) => rental.personality));
    expect(state.rngValue).toBe(round.round.rules.rngValue);
    expect(state.pendingGeneratedRound).toMatchObject({ rngValueBefore: 0x1234_5678 });
  });
});

describe("fop1: played through the engine", () => {
  it("a generated challenge played to battle 1's first action menu fights the deal's first opponent with the drafted personalities", () => {
    const walk = 4_321;
    let first: EngineState | null = null;
    let last: EngineState | null = null;
    const observer = {
      beginSeed: () => {},
      recordPlayerFightCommit: () => {},
      observe: (state: EngineState) => {
        if (first === null) first = state;
        last = state;
      },
    } as unknown as SoakCoverageCollector;
    const start = createStartCarryState(0, walk);
    const result = runSeed(0, {
      policy: "winning",
      stopAtFirstActionMenu: true,
      renderEvery: 0,
      maxFrames: 6_000,
      stateFactory: () => start,
      coverage: observer,
    });
    expect(result).toMatchObject({ outcome: "OK", endState: "milestone:first-action-menu", battle: 1 });
    const bootRngValue = start.pendingGeneratedRound!.rngValueBefore;
    const deal = generateFactoryRoundDeal({
      rngValue: bootRngValue,
      factoryWinStreak: 0,
      rentsCount: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      factorySymbolsCount: 0,
      battleTowerLevel50WinStreak: ANCHOR_FACTORY_METADATA.battleTowerLevel50WinStreak,
    });
    expect(first!.draftScreen.rentals.map((rental) => rental.source.personality))
      .toEqual(deal.rentals.rentals.map((rental) => rental.personality));
    const orchestrator = last!.factoryRoundBattleOrchestrator!;
    expect(orchestrator.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(orchestrator.opponentGenerations[0]!.generation).toEqual(deal.firstOpponent.generation);
    expect(orchestrator.initialRentalGeneration).toEqual(deal.rentals);
    // The party the battle starts with is three of the drafted six, with the draft's personalities.
    const drafted = new Map(deal.rentals.rentals.map((rental) => [rental.setId, rental.personality]));
    for (const record of orchestrator.round.rules.playerRentalRecords!) {
      expect(drafted.get(record.setId)).toBe(record.personality);
    }
  }, 120_000);
});
