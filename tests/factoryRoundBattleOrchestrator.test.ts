import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import type { BattleSubmittedDecision } from "../src/engine/battleDecisionBoundary.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  advanceFactoryRoundPresentation,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  submitFactoryRoundPlayerDecision,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

const RNG_SEED = 4;
const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function record(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv: 31,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function acknowledgeAndAdvance(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  const commandId = state.round.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a presentation command");
  return advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(state, { commandId }),
  );
}

function choosePlayerDecision(
  state: FactoryRoundBattleOrchestratorState,
): BattleSubmittedDecision {
  const boundary = state.battle?.boundary;
  if (boundary?.kind !== "decision-required" || boundary.request.side !== "player") {
    throw new Error("expected a player decision");
  }
  if (boundary.request.kind === "forced-switch") {
    return { kind: "switch", partyIndex: boundary.request.legalPartyIndexes[0]! };
  }
  const active = state.battle!.rules.rulesContext.battlers[0];
  const preferredSlot = active.partyIndex === 1 && active.isFirstTurn === 2 ? 3 : 0;
  return boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move" && decision.moveSlot === preferredSlot,
  ) ?? boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move",
  )!;
}

describe("generated Factory round battle orchestrator (Gate-5 rung 11)", () => {
  it("owns battle 0 win through decline and battle 1's fresh command on one RNG cursor", () => {
    // This is the rung-11 "current full rental records" entry path. The three
    // selected Level-50 records are intentionally strong against challenge-0
    // generated opponents; the other records reproduce rentalMons[3..5] for
    // GenerateOpponentMons' six-species exclusion.
    const playerRecords = [record(664), record(678), record(527)] as const;
    const savedRentalRecords = [
      ...playerRecords,
      record(1),
      record(2),
      record(3),
    ] as const;
    let state = createFactoryRoundBattleOrchestrator({
      id: "generated-round-rung-11",
      rngValue: RNG_SEED,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      rentals: {
        type: "currentRecords",
        playerRentalRecords: playerRecords,
        savedRentalRecords,
      },
    });

    expect(state.round.opponentSelection.type).toBe("factoryGenerated");
    expect(state.round.rules.phase).toBe("presentingBattleStart");
    expect(state.battle).toBeNull();
    expect(state.opponentGenerations).toHaveLength(1);
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("battleActive");
    expect(state.battle?.boundary.kind).toBe("decision-required");
    expect(state.battle?.boundary.kind === "decision-required"
      && state.battle.boundary.request.side).toBe("player");

    for (let budget = 0; budget < 60 && state.battle !== null; budget += 1) {
      state = submitFactoryRoundPlayerDecision(state, choosePlayerDecision(state));
    }

    expect(state.battle).toBeNull();
    expect(state.round.rules.phase).toBe("presentingBattleWin");
    expect(state.round.rules.lastBattle?.outcome).toBe("win");
    expect(state.round.rules.lastBattle?.opponentParty.map((member) => member.hp))
      .toEqual([0, 0, 0]);

    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("awaitingSwapDecision");
    const swapOfferId = state.round.presentation?.command.commandId;
    if (swapOfferId === undefined) throw new Error("expected swap offer");
    state = completeFactoryRoundPresentation(state, { commandId: swapOfferId });
    state = chooseFactoryRoundSwap(state, { type: "decline" });
    expect(state.round.rules.phase).toBe("presentingSwapResult");
    state = acknowledgeAndAdvance(state);

    expect(state.round.rules.battleIndex).toBe(1);
    expect(state.round.rules.phase).toBe("presentingBattleStart");
    expect(state.battle).toBeNull();
    expect(state.opponentGenerations).toHaveLength(2);
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("battleActive");
    expect(state.battle?.boundary.kind).toBe("decision-required");
    expect(state.battle?.boundary.kind === "decision-required"
      && state.battle.boundary.request.side).toBe("player");

    // Generator ledgers retain their exact Random() receipts, and the
    // orchestrator's segments pin the uninterrupted cursor/order across
    // generation -> draw A/B -> battle -> next generation -> draw A/B.
    expect(state.rngSegments.map((segment) => ({
      kind: segment.kind,
      battleIndex: segment.battleIndex,
      callStart: segment.callStart,
      callEnd: segment.callEnd,
      rngBefore: segment.rngBefore,
      rngAfter: segment.rngAfter,
    }))).toEqual([
      {
        kind: "opponent-generation",
        battleIndex: 0,
        callStart: 0,
        callEnd: 152,
        rngBefore: 4,
        rngAfter: 2423399196,
      },
      {
        kind: "battle",
        battleIndex: 0,
        callStart: 152,
        callEnd: 327,
        rngBefore: 2423399196,
        rngAfter: 3960941853,
      },
      {
        kind: "opponent-generation",
        battleIndex: 1,
        callStart: 327,
        callEnd: 439,
        rngBefore: 3960941853,
        rngAfter: 2133491021,
      },
    ]);
    expect(state.opponentGenerations.map((generation) => ({
      trainerId: generation.trainerId,
      setIds: generation.opponents.map((opponent) => opponent.setId),
      draws: generation.drawLedger.length,
    }))).toEqual([
      { trainerId: 17, setIds: [122, 118, 110], draws: 152 },
      { trainerId: 51, setIds: [199, 178, 148], draws: 112 },
    ]);
    for (let index = 1; index < state.rngSegments.length; index += 1) {
      expect(state.rngSegments[index]!.callStart).toBe(state.rngSegments[index - 1]!.callEnd);
      expect(state.rngSegments[index]!.rngBefore).toBe(state.rngSegments[index - 1]!.rngAfter);
    }
    for (const generation of state.opponentGenerations) {
      generation.drawLedger.forEach((draw, index) => {
        expect(draw.position).toBe(index);
        expect(draw.rngAfter).toBe(advanceRngValue(draw.rngBefore));
        if (index > 0) expect(draw.rngBefore).toBe(generation.drawLedger[index - 1]!.rngAfter);
      });
    }
    expect(state.battle!.rng).toEqual({ calls: 2, value: 1174811135 });
    expect(state.facilityRngCalls).toBe(441);
  });

  it("seed 17 completes seven generated wins with multi-candidate trainer replacements on one cursor", () => {
    const playerRecords = [record(664), record(678), record(527)] as const;
    const savedRentalRecords = [...playerRecords, record(1), record(2), record(3)] as const;
    let state = createFactoryRoundBattleOrchestrator({
      id: "generated-round-rung-12-seed-17",
      rngValue: 17,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      rentals: {
        type: "currentRecords",
        playerRentalRecords: playerRecords,
        savedRentalRecords,
      },
    });
    let firstReplacement: {
      callsBefore: number;
      callsAfter: number;
      rngBefore: number;
      rngAfter: number;
      nextSide: string;
    } | null = null;

    for (let budget = 0; budget < 1_000 && state.round.rules.phase !== "roundComplete"; budget += 1) {
      if (state.battle !== null) {
        const partyIndexBefore = state.battle.rules.rulesContext.battlers[1].partyIndex;
        const callsBefore = state.battle.rng.calls;
        const rngBefore = state.battle.rng.value;
        state = submitFactoryRoundPlayerDecision(state, choosePlayerDecision(state));
        if (
          firstReplacement === null
          && state.battle !== null
          && state.battle.rules.rulesContext.battlers[1].partyIndex !== partyIndexBefore
        ) {
          firstReplacement = {
            callsBefore,
            callsAfter: state.battle.rng.calls,
            rngBefore,
            rngAfter: state.battle.rng.value,
            nextSide: state.battle.boundary.kind === "decision-required"
              ? state.battle.boundary.request.side
              : state.battle.boundary.kind,
          };
        }
        continue;
      }
      if (
        state.round.rules.phase === "presentingBattleStart"
        || state.round.rules.phase === "presentingBattleWin"
        || state.round.rules.phase === "presentingSwapResult"
      ) {
        state = acknowledgeAndAdvance(state);
        continue;
      }
      if (state.round.rules.phase === "awaitingSwapDecision") {
        const commandId = state.round.presentation?.command.commandId;
        if (commandId === undefined) throw new Error("expected swap-offer presentation command");
        state = completeFactoryRoundPresentation(state, { commandId });
        state = chooseFactoryRoundSwap(state, { type: "decline" });
        continue;
      }
      throw new Error(`unexpected rung-12 phase ${state.round.rules.phase}`);
    }

    expect(state.round.rules.phase).toBe("roundComplete");
    expect(state.round.rules.battleIndex).toBe(6);
    expect(state.round.rules.lastBattle?.outcome).toBe("win");
    expect(state.opponentGenerations).toHaveLength(7);
    expect(state.rngSegments.filter((segment) => segment.kind === "battle")).toHaveLength(7);
    expect(state.facilityRngCalls).toBe(1787);
    expect(firstReplacement).toEqual({
      callsBefore: 2,
      callsAfter: 16,
      rngBefore: 312997333,
      rngAfter: 713294723,
      nextSide: "player",
    });
    let cursor = firstReplacement!.rngBefore;
    for (let call = firstReplacement!.callsBefore; call < firstReplacement!.callsAfter; call += 1) {
      cursor = advanceRngValue(cursor);
    }
    expect(cursor).toBe(firstReplacement!.rngAfter);
    for (let index = 1; index < state.rngSegments.length; index += 1) {
      expect(state.rngSegments[index]!.callStart).toBe(state.rngSegments[index - 1]!.callEnd);
      expect(state.rngSegments[index]!.rngBefore).toBe(state.rngSegments[index - 1]!.rngAfter);
    }
  });
});
