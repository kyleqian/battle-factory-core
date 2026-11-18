import { describe, expect, it } from "vitest";
import {
  advanceFactoryRoundPresentation, chooseFactoryRoundSwap, completeFactoryRoundPresentation, createFactoryRoundBattleOrchestrator,
  submitFactoryRoundPlayerDecision, type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";

// Fix 44 (docs/parity-mac/first-draft-counts-as-rent.md). The fresh-draft entry runs `factory_setswapped` before the rental screen
// (BattleFactoryPreBattleRoom scripts.inc:39-41), so the first win of a challenge pays the draft into factoryRentsCount
// (BattleFactoryBattleRoom scripts.inc:92-97, SetBattleFactoryData battle_factory.c:259-265), and each accepted swap is paid at the win after it.
// ROM (round replay, challenge 0, factoryRentsCount at each battle start): never swapping 0,1,1,1,1,1,1; swapping after every win 0,1,2,3,4,5,6.

const PLAYER_TRAINER_ID = 416049562;

function ack(state: FactoryRoundBattleOrchestratorState): FactoryRoundBattleOrchestratorState {
  const commandId = state.round.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a presentation command");
  return advanceFactoryRoundPresentation(completeFactoryRoundPresentation(state, { commandId }));
}

// The round, battle by battle: the rent count at the start of every battle, and the count after the round.
function rentsAtBattleStarts(seed: number, swapAfterEveryWin: boolean) {
  let state = createFactoryRoundBattleOrchestrator({
    id: `first-draft-rent-${seed}`, rngValue: seed, factoryWinStreak: 0, playerTrainerId: PLAYER_TRAINER_ID, battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 }, rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  });
  const atStart: number[] = [];
  for (let budget = 0; budget < 2_000 && state.round.rules.phase !== "roundComplete" && state.round.rules.phase !== "roundLost"; budget += 1) {
    if (state.battle !== null) {
      const boundary: any = state.battle.boundary;
      const decision = boundary.request.kind === "forced-switch"
        ? { kind: "switch", partyIndex: boundary.request.legalPartyIndexes[0] }
        : boundary.request.legalDecisions.find((d: any) => d.kind === "use-move");
      state = submitFactoryRoundPlayerDecision(state, decision);
      continue;
    }
    if (state.round.rules.phase === "presentingBattleStart") atStart.push(state.facilityState.rentsCount);
    if (state.round.rules.phase === "awaitingSwapDecision") {
      state = chooseFactoryRoundSwap(completeFactoryRoundPresentation(state, { commandId: state.round.presentation!.command.commandId }),
        swapAfterEveryWin ? { type: "accept", playerPartyIndex: 0, opponentPartyIndex: 1 } : { type: "decline" });
      continue;
    }
    state = ack(state);
  }
  return { atStart, end: state.facilityState.rentsCount, phase: state.round.rules.phase, battles: state.round.rules.battleIndex + 1 };
}

describe("fix 44: the first draft of a challenge counts as a rent", () => {
  it("a round starts with the draft's swap flag set", () => {
    const state = createFactoryRoundBattleOrchestrator({
      id: "first-draft-flag", rngValue: 1, factoryWinStreak: 0, playerTrainerId: PLAYER_TRAINER_ID, battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 }, rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
    });
    expect(state.performedRentalSwap).toBe(true);
  });

  it("the first win pays the draft and the win after each swap pays that swap (the ROM's counts)", () => {
    // A seed whose round reaches battle 3 with the first-legal-move player; the counts below are the ROM's pattern for the battles played.
    for (const seed of [17, 3, 9]) {
      const kept = rentsAtBattleStarts(seed, false);
      expect(kept.atStart.slice(0, kept.battles), `seed ${seed} never swapping`).toEqual([0, 1, 1, 1, 1, 1, 1].slice(0, kept.battles));
      const swapped = rentsAtBattleStarts(seed, true);
      expect(swapped.atStart.slice(0, swapped.battles), `seed ${seed} swapping`).toEqual([0, 1, 2, 3, 4, 5, 6].slice(0, swapped.battles));
      if (kept.phase === "roundComplete") expect(kept.end).toBe(1);
      if (swapped.phase === "roundComplete") expect(swapped.end).toBe(7);
    }
  });
});
