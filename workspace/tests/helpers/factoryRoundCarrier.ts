import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import type { BattleSubmittedDecision } from "../../src/engine/battleDecisionBoundary.ts";
import type { FactoryRentalRecord } from "../../src/engine/battleScenario.ts";
import { createInitialState, type EngineState } from "../../src/engine/core.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import {
  advanceFactoryRoundPresentation,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  submitFactoryRoundPlayerDecision,
  type FactoryRoundBattleOrchestratorState,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import type { FactoryCarry } from "../../src/engine/factoryRoundChaining.ts";

// Orchestrator-level round carrier shared by factoryRoundChaining.test.ts and lbrd.test.ts: drives a real generated round to
// roundComplete / roundLost through the orchestrator's public battle API (the player rents the known-strong 664 / 678 / 527 trio),
// bypassing the draft / battleRoom UI.
export const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

export function record(setId: number, fixedIv = 31): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

export function acknowledgeAndAdvance(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  const commandId = state.round.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a presentation command");
  return advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(state, { commandId }),
  );
}

export function choosePlayerDecision(
  state: FactoryRoundBattleOrchestratorState,
): BattleSubmittedDecision {
  const boundary = state.battle?.boundary;
  if (boundary?.kind !== "decision-required" || boundary.request.side !== "player") {
    throw new Error("expected a player decision");
  }
  if (boundary.request.kind === "forced-switch") {
    return { kind: "switch", partyIndex: boundary.request.legalPartyIndexes[0]! };
  }
  const active = state.battle!.rules.rulesContext.battlers[0]!;
  const preferredSlot = active.partyIndex === 1 && active.isFirstTurn === 2 ? 3 : 0;
  return boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move" && decision.moveSlot === preferredSlot,
  ) ?? boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move",
  )!;
}

/**
 * Drives a fresh `generateInitial` round to completion via the orchestrator's
 * public API only (no tick()/UI). `seed` is the round's starting
 * `rngValue`; `chooseSwap` lets a caller script an AskSwapMon accept (used
 * below to reach a scripted `roundLost`, matching
 * factoryRoundBattleOrchestrator.test.ts's own "lostAfterSwap" recipe).
 */
export function driveGeneratedRoundToCompletion(
  carry: FactoryCarry,
  seed: number,
  chooseSwap: (
    state: FactoryRoundBattleOrchestratorState,
  ) => Parameters<typeof chooseFactoryRoundSwap>[1] = () => ({ type: "decline" }),
  // "strong" (the known-reliable 664/678/527 trio) drives a win; "weak"
  // rents whatever the live generator pulls into slots 0/1/2 - unlike the
  // curated trio, arbitrary generated rentals are not tuned to win and are
  // used below to reach a scripted roundLost regardless of carried streak.
  partyStrength: "strong" | "weak" = "strong",
): FactoryRoundBattleOrchestratorState {
  const playerRecords = [record(664), record(678), record(527)] as const;
  const savedRentalRecords = [...playerRecords, record(1), record(2), record(3)] as const;
  let state = createFactoryRoundBattleOrchestrator({
    id: `factory-round-chaining-carrier-${seed}`,
    rngValue: seed,
    factoryWinStreak: carry.factoryWinStreak,
    playerTrainerId: carry.playerTrainerId,
    battleTowerLevel50WinStreak: 0,
    factorySymbolsCount: carry.factorySymbolsCount,
    facilityState: { rentsCount: carry.rentsCount },
    rentals: partyStrength === "strong"
      ? {
        type: "currentRecords",
        playerRentalRecords: playerRecords,
        savedRentalRecords,
      }
      : { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  });
  for (
    let budget = 0;
    budget < 1_000
      && state.round.rules.phase !== "roundComplete"
      && state.round.rules.phase !== "roundLost";
    budget += 1
  ) {
    if (state.battle !== null) {
      state = submitFactoryRoundPlayerDecision(state, choosePlayerDecision(state));
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
      state = chooseFactoryRoundSwap(state, chooseSwap(state));
      continue;
    }
    throw new Error(`unexpected carrier phase ${state.round.rules.phase}`);
  }
  return state;
}

export function stateAtDecidedRound(
  round: FactoryRoundBattleOrchestratorState,
  carry: FactoryCarry,
): EngineState {
  return {
    ...createInitialState(),
    factoryCarry: carry,
    factoryRoundBattleOrchestrator: round,
  };
}
